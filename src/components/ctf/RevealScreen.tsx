"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Download } from "lucide-react";
import { useCTFStore } from "@/stores/ctfStore";
import { useWindowStore } from "@/stores/windowStore";
import { fetchEvidenceImage } from "@/lib/evidence-fetch";
import { loadEvidenceImage, saveEvidenceImage } from "@/lib/evidence-store";
import { getCachedImage } from "@/lib/evidence-cache";

const EVIDENCE_ID = 3;

/**
 * Result of the member-identification challenge: the sharp frame, revealed
 * between the submission and the final flag.
 *
 * Rendered through a portal on document.body: the reveal must not be clipped or
 * positioned by the react-rnd transform of the window that opened it.
 *
 * The frame is downloaded here and written to IndexedDB *before* it is shown,
 * because the evidence token is single use — a refresh must never need it again.
 */
export default function RevealScreen() {
    const revealed = useCTFStore((s) => s.revealed);
    const revealOpen = useCTFStore((s) => s.revealOpen);
    const won = useCTFStore((s) => s.won);
    const setEvidenceImage = useCTFStore((s) => s.setEvidenceImage);
    const closeReveal = useCTFStore((s) => s.closeReveal);
    const markRevealSeen = useCTFStore((s) => s.markRevealSeen);
    const openWindow = useWindowStore((s) => s.openWindow);

    const [mounted, setMounted] = useState(false);
    const [image, setImage] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const busy = useRef(false);

    useEffect(() => setMounted(true), []);

    /** Memory first, IndexedDB second, token third — then persist and show. */
    const load = useCallback(async () => {
        if (busy.current) return;
        busy.current = true;
        setLoading(true);
        setError("");

        try {
            const store = useCTFStore.getState();
            const cached =
                store.evidenceImages[String(EVIDENCE_ID)] ?? getCachedImage(EVIDENCE_ID);
            if (cached) {
                setImage(cached);
                return;
            }

            // Survives F5 even when the data URL was too big for localStorage.
            const stored = await loadEvidenceImage(EVIDENCE_ID);
            if (stored) {
                setEvidenceImage(String(EVIDENCE_ID), stored);
                setImage(stored);
                return;
            }

            const result = await fetchEvidenceImage(EVIDENCE_ID);
            if (!result.dataUrl) {
                setError(result.error ?? "The evidence could not be retrieved.");
                return;
            }

            // Persist before rendering: the token is spent and cannot be reused.
            await saveEvidenceImage(EVIDENCE_ID, result.dataUrl);
            setEvidenceImage(String(EVIDENCE_ID), result.dataUrl);
            setImage(result.dataUrl);
        } finally {
            setLoading(false);
            busy.current = false;
        }
    }, [setEvidenceImage]);

    useEffect(() => {
        if (!revealOpen || !revealed) return;
        void load();
    }, [revealOpen, revealed, load]);

    // Continue is never blocked on the image: the final flag is gated by the
    // server-side proof, so a storage hiccup must not dead-end the run.
    const continueToFinalAccess = () => {
        markRevealSeen();
        openWindow("final-access", "Final Access", "lock");
    };

    if (!mounted || !revealOpen || !revealed || won) return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[10006] flex items-center justify-center overflow-y-auto bg-black/95 p-6 font-mono backdrop-blur-md"
        >
            <div className="w-full max-w-2xl">
                <p className="mb-3 text-center text-[10px] uppercase tracking-[0.5em] text-green-500/60">
                    igc internal system // evidence unsealed
                </p>

                <div className="overflow-hidden rounded-xl border border-green-500/30 bg-black/70 shadow-[0_0_60px_rgba(34,197,94,0.15)]">
                    <div className="relative flex min-h-[240px] items-center justify-center bg-black">
                        {image ? (
                            <motion.img
                                key="revealed-frame"
                                src={image}
                                alt="Unsealed evidence — identified IGC member"
                                initial={{ filter: "blur(26px)", scale: 1.06, opacity: 0.15 }}
                                animate={{ filter: "blur(0px)", scale: 1, opacity: 1 }}
                                transition={{ duration: 1.6, ease: "easeOut" }}
                                className="max-h-[52vh] w-full object-contain"
                            />
                        ) : loading ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
                                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                                <span className="text-[11px] uppercase tracking-widest">
                                    Unsealing evidence…
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <div className="border-t border-green-500/20 px-5 py-4">
                        {error && (
                            <p className="mb-3 flex items-start gap-2 text-[11px] leading-relaxed text-amber-400">
                                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {error}
                                <button
                                    type="button"
                                    onClick={() => void load()}
                                    className="ml-1 text-blue-400 underline-offset-2 hover:underline"
                                >
                                    Retry
                                </button>
                            </p>
                        )}

                        <motion.h2
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.5 }}
                            className="text-lg font-bold tracking-[0.2em] text-green-400"
                        >
                            IDENTITY CONFIRMED.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2, duration: 0.6 }}
                            className="mt-2 max-w-lg text-xs leading-relaxed text-zinc-400"
                        >
                            The clean frame shows the person behind the breach. Take it to the
                            president to receive the final code.
                        </motion.p>

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={continueToFinalAccess}
                                className="flex items-center gap-2 rounded bg-green-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600"
                            >
                                Continue <ArrowRight size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => closeReveal()}
                                className="rounded border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
                            >
                                Back to desktop
                            </button>
                            {image && (
                                <a
                                    href={image}
                                    download={`evidence_03.${
                                        image.startsWith("data:image/png") ? "png" : "jpg"
                                    }`}
                                    className="ml-auto flex items-center gap-1 rounded bg-blue-500 px-3 py-2 text-[11px] font-medium text-white hover:bg-blue-600"
                                >
                                    <Download size={12} /> Download
                                </a>
                            )}
                        </div>

                        {!image && !loading && (
                            <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
                                The photograph could not be displayed, but the case is solved: use
                                Continue and re-open it from the Dock or Photos later.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>,
        document.body
    );
}
