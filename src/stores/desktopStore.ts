import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DesktopState {
    wallpaper: string;
    theme: "light" | "dark" | "auto";
    accentColor: string;
    isDockMagnificationEnabled: boolean;
    dockSize: number;
    setWallpaper: (wallpaper: string) => void;
    setTheme: (theme: "light" | "dark" | "auto") => void;
    setAccentColor: (color: string) => void;
    toggleDockMagnification: () => void;
    setDockSize: (size: number) => void;
}

export const useDesktopStore = create<DesktopState>()(
    persist(
        (set) => ({
            wallpaper: "sonoma",
            theme: "dark",
            accentColor: "#0066CC",
            isDockMagnificationEnabled: true,
            dockSize: 64,

            setWallpaper: (wallpaper) => set({ wallpaper }),
            setTheme: (theme) => set({ theme }),
            setAccentColor: (accentColor) => set({ accentColor }),
            toggleDockMagnification: () =>
                set((state) => ({
                    isDockMagnificationEnabled: !state.isDockMagnificationEnabled,
                })),
            setDockSize: (dockSize) => set({ dockSize }),
        }),
        {
            name: "desktop-storage",
        }
    )
);
