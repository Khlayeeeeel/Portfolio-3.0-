"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, ImageOff, AlertTriangle } from "lucide-react";
import { useCTFStore } from "@/stores/ctfStore";
import { useFileSystemStore } from "@/stores/fileSystemStore";
import { FINAL_PHOTO_CLUE } from "@/lib/ctf-content";
import { applyChallengeSuccess } from "@/lib/ctf-actions";
import { redeemUnlockProof } from "@/lib/ctf-client";
import { getCachedImage } from "@/lib/evidence-cache";
import { loadEvidenceImage, saveEvidenceImage } from "@/lib/evidence-store";
import PasswordModal from "@/components/ctf/PasswordModal";

const EVIDENCE = [
    { id: 1, name: "evidence_01.jpg", caption: "Recovered from .evidence — heavily degraded." },
    { id: 2, name: "evidence_02.jpg", caption: "Recovered from .evidence — partially degraded." },
    { id: 3, name: "evidence_03.jpg", caption: "Sealed. Requires the final identification." },
] as const;

const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(blob);
    });

export default function Photos() {
    const stage = useCTFStore((s) => s.stage);
    const completed = useCTFStore((s) => s.completed);
    const evidence3Unlocked = useCTFStore((s) => s.evidence3Unlocked);
    const evidenceToken = useCTFStore((s) => s.evidenceToken);
    const galleryToken = useCTFStore((s) => s.galleryToken);
    const evidence3Proof = useCTFStore((s) => s.evidence3Proof);
    const evidenceImages = useCTFStore((s) => s.evidenceImages);
    const setEvidenceImage = useCTFStore((s) => s.setEvidenceImage);
    const setEvidence3Proof = useCTFStore((s) => s.setEvidence3Proof);

    const items = useFileSystemStore((s) => s.items);

    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState("");
    const [hydrated, setHydrated] = useState(false);
    const restoringFinal = useRef(false);

    const imageFor = (id: number) => evidenceImages[String(id)] ?? getCachedImage(id);
    const finalImage = imageFor(3);

    const fetchImage = useCallback(
        async (id: number, tokenOverride?: string) => {
            let token = tokenOverride ?? (id === 3 ? evidenceToken : galleryToken);
            if (!token) {
                setError("Evidence token expired. Re-open the vault to get a new one.");
                return;
            }

            try {
                const urlFor = (value: string) =>
                    `/api/ctf/evidence/${id}?token=${encodeURIComponent(value)}`;
                let res = await fetch(urlFor(token));

                // A refresh can consume the original token before a large image is
                // cached. Exchange the server-signed proof for a fresh token once.
                if (!res.ok && id === 3 && evidence3Proof) {
                    const redeemed = await redeemUnlockProof(evidence3Proof);
                    if (redeemed.ok && redeemed.token) {
                        token = redeemed.token;
                        res = await fetch(urlFor(token));
                    }
                }

                if (!res.ok) {
                    setError("Evidence token expired or already used.");
                    return;
                }

                const dataUrl = await blobToDataUrl(await res.blob());
                setEvidenceImage(String(id), dataUrl);
                void saveEvidenceImage(id, dataUrl);
                setError("");
            } catch {
                setError("Network error while fetching the evidence.");
            }
        },
        [evidenceToken, galleryToken, evidence3Proof, setEvidenceImage]
    );

    // Restore any image that only ever lived in IndexedDB (large files).
    useEffect(() => {
        if (stage < 6) return;
        let cancelled = false;
        (async () => {
            for (const id of [1, 2, 3]) {
                if (imageFor(id)) continue;
                const stored = await loadEvidenceImage(id);
                if (!cancelled && stored) setEvidenceImage(String(id), stored);
            }
            if (!cancelled) setHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    // After an F5, silently re-mint the final token from the unlock proof.
    useEffect(() => {
        if (!hydrated) return;
        if (!evidence3Unlocked && !completed) return;
        if (imageFor(3) || restoringFinal.current) return;
        restoringFinal.current = true;
        void fetchImage(3).finally(() => {
            restoringFinal.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, evidence3Unlocked, completed, finalImage, evidence3Proof, fetchImage]);

    // Stage 6: the two recovered frames are pulled once through their token,
    // but only after cached images had a chance to load (token may be burned).
    useEffect(() => {
        if (!hydrated || stage < 6) return;
        if (!galleryToken) return;
        if (imageFor(1) && imageFor(2)) return;
        void fetchImage(1);
        void fetchImage(2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, stage, galleryToken]);

    if (stage < 6) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <ImageOff size={56} strokeWidth={1} className="opacity-40" />
                <p className="text-sm font-medium">No evidence recovered yet.</p>
                <p className="max-w-xs text-center text-xs">
                    The investigation has not produced any photo at this stage.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-44 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black/50">
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Library
                </div>
                <div className="mb-6 space-y-1">
                    {["Evidence", "Moments", "Collections", "Years"].map((item) => (
                        <div
                            key={item}
                            className={`cursor-default rounded-md px-2 py-1.5 text-sm ${
                                item === "Evidence" ? "bg-blue-500 text-white" : "hover:bg-black/10 dark:hover:bg-white/10"
                            }`}
                        >
                            {item}
                        </div>
                    ))}
                </div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Albums
                </div>
                <div className="space-y-1">
                    {[["Recovered", 2], [".evidence", 3]].map(([label, count]) => (
                        <div
                            key={String(label)}
                            className="flex cursor-default items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10"
                        >
                            {label}
                            <span className="text-xs text-gray-400">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4 dark:border-white/10 dark:bg-black/20">
                    <div className="flex rounded-md bg-black/5 p-1 dark:bg-white/5">
                        <button className="rounded bg-white px-3 py-1 text-xs font-medium shadow-sm dark:bg-black">
                            Evidence
                        </button>
                        <button className="px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5">
                            All Photos
                        </button>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-gray-400">
                        {completed ? "case closed" : "case open"}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"
                            >
                                <AlertTriangle size={14} /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {completed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center"
                        >
                            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-600/80 dark:text-emerald-400/80">
                                victory
                            </p>
                            <h2 className="mt-2 font-mono text-xl font-bold tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                                TAKE ME TO THE PRESIDENT
                            </h2>
                            <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/70">
                                The insider is identified. Download the last frame and show it to the president.
                            </p>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                        {EVIDENCE.map((photo) => {
                            const isFinal = photo.id === 3;
                            const unlocked = !isFinal || evidence3Unlocked;
                            const dataUrl = imageFor(photo.id);

                            return (
                                <div key={photo.id} className="flex flex-col gap-2">
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-zinc-800 shadow-sm dark:border-white/10">
                                        {unlocked && dataUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={dataUrl}
                                                alt={photo.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : unlocked ? (
                                            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                                                <span className="text-[11px] text-zinc-400">
                                                    Decrypting evidence...
                                                </span>
                                                <button
                                                    onClick={() => void fetchImage(photo.id)}
                                                    className="text-[11px] text-blue-400 underline-offset-2 hover:underline"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setUnlocking(true)}
                                                className="group flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
                                            >
                                                <Lock size={32} strokeWidth={1.5} />
                                                <span className="text-[11px] uppercase tracking-widest">
                                                    locked
                                                </span>
                                                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">
                                                    click to identify
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-medium">{photo.name}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-zinc-500">
                                                {photo.caption}
                                            </p>
                                        </div>
                                        {isFinal && unlocked && finalImage && (
                                            <a
                                                href={finalImage}
                                                download={`evidence_03.${finalImage.startsWith("data:image/png") ? "png" : "jpg"}`}
                                                className="flex flex-shrink-0 items-center gap-1 rounded-md bg-blue-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-600"
                                            >
                                                <Download size={12} /> Download
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {!evidence3Unlocked && (
                        <p className="mt-8 font-mono text-[11px] leading-relaxed text-gray-500 dark:text-zinc-500">
                            The last frame is sealed with the identity of the insider. Everything you found
                            so far is a step towards that name.
                        </p>
                    )}
                </div>
            </div>

            {unlocking && (
                <PasswordModal
                    isOpen
                    challenge="final_photo"
                    fileName="evidence_03.jpg"
                    clue={FINAL_PHOTO_CLUE}
                    onSuccess={(data) => {
                        const item = items["evidence-03"];
                        if (item) applyChallengeSuccess(item, data);
                        if (data.proof) setEvidence3Proof(data.proof);
                        setUnlocking(false);
                        restoringFinal.current = true;
                        void fetchImage(3, data.token).finally(() => {
                            restoringFinal.current = false;
                        });
                    }}
                    onClose={() => setUnlocking(false)}
                />
            )}
        </div>
    );
}
