"use client";

import { useEffect } from "react";
import { useWindowStore } from "@/stores/windowStore";

export function useKeyboardShortcuts() {
    const { focusedWindowId, closeWindow, minimizeWindow } = useWindowStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCmd = e.metaKey || e.ctrlKey;

            // ⌘ + Space: Spotlight (Placeholder)
            if (isCmd && e.code === "Space") {
                e.preventDefault();
                console.log("Spotlight triggered");
            }

            // ⌘ + W: Close focused window
            if (isCmd && e.key === "w") {
                e.preventDefault();
                if (focusedWindowId) {
                    closeWindow(focusedWindowId);
                }
            }

            // ⌘ + M: Minimize focused window
            if (isCmd && e.key === "m") {
                e.preventDefault();
                if (focusedWindowId) {
                    minimizeWindow(focusedWindowId);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [focusedWindowId, closeWindow, minimizeWindow]);
}
