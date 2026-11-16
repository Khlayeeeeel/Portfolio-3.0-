// Thin client wrapper around POST /api/ctf/verify.

export interface VerifyResult {
  ok: boolean;
  token?: string;
  /** Opaque server-signed proof, only issued by final_photo. */
  proof?: string;
  field?: string;
  error?: string;
  rateLimited?: boolean;
}

export interface ThreeFieldPayload {
  date: string;
  time: string;
  location: string;
}

export async function verifyChallenge(payload: {
  challenge: string;
  answer?: string;
  fields?: ThreeFieldPayload;
}): Promise<VerifyResult> {
  const res = await fetch("/api/ctf/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as VerifyResult;

  if (res.status === 429) {
    return { ok: false, rateLimited: true, error: data.error };
  }

  return data;
}

/** Exchange a final_photo unlock proof for a fresh single-use evidence token. */
export async function redeemUnlockProof(proof: string): Promise<VerifyResult> {
  const res = await fetch("/api/ctf/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proof }),
  });

  const data = (await res.json().catch(() => ({}))) as VerifyResult;
  if (res.status === 429) return { ok: false, rateLimited: true, error: data.error };
  return data;
}
