"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface HackerPopupContent {
    id: string;
    title: string;
    lines: string[];
    /** Revealed a beat later, e.g. "Connection terminated...". */
    footer?: string;
}

interface HackerPopupProps {
    content: HackerPopupContent;
    onClose: () => void;
    /** "toast" keeps the milestone visible without blocking the Vault window. */
    variant?: "modal" | "toast";
}

export default function HackerPopup({ content, onClose, variant = "modal" }: HackerPopupProps) {
    const [showFooter, setShowFooter] = useState(!content.footer);

    useEffect(() => {
        if (!content.footer) return;
        setShowFooter(false);
        const timer = setTimeout(() => setShowFooter(true), 1800);
        return () => clearTimeout(timer);
    }, [content.footer]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
                variant === "toast"
                    ? "pointer-events-none fixed inset-0 z-[9990] flex items-end justify-end p-4 pb-24"
                    : "fixed inset-0 z-[10002] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            }
        >
            <motion.div
                initial={{ scale: 0.85, rotateX: -12, opacity: 0 }}
                animate={{ scale: 1, rotateX: 0, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className={`relative w-full ${variant === "toast" ? "pointer-events-auto max-w-sm" : "max-w-md"} overflow-hidden rounded-xl border border-red-600/60 bg-[#140607] shadow-[0_0_60px_rgba(220,38,38,0.35)]`}
            >
                <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />

                <div className="relative flex items-center gap-2 border-b border-red-900/60 bg-[#1c0708] px-4 py-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                    <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.3em] text-red-400/70">
                        secure channel
                    </p>
                </div>

                <div className="relative px-5 py-6 font-mono">
                    <h3 className="mb-4 text-sm font-bold tracking-widest text-red-400 glitch-text">
                        {content.title}
                    </h3>

                    <div className="space-y-3">
                        {content.lines.map((line, index) => (
                            <motion.p
                                key={line}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + index * 0.35 }}
                                className="text-[13px] leading-relaxed text-red-100/90"
                            >
                                <span className="mr-2 text-red-500">&gt;</span>
                                {line}
                            </motion.p>
                        ))}
                    </div>

                    <AnimatePresence>
                        {showFooter && content.footer && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0.4, 1] }}
                                transition={{ duration: 0.8 }}
                                className="mt-5 border-t border-red-900/60 pt-3 text-[13px] font-bold tracking-widest text-red-500"
                            >
                                {content.footer}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-6 w-full rounded border border-red-700/70 bg-red-950/60 py-2 text-xs font-semibold uppercase tracking-widest text-red-300 transition-colors hover:bg-red-800/60 hover:text-white"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
