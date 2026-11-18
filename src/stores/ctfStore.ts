import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useFileSystemStore } from "./fileSystemStore";
import { useWindowStore } from "./windowStore";
import { cacheImage, clearImageCache, getCachedImage } from "@/lib/evidence-cache";
import { clearEvidenceImages, saveEvidenceImage } from "@/lib/evidence-store";

/** Persisting a big data URL would blow the localStorage quota. */
const PERSISTED_IMAGE_LIMIT = 1_000_000;

interface CTFState {
  stage: number;
  unlockedFiles: string[];
  shownPopups: string[];
  evidence3Unlocked: boolean;
  completed: boolean;
  /** Final flag (stage 8) captured: persisted so F5 keeps the victory. */
  won: boolean;
  /** Single-use token for evidence_03, issued by the final_photo challenge. */
  evidenceToken: string | null;
  /** Single-use token for the hint frame (internal id 1), issued by the vault. */
  galleryToken: string | null;
  /** Server-signed proof that final_photo was solved; redeemable for a new token. */
  evidence3Proof: string | null;
  /** Server-signed proof for the hint frame (id 1), issued by the vault. */
  galleryProof: string | null;
  /** Evidence images already downloaded, keyed by evidence id ("1", "2", "3"). */
  evidenceImages: Record<string, string>;
  /**
   * Stage 7 is `revealed`: the server accepted the member's name and the sharp
   * frame was shown. Monotonic, like `stage`, because it never goes backwards.
   */
  revealed: boolean;
  /** True once "Continue" was pressed on the reveal screen (Final Access is open). */
  revealSeen: boolean;
  /** Visibility of the reveal overlay; reopening it is always allowed. */
  revealOpen: boolean;
  /** Dot-files toggle (Ctrl/Cmd + Shift + .). */
  showHidden: boolean;

  // Actions
  unlockFile: (id: string) => void;
  advanceStage: (to: number) => void;
  markPopupShown: (id: string) => void;
  setEvidenceToken: (token: string) => void;
  setGalleryToken: (token: string) => void;
  setEvidence3Proof: (proof: string) => void;
  setGalleryProof: (proof: string) => void;
  setEvidenceImage: (id: string, dataUrl: string) => void;
  getEvidenceImage: (id: string) => string | undefined;
  setEvidence3Unlocked: () => void;
  setCompleted: () => void;
  /** Marks the sharp frame as revealed (stage 7) and opens the reveal overlay. */
  setRevealed: () => void;
  /** Re-opens the reveal overlay (Dock icon, Photos tile). */
  openReveal: () => void;
  closeReveal: () => void;
  /** "Continue" was pressed: Final Access may auto-open from now on. */
  markRevealSeen: () => void;
  /** Marks the final flag as captured (stage 8). */
  setWon: () => void;
  toggleHidden: () => void;
  resetCTF: () => void;
}

const DEFAULT_STATE = {
  stage: 1,
  unlockedFiles: [] as string[],
  shownPopups: [] as string[],
  evidence3Unlocked: false,
  completed: false,
  won: false,
  evidenceToken: null as string | null,
  galleryToken: null as string | null,
  evidence3Proof: null as string | null,
  galleryProof: null as string | null,
  evidenceImages: {} as Record<string, string>,
  revealed: false,
  revealSeen: false,
  revealOpen: false,
  showHidden: false,
};

export const useCTFStore = create<CTFState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      unlockFile: (id: string) =>
        set((state) => ({
          unlockedFiles: state.unlockedFiles.includes(id)
            ? state.unlockedFiles
            : [...state.unlockedFiles, id],
        })),

      // Stages only move forward: a stale challenge result must never rewind.
      advanceStage: (to: number) =>
        set((state) => ({ stage: Math.max(state.stage, to) })),

      markPopupShown: (id: string) =>
        set((state) => ({
          shownPopups: state.shownPopups.includes(id)
            ? state.shownPopups
            : [...state.shownPopups, id],
        })),

      setEvidenceToken: (evidenceToken: string) => set({ evidenceToken }),

      setGalleryToken: (galleryToken: string) => set({ galleryToken }),

      setEvidence3Proof: (evidence3Proof: string) => set({ evidence3Proof }),

      setGalleryProof: (galleryProof: string) => set({ galleryProof }),

      setEvidenceImage: (id: string, dataUrl: string) => {
        cacheImage(Number(id), dataUrl);
        // Large images must survive F5: the single-use token cannot be spent
        // twice, so IndexedDB is the authoritative cache for every image.
        void saveEvidenceImage(Number(id), dataUrl);
        if (dataUrl.length > PERSISTED_IMAGE_LIMIT) return;
        set((state) => ({
          evidenceImages: { ...state.evidenceImages, [id]: dataUrl },
        }));
      },

      getEvidenceImage: (id: string) =>
        get().evidenceImages[id] ?? getCachedImage(Number(id)),

      setEvidence3Unlocked: () => set({ evidence3Unlocked: true }),

      setCompleted: () => set({ completed: true, stage: Math.max(get().stage, 7) }),

      // Stage 7 "revealed": showing the photograph is a milestone, not a toggle.
      setRevealed: () =>
        set({
          revealed: true,
          revealOpen: true,
          completed: true,
          stage: Math.max(get().stage, 7),
        }),

      openReveal: () => {
        if (!get().revealed || get().won) return;
        set({ revealOpen: true });
      },

      closeReveal: () => set({ revealOpen: false }),

      markRevealSeen: () => set({ revealSeen: true, revealOpen: false }),

      // Stage 8 is terminal; advanceStage is monotonic so it can never rewind.
      setWon: () => set({ won: true, stage: Math.max(get().stage, 8) }),

      toggleHidden: () => set((state) => ({ showHidden: !state.showHidden })),

      resetCTF: () => {
        set({ ...DEFAULT_STATE });
        clearImageCache();
        void clearEvidenceImages();
        useFileSystemStore.getState().resetToDefault();
        useWindowStore.setState({ windows: [], focusedWindowId: null, maxZIndex: 100 });
      },
    }),
    {
      name: "ctf-storage",
      version: 7,
      // Restore any missing CTF field from DEFAULT_STATE while preserving all
      // persisted progress (stage, unlocked files, tokens, cached images).
      // Runs saved before v7 have no `revealed` / `revealSeen` / `revealOpen`: they
      // default to false, so a finished run keeps its stage but does not replay
      // the reveal overlay once it has been dismissed.
      migrate: (persisted) => ({ ...DEFAULT_STATE, ...((persisted as object) ?? {}) }),
    }
  )
);
