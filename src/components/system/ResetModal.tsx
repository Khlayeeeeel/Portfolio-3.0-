"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ResetModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ResetModal({ isOpen, onConfirm, onCancel }: ResetModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="reset-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onKeyDown={(e) => e.key === "Escape" && onCancel()}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 12 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className="w-full max-w-sm rounded-xl border border-white/15 bg-[#1f1f22]/95 p-6 text-center shadow-2xl"
                    >
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-2xl">
                            ⚠️
                        </div>
                        <h2 className="mb-2 text-sm font-semibold text-white">Reset CTF?</h2>
                        <p className="mb-6 text-xs leading-relaxed text-white/60">
                            This clears all progress, unlocks, evidence and the virtual filesystem,
                            then locks the machine again.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 rounded-md bg-white/10 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                autoFocus
                                className="flex-1 rounded-md bg-red-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                            >
                                Reset
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
