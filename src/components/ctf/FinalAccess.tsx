"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { verifyChallenge } from "@/lib/ctf-client";
import { applyChallengeSuccess, FINAL_FLAG_ITEM } from "@/lib/ctf-actions";
import { useCTFStore } from "@/stores/ctfStore";
import { getCachedImage } from "@/lib/evidence-cache";

/**
 * Stage 8. Opens automatically once the staged photograph is shown (stage 7).
 * It is a normal draggable window: the Photos app stays usable behind it, so the
 * Download button and the "TAKE ME TO THE PRESIDENT" banner are never hidden.
 */
export default function FinalAccess() {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const evidence3Proof = useCTFStore((s) => s.evidence3Proof);
  const evidence3Unlocked = useCTFStore((s) => s.evidence3Unlocked);
  const won = useCTFStore((s) => s.won);
  // Already decrypted by final_photo; never fetched here.
  const storedImage = useCTFStore((s) => s.evidenceImages["3"]);
  const finalImage = storedImage ?? getCachedImage(3);

  const fail = (message: string) => {
    setError(message);
    setAnswer("");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || loading || won) return;

    setLoading(true);
    setError("");

    try {
      const data = await verifyChallenge({
        challenge: "final_flag",
        answer: answer.trim(),
        proof: evidence3Proof ?? undefined,
      });

      if (data.ok) {
        // Routes through the shared success path: advanceStage(8) + won = true.
        applyChallengeSuccess(FINAL_FLAG_ITEM);
      } else {
        fail(data.rateLimited ? "Too many attempts. Wait a minute." : "Access denied");
      }
    } catch {
      fail("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (won) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full flex-col items-center justify-center gap-3 bg-[#0b0b0d] p-8 font-mono text-center"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-green-500/70">final access</p>
        <h2 className="text-xl font-bold tracking-widest text-green-400 glitch-text">ACCESS GRANTED</h2>
        <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
          The president verified the photograph. The insider has been identified.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0b0b0d] p-6 font-mono text-zinc-200">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-lg">
          🗝️
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Final Access</h2>
          <p className="text-[11px] text-zinc-500">President&apos;s office — identity verification</p>
        </div>
      </div>

      <p className="mb-5 border-l-2 border-green-500/40 pl-3 text-xs italic leading-relaxed text-zinc-400">
        Present the photograph to the club president. He will give you the final code.
      </p>

      {evidence3Unlocked && finalImage && (
        <div className="mb-5 overflow-hidden rounded-lg border border-emerald-600/30 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={finalImage}
            alt="Unsealed evidence — identified team member"
            className="max-h-48 w-full object-contain"
          />
          <p className="border-t border-emerald-600/20 px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-emerald-500/70">
            evidence_03.png — identity confirmed
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={`rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 ${shake ? "animate-shake" : ""}`}>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Final code
          </label>
          <input
            type="password"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter the code..."
            className="w-full rounded border border-zinc-700 bg-black px-3 py-2 text-sm text-green-300 outline-none placeholder:text-zinc-700 focus:border-green-600"
            autoFocus
          />
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded bg-green-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
