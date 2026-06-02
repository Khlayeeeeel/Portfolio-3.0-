import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_DOCK_ORDER = [
    "finder",
    "safari",
    "terminal",
    "notes",
    "photos",
    "preferences",
    "arcade"
];

interface DockStore {
    dockItemIds: string[];
    reorderDockItems: (newOrder: string[]) => void;
    // Future state updates, dragging flags, context menu refs, etc.
}

export const useDockState = create<DockStore>()(
    persist(
        (set) => ({
            dockItemIds: DEFAULT_DOCK_ORDER,
            reorderDockItems: (newOrder) => set({ dockItemIds: newOrder }),
        }),
        {
            name: "mac-dock-storage",
        }
    )
);
