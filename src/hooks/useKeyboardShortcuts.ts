"use client";

import { useEffect } from "react";
import { useWindowStore } from "@/stores/windowStore";
import { useCTFStore } from "@/stores/ctfStore";

export function useKeyboardShortcuts() {
    const { focusedWindowId, closeWindow, minimizeWindow } = useWindowStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCmd = e.metaKey || e.ctrlKey;

            // Cmd/Ctrl + Shift + . : show or hide dot-files
            if (isCmd && e.shiftKey && (e.code === "Period" || e.key === ">")) {
                e.preventDefault();
                useCTFStore.getState().toggleHidden();
                return;
            }

            // Cmd + Space: Spotlight (Placeholder)
            if (isCmd && e.code === "Space") {
                e.preventDefault();
            }

            // Cmd + W: Close focused window
            if (isCmd && e.key === "w") {
                e.preventDefault();
                if (focusedWindowId) {
                    closeWindow(focusedWindowId);
                }
            }

            // Cmd + M: Minimize focused window
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
