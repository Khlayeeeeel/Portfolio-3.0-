import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_DOCK_ORDER = [
    "finder",
    "terminal",
    "photos"
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
            version: 2,
            // Old saved orders may still list apps that are no longer on the dock.
            migrate: () => ({ dockItemIds: DEFAULT_DOCK_ORDER }),
        }
    )
);
