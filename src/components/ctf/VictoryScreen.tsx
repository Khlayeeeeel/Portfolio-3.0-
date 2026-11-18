"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getCachedImage } from "@/lib/evidence-cache";
import { useCTFStore } from "@/stores/ctfStore";

/**
 * Terminal victory screen for stage 8. Rendered at the Desktop root, never
 * inside a react-rnd window (whose transform would contain a fixed overlay).
 * Dismissable so the recovered photo, its Download button and the
 * "TAKE ME TO THE PRESIDENT" banner remain reachable underneath.
 */
export default function VictoryScreen() {
  const [visible, setVisible] = useState(true);
  const storedImage = useCTFStore((s) => s.evidenceImages["3"]);
  // The sharp frame was already unlocked and cached by final_photo.
  const finalImage = storedImage ?? getCachedImage(3);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/95 p-6 font-mono backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.15 }}
        className="w-full max-w-lg text-center"
      >
        <p className="mb-6 text-[11px] uppercase tracking-[0.5em] text-green-500/60">
          igc internal system // case closed
        </p>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-40 -translate-y-1/2 bg-green-500/5 blur-3xl" />
        <h1 className="text-3xl font-bold tracking-[0.12em] text-green-400 glitch-text sm:text-4xl">
          MISSION COMPLETE
        </h1>
        <div className="mx-auto mt-6 mb-8 h-px w-24 bg-green-500/40" />
        {finalImage && (
          <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-lg border border-green-500/30 bg-black/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={finalImage}
              alt="Unsealed evidence — identified team member"
              className="max-h-64 w-full object-contain"
            />
            <p className="border-t border-green-500/20 py-1.5 font-mono text-[10px] uppercase tracking-widest text-green-500/70">
              evidence_03.png
            </p>
          </div>
        )}
        <p className="mt-6 text-sm leading-relaxed text-zinc-300">
          The insider has been identified. Well done, investigators.
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-10 rounded border border-green-700/60 bg-green-950/40 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-green-300 transition-colors hover:bg-green-800/50 hover:text-white"
        >
          Return to desktop
        </button>
      </motion.div>
    </motion.div>
  );
}
