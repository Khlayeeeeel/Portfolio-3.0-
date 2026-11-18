import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { storeToken } from "@/lib/ctf-tokens";
import { issueUnlockProof, verifyUnlockProof } from "@/lib/ctf-proof";
import {
    attemptLimit,
    checkMemberRateLimit,
    checkRateLimit,
    clearMemberRateLimit,
    clientIp,
    RATE_LIMIT,
} from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/** Trim, lowercase, strip accents */
function normalise(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** French month names -> zero-padded month number */
const FR_MONTHS: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
};

/**
 * Accepts: DD/MM, DD-MM, DD/MM/YYYY, "15 octobre" (French month name).
 * Returns DD/MM or null if unrecognised.
 */
function normaliseDate(raw: string): string | null {
  const s = normalise(raw);

  // "15 octobre" or "15 octobre 2024"
  const textMatch = s.match(/^(\d{1,2})\s+([a-z]+)(\s+\d{4})?$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const month = FR_MONTHS[textMatch[2]];
    if (!month) return null;
    return `${day}/${month}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const longMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}$/);
  if (longMatch) {
    return `${longMatch[1].padStart(2, "0")}/${longMatch[2].padStart(2, "0")}`;
  }

  // DD/MM or DD-MM
  const shortMatch = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (shortMatch) {
    return `${shortMatch[1].padStart(2, "0")}/${shortMatch[2].padStart(2, "0")}`;
  }

  return null;
}

/** Compares a submitted answer with an env value, both normalised. */
function matches(answer: unknown, expected: string | undefined): boolean {
  if (typeof answer !== "string") return false;
  if (!expected) return false;
  return normalise(answer) === normalise(expected);
}

/**
 * Member name: lowercase, no diacritics, trimmed, inner whitespace collapsed.
 * The image-based challenges keep `normalise` (no whitespace collapsing).
 */
function normaliseName(raw: string): string {
  return normalise(raw).replace(/\s+/g, " ");
}

const digestName = (raw: string) => createHash("sha256").update(normaliseName(raw)).digest();

/** Constant-time comparison over fixed-length digests, with no plaintext fallback. */
function matchesName(answer: unknown, variants: string[]): boolean {
  if (typeof answer !== "string") return false;
  const submitted = digestName(answer);
  return variants.some((variant) => {
    const expected = digestName(variant);
    return submitted.length === expected.length && timingSafeEqual(submitted, expected);
  });
}

function missingConfig(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Server misconfiguration." },
    { status: 500 }
  );
}

function tooManyAttempts(retryAfter: number = RATE_LIMIT.windowMs / 1000): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Too many attempts. Try again in a minute." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

// ---------------------------------------------------------------------------
// POST /api/ctf/verify
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  let body: {
    challenge: string;
    answer?: string;
    fields?: { date: string; time: string; location: string };
    /** Server-signed proof issued by final_photo (never an answer or hash). */
    proof?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // `null` (and arrays) are valid JSON but not valid request objects: without
  // this guard the destructuring below throws and Next returns a 500.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { challenge, answer, fields, proof } = body;
  const maxAttempts = attemptLimit();

  // Per challenge per client. three_fields is handled inside its own case so
  // each of the three fields gets an independent budget.
  if (typeof challenge === "string" && challenge !== "three_fields") {
    if (!checkRateLimit(`${ip}:${challenge}`, maxAttempts)) return tooManyAttempts();
  }

  if (!challenge || typeof challenge !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing challenge." },
      { status: 400 }
    );
  }

  switch (challenge) {
    // ---- login (founding year) ---------------------------------------------
    case "login": {
      const expected = process.env.CTF_LOGIN;
      if (!expected) return missingConfig();
      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: matches(answer, expected) });
    }

    // ---- classified_file ---------------------------------------------------
    case "classified_file": {
      const expected = process.env.CTF_CLASSIFIED;
      if (!expected) return missingConfig();
      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: matches(answer, expected) });
    }

    // ---- confidential_data -------------------------------------------------
    case "confidential_data": {
      const expected = process.env.CTF_CONFIDENTIAL;
      if (!expected) return missingConfig();
      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: matches(answer, expected) });
    }

    // ---- three_fields (vault) ----------------------------------------------
    case "three_fields": {
      if (!fields || typeof fields !== "object") {
        return NextResponse.json(
          { ok: false, error: "Missing fields object." },
          { status: 400 }
        );
      }

      const { date: rawDate, time: rawTime, location: rawLocation } = fields;

      const expectedDate = process.env.CTF_DATE;
      const expectedTime = process.env.CTF_TIME;
      const expectedLocation = process.env.CTF_LOCATION;
      if (!expectedDate || !expectedTime || !expectedLocation) {
        return missingConfig();
      }

      // Every submitted field is checked, but each wrong field only consumes
      // its own rate-limit budget so a typo in one field cannot lock the others.
      const submittedDate = normaliseDate(rawDate ?? "");
      const expectedDateNorm = normaliseDate(expectedDate);
      let failedField: "date" | "time" | "location" | null = null;

      if (!submittedDate || !expectedDateNorm || submittedDate !== expectedDateNorm) {
        failedField = "date";
      } else if (!normalise(rawTime ?? "") || normalise(rawTime ?? "") !== normalise(expectedTime)) {
        failedField = "time";
      } else {
        const variants = expectedLocation.split("|").map(normalise);
        const normLocation = normalise(rawLocation ?? "");
        if (!normLocation || !variants.includes(normLocation)) failedField = "location";
      }

      if (failedField) {
        if (!checkRateLimit(`${ip}:three_fields:${failedField}`, maxAttempts)) return tooManyAttempts();
        return NextResponse.json({ ok: false, field: failedField });
      }

      // Gallery token: the recovered hint frame (internal id 1, shown as
      // hints.jpg). The proof lets the client mint a new one if a refresh
      // burns the token before the image made it to IndexedDB.
      const token = crypto.randomUUID();
      storeToken(token, [1]);
      return NextResponse.json({ ok: true, token, galleryProof: issueUnlockProof("gallery") });
    }

    // ---- final_photo -------------------------------------------------------
    case "final_photo": {
      // Comma-separated accepted spellings (e.g. first name, full name). The
      // answer itself lives only in the server environment.
      const configured = process.env.CTF_MEMBER_NAME;
      if (!configured) return missingConfig();
      const variants = configured.split(",").map((v) => v.trim()).filter(Boolean);
      if (variants.length === 0) return missingConfig();
      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }

      // Dedicated bucket with escalating cooldown, independent from the other
      // challenges so normal play is never refused.
      const limit = checkMemberRateLimit(ip);
      if (!limit.allowed) return tooManyAttempts(limit.retryAfter);

      if (!matchesName(answer, variants)) {
        return NextResponse.json({ ok: false });
      }
      clearMemberRateLimit(ip);

      // Single-use token for evidence_03 (the sharp photo), plus a server-signed
      // proof that can mint a replacement after a refresh consumed the token.
      const token = crypto.randomUUID();
      storeToken(token, [3]);
      return NextResponse.json({ ok: true, token, proof: issueUnlockProof("3") });
    }

    // ---- final_flag (stage 8) ----------------------------------------------
    // Only reachable after final_photo: the request must carry the opaque,
    // server-signed proof issued by that challenge. No client-side flag or
    // stage value is ever trusted. Uses the same normalisation and rate limit
    // as the other single-answer challenges.
    case "final_flag": {
      const expected = process.env.CTF_FINAL;
      if (!expected) return missingConfig();

      if (!verifyUnlockProof(proof, "3")) {
        return NextResponse.json(
          { ok: false, error: "Final photo verification required." },
          { status: 403 }
        );
      }

      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: matches(answer, expected) });
    }

    // ---- unknown -----------------------------------------------------------
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown challenge." },
        { status: 400 }
      );
  }
}
