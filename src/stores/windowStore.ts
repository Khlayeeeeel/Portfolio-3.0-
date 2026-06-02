import { create } from "zustand";

export interface WindowState {
    id: string;
    title: string;
    icon: string;
    isOpen: boolean;
    isFocused: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface WindowStore {
    windows: WindowState[];
    focusedWindowId: string | null;
    maxZIndex: number;
    openWindow: (id: string, title: string, icon: string) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    maximizeWindow: (id: string) => void;
    updateWindowPosition: (id: string, x: number, y: number) => void;
    updateWindowSize: (id: string, width: number, height: number) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
    windows: [],
    focusedWindowId: null,
    maxZIndex: 100,

    openWindow: (id, title, icon) => {
        const { windows, maxZIndex } = get();
        const existingWindow = windows.find((w) => w.id === id);

        if (existingWindow) {
            if (existingWindow.isMinimized) {
                set({
                    windows: windows.map((w) =>
                        w.id === id ? { ...w, isMinimized: false, isFocused: true, zIndex: maxZIndex + 1 } : w
                    ),
                    focusedWindowId: id,
                    maxZIndex: maxZIndex + 1,
                });
            } else {
                get().focusWindow(id);
            }
            return;
        }

        const newWindow: WindowState = {
            id,
            title,
            icon,
            isOpen: true,
            isFocused: true,
            isMinimized: false,
            isMaximized: false,
            zIndex: maxZIndex + 1,
            x: 100 + windows.length * 30,
            y: 100 + windows.length * 30,
            width: 800,
            height: 600,
        };

        set({
            windows: [...windows, newWindow],
            focusedWindowId: id,
            maxZIndex: maxZIndex + 1,
        });
    },

    closeWindow: (id) => {
        set((state) => ({
            windows: state.windows.filter((w) => w.id !== id),
            focusedWindowId: state.focusedWindowId === id ? null : state.focusedWindowId,
        }));
    },

    focusWindow: (id) => {
        const { maxZIndex } = get();
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, isFocused: true, zIndex: maxZIndex + 1, isMinimized: false } : { ...w, isFocused: false }
            ),
            focusedWindowId: id,
            maxZIndex: maxZIndex + 1,
        }));
    },

    minimizeWindow: (id) => {
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, isMinimized: true, isFocused: false } : w
            ),
            focusedWindowId: state.focusedWindowId === id ? null : state.focusedWindowId,
        }));
    },

    maximizeWindow: (id) => {
        set((state) => ({
            windows: state.windows.map((w) =>
                w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
            ),
        }));
    },

    updateWindowPosition: (id, x, y) => {
        set((state) => ({
            windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        }));
    },

    updateWindowSize: (id, width, height) => {
        set((state) => ({
            windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
        }));
    },
}));
