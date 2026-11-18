// Server-only: opaque, short-lived proof that final_photo was solved.
//
// The proof is an HMAC over its own expiry and a nonce. It contains no answer
// and no hash of an answer; the client only ever sees the signed token. A proof
// can be exchanged at /api/ctf/proof for a fresh single-use evidence token,
// which is what makes "Retry" work again after F5 consumed the original token.
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SCOPE = "3";
/** Opaque scopes issued by the server; never derived from client input. */
export type ProofScope = "3" | "gallery";
const VALID_SCOPES: readonly ProofScope[] = ["3", "gallery"];
export const PROOF_TTL_MS = 24 * 60 * 60_000;

// A dedicated secret is recommended. Falling back to the server-only challenge
// secret keeps existing deployments working; the last resort is per-process.
const SECRET =
    process.env.CTF_PROOF_SECRET ??
    process.env.CTF_TECH_ASSISTANT ??
    randomBytes(32).toString("hex");

function sign(payload: string): string {
    return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/** Issues a proof for an allowlisted evidence scope (default: evidence_03). */
export function issueUnlockProof(scope: ProofScope = SCOPE): string {
    const payload = `v1.${scope}.${Date.now() + PROOF_TTL_MS}.${randomBytes(12).toString("base64url")}`;
    return `${payload}.${sign(payload)}`;
}

/** Verifies signature, scope and expiry. Never trusts client-supplied scope. */
export function verifyUnlockProof(proof: unknown, scope: ProofScope = SCOPE): boolean {
    if (typeof proof !== "string" || !VALID_SCOPES.includes(scope)) return false;
    const parts = proof.split(".");
    if (parts.length !== 5) return false;
    const [version, proofScope, rawExpiry, nonce, signature] = parts;
    if (version !== "v1" || proofScope !== scope || !nonce) return false;

    const expiresAt = Number(rawExpiry);
    if (!Number.isSafeInteger(expiresAt) || Date.now() > expiresAt) return false;

    const expected = Buffer.from(sign(`v1.${proofScope}.${rawExpiry}.${nonce}`));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(expected, supplied);
}
