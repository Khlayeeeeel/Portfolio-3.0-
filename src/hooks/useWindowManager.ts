"use client";

import { useWindowStore } from "@/stores/windowStore";

export function useWindowManager() {
    const {
        windows,
        focusedWindowId,
        openWindow,
        closeWindow,
        focusWindow,
        minimizeWindow,
        maximizeWindow,
        updateWindowPosition,
        updateWindowSize,
    } = useWindowStore();

    return {
        windows,
        focusedWindowId,
        openWindow,
        closeWindow,
        focusWindow,
        minimizeWindow,
        maximizeWindow,
        updateWindowPosition,
        updateWindowSize,
    };
}
