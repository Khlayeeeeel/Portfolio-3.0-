import { NextRequest, NextResponse } from "next/server";
import { storeToken } from "@/lib/ctf-tokens";
import { issueUnlockProof } from "@/lib/ctf-proof";
import { attemptLimit, checkRateLimit, clientIp, RATE_LIMIT } from "@/lib/rate-limit";

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

function missingConfig(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Server misconfiguration." },
    { status: 500 }
  );
}

function tooManyAttempts(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Too many attempts. Try again in a minute." },
    { status: 429, headers: { "Retry-After": String(RATE_LIMIT.windowMs / 1000) } }
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
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { challenge, answer, fields } = body;
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

      // Gallery token: one fetch each for evidence_01 and evidence_02.
      const token = crypto.randomUUID();
      storeToken(token, [1, 2]);
      return NextResponse.json({ ok: true, token });
    }

    // ---- final_photo -------------------------------------------------------
    case "final_photo": {
      const expected = process.env.CTF_TECH_ASSISTANT;
      if (!expected) return missingConfig();
      if (typeof answer !== "string") {
        return NextResponse.json(
          { ok: false, error: "Missing answer." },
          { status: 400 }
        );
      }
      if (!matches(answer, expected)) {
        return NextResponse.json({ ok: false });
      }

      // Single-use token for evidence_03, plus a server-signed proof that can
      // mint a replacement token after a refresh consumed the original one.
      const token = crypto.randomUUID();
      storeToken(token, [3]);
      return NextResponse.json({ ok: true, token, proof: issueUnlockProof("3") });
    }

    // ---- unknown -----------------------------------------------------------
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown challenge." },
        { status: 400 }
      );
  }
}
