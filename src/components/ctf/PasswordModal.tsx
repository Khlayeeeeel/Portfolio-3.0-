"use client";

import { useState } from "react";
import { verifyChallenge, type VerifyResult } from "@/lib/ctf-client";

interface PasswordModalProps {
    isOpen: boolean;
    challenge: string;
    fileName: string;
    /** Optional in-game clue shown above the field. */
    clue?: string;
    onSuccess: (data: VerifyResult) => void;
    onClose: () => void;
}

export default function PasswordModal({
    isOpen,
    challenge,
    fileName,
    clue,
    onSuccess,
    onClose,
}: PasswordModalProps) {
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    if (!isOpen) return null;

    const fail = (message: string) => {
        setError(message);
        setAnswer("");
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim() || loading) return;

        setLoading(true);
        setError("");

        try {
            const data = await verifyChallenge({ challenge, answer: answer.trim() });
            if (data.ok) {
                onSuccess(data);
            } else if (data.rateLimited) {
                fail("Too many attempts. Wait a minute.");
            } else {
                fail("Access denied.");
            }
        } catch {
            fail("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
            <div
                className={`w-full max-w-sm rounded-lg border border-green-500/40 bg-zinc-900 p-6 font-mono shadow-2xl transition-transform ${
                    shake ? "animate-shake" : ""
                }`}
            >
                <h2 className="mb-1 text-sm font-bold text-green-400">🔒 Locked File</h2>
                <p className="mb-4 text-xs text-zinc-400">
                    <span className="text-green-300">{fileName}</span> requires a password to unlock.
                </p>

                {clue && (
                    <p className="mb-4 border-l-2 border-green-500/40 pl-3 text-[11px] italic leading-relaxed text-zinc-400">
                        {clue}
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Enter password..."
                        className="mb-3 w-full rounded border border-green-500/30 bg-black px-3 py-2 text-sm text-green-300 outline-none placeholder:text-zinc-600 focus:border-green-500"
                        autoFocus
                    />
                    {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded bg-green-700 py-2 text-sm text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                        >
                            {loading ? "Verifying..." : "Unlock"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded bg-zinc-700 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-600"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
