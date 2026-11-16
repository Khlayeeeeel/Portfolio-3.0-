"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VAULT_CLUES } from "@/lib/ctf-content";
import { verifyChallenge } from "@/lib/ctf-client";
import { useCTFStore } from "@/stores/ctfStore";
import { ensureLastActivityLog } from "@/lib/ctf-actions";

const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(blob);
    });

/**
 * The gallery token is single use, so both frames are pulled (and persisted)
 * right away: a later reload must not find an evidence token that is already spent.
 */
async function prefetchGallery(token: string): Promise<void> {
    for (const id of [1, 2]) {
        try {
            const res = await fetch(`/api/ctf/evidence/${id}?token=${encodeURIComponent(token)}`);
            if (!res.ok) continue;
            const dataUrl = await blobToDataUrl(await res.blob());
            useCTFStore.getState().setEvidenceImage(String(id), dataUrl);
        } catch {
            /* the Photos app will retry with the same token if it can */
        }
    }
}

const FIELDS = [
  { key: "date", label: "Date", placeholder: "DD/MM", clue: VAULT_CLUES.date },
  { key: "time", label: "Time", placeholder: "HH:MM", clue: VAULT_CLUES.time },
  { key: "location", label: "Location", placeholder: "Room name", clue: VAULT_CLUES.location },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function PasswordVault() {
    const [values, setValues] = useState<Record<FieldKey, string>>({
        date: "",
        time: "",
        location: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [solved, setSolved] = useState(false);

    const setGalleryToken = useCTFStore((s) => s.setGalleryToken);
    const advanceStage = useCTFStore((s) => s.advanceStage);
    const stage = useCTFStore((s) => s.stage);

    const update = (key: FieldKey, value: string) =>
        setValues((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!values.date.trim() || !values.time.trim() || !values.location.trim()) {
            setError("All three fields are required.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await verifyChallenge({
                challenge: "three_fields",
                fields: values,
            });

            if (data.ok) {
                // The log is the reward: it must exist before it gets revealed.
                ensureLastActivityLog();
                if (data.token) {
                    setGalleryToken(data.token);
                    void prefetchGallery(data.token);
                }
                advanceStage(5);
                setSolved(true);
            } else {
                setError(data.rateLimited ? "Too many attempts. Wait a minute." : "Access denied");
                setShake(true);
                setTimeout(() => setShake(false), 500);
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (solved) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-black/90 p-8 font-mono text-green-400">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="text-center"
                >
                    <p className="mb-2 text-xs uppercase tracking-[0.4em] text-green-500/70">vault</p>
                    <h2 className="text-2xl font-bold glitch-text">VAULT UNLOCKED</h2>
                    <p className="mt-4 max-w-sm text-xs leading-relaxed text-green-300/80">
                        A new entry was written to <span className="text-white">Logs/last_activity.log</span>.
                        Someone forgot to erase their traces.
                    </p>
                    <p className="mt-6 text-[11px] text-green-500/60">
                        Current stage: {stage} — check the Logs folder.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#0b0b0d] p-6 font-mono text-zinc-200">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-lg">
                    🔐
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white">Password Vault</h2>
                    <p className="text-[11px] text-zinc-500">
                        Three values, one submission. Cross-check what the operator told you.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div
                    className={`space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 ${
                        shake ? "animate-shake" : ""
                    }`}
                >
                    {FIELDS.map((field) => (
                        <div key={field.key}>
                            <label className="mb-1 flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                <span>{field.label}</span>
                                <span className="text-[10px] normal-case text-zinc-600">
                                    {field.placeholder}
                                </span>
                            </label>
                            <input
                                type="text"
                                value={values[field.key]}
                                onChange={(e) => update(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full rounded border border-zinc-700 bg-black px-3 py-2 text-sm text-green-300 outline-none placeholder:text-zinc-700 focus:border-green-600"
                            />
                            <p className="mt-1.5 border-l-2 border-zinc-700 pl-2 text-[10px] italic leading-relaxed text-zinc-500">
                                {field.clue}
                            </p>
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 text-xs text-red-400"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full rounded bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? "Checking..." : "Unlock"}
                </button>
            </form>
        </div>
    );
}
