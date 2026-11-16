import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useFileSystemStore } from "./fileSystemStore";
import { useWindowStore } from "./windowStore";
import { cacheImage, clearImageCache, getCachedImage } from "@/lib/evidence-cache";
import { clearEvidenceImages } from "@/lib/evidence-store";

/** Persisting a big data URL would blow the localStorage quota. */
const PERSISTED_IMAGE_LIMIT = 1_000_000;

interface CTFState {
  stage: number;
  unlockedFiles: string[];
  shownPopups: string[];
  evidence3Unlocked: boolean;
  completed: boolean;
  /** Single-use token for evidence_03, issued by the final_photo challenge. */
  evidenceToken: string | null;
  /** Single-use token for evidence_01 / evidence_02, issued by the vault. */
  galleryToken: string | null;
  /** Server-signed proof that final_photo was solved; redeemable for a new token. */
  evidence3Proof: string | null;
  /** Evidence images already downloaded, keyed by evidence id ("1", "2", "3"). */
  evidenceImages: Record<string, string>;
  /** Dot-files toggle (Ctrl/Cmd + Shift + .). */
  showHidden: boolean;

  // Actions
  unlockFile: (id: string) => void;
  advanceStage: (to: number) => void;
  markPopupShown: (id: string) => void;
  setEvidenceToken: (token: string) => void;
  setGalleryToken: (token: string) => void;
  setEvidence3Proof: (proof: string) => void;
  setEvidenceImage: (id: string, dataUrl: string) => void;
  getEvidenceImage: (id: string) => string | undefined;
  setEvidence3Unlocked: () => void;
  setCompleted: () => void;
  toggleHidden: () => void;
  resetCTF: () => void;
}

const DEFAULT_STATE = {
  stage: 1,
  unlockedFiles: [] as string[],
  shownPopups: [] as string[],
  evidence3Unlocked: false,
  completed: false,
  evidenceToken: null as string | null,
  galleryToken: null as string | null,
  evidence3Proof: null as string | null,
  evidenceImages: {} as Record<string, string>,
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

      setEvidenceImage: (id: string, dataUrl: string) => {
        cacheImage(Number(id), dataUrl);
        if (dataUrl.length > PERSISTED_IMAGE_LIMIT) return;
        set((state) => ({
          evidenceImages: { ...state.evidenceImages, [id]: dataUrl },
        }));
      },

      getEvidenceImage: (id: string) =>
        get().evidenceImages[id] ?? getCachedImage(Number(id)),

      setEvidence3Unlocked: () => set({ evidence3Unlocked: true }),

      setCompleted: () => set({ completed: true, stage: Math.max(get().stage, 7) }),

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
      version: 4,
      // Restore any missing CTF field from DEFAULT_STATE while preserving all
      // persisted progress (stage, unlocked files, tokens, cached images).
      migrate: (persisted) => ({ ...DEFAULT_STATE, ...((persisted as object) ?? {}) }),
    }
  )
);
