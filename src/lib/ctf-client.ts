// Thin client wrapper around POST /api/ctf/verify.

export interface VerifyResult {
  ok: boolean;
  token?: string;
  /** Opaque server-signed proof, only issued by final_photo. */
  proof?: string;
  /** Opaque proof issued by the vault for the hint frame (id 1). */
  galleryProof?: string;
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
  /** Opaque server-signed proof from final_photo, required by final_flag. */
  proof?: string;
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

/** Exchange an unlock proof for a fresh single-use evidence token. */
export async function redeemUnlockProof(
  proof: string,
  scope: "3" | "gallery" = "3"
): Promise<VerifyResult> {
  const res = await fetch("/api/ctf/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proof, scope }),
  });

  const data = (await res.json().catch(() => ({}))) as VerifyResult;
  if (res.status === 429) return { ok: false, rateLimited: true, error: data.error };
  return data;
}
