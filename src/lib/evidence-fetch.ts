// Single download path for evidence images.
//
// The evidence route serves an id only once per token, so every surface has to
// share the same recovery logic: try the stored token, and when it is already
// spent (a refresh, a second caller) exchange the server-signed proof for a
// fresh one instead of leaving the player stuck.
import { redeemUnlockProof } from "@/lib/ctf-client";
import { useCTFStore } from "@/stores/ctfStore";

export interface EvidenceFetchResult {
    dataUrl?: string;
    error?: string;
}

export const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(blob);
    });

/**
 * Downloads evidence `id` with the single-use token held by the store, minting
 * a replacement from the unlock proof when that token was already consumed.
 * Nothing is cached here: the caller decides where the frame is persisted.
 */
export async function fetchEvidenceImage(
    id: number,
    tokenOverride?: string
): Promise<EvidenceFetchResult> {
    const store = useCTFStore.getState();
    const scope = id === 3 ? "3" : "gallery";
    const proof = id === 3 ? store.evidence3Proof : store.galleryProof;
    let token = tokenOverride ?? (id === 3 ? store.evidenceToken : store.galleryToken);

    const urlFor = (value: string) =>
        `/api/ctf/evidence/${id}?token=${encodeURIComponent(value)}`;

    try {
        let res = token ? await fetch(urlFor(token)) : null;

        if ((!res || !res.ok) && proof) {
            const redeemed = await redeemUnlockProof(proof, scope);
            if (redeemed.ok && redeemed.token) {
                token = redeemed.token;
                if (id === 3) useCTFStore.getState().setEvidenceToken(token);
                else useCTFStore.getState().setGalleryToken(token);
                res = await fetch(urlFor(token));
            }
        }

        if (!res?.ok) {
            return {
                error:
                    res?.status === 403
                        ? "The evidence token was already used. Re-open the photo to request a new one."
                        : "The evidence could not be retrieved.",
            };
        }

        return { dataUrl: await blobToDataUrl(await res.blob()) };
    } catch {
        return { error: "Network error while fetching the evidence." };
    }
}
