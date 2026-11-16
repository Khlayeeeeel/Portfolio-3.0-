"use client";

import { useCallback, useEffect, useState } from "react";
import { useCTFStore } from "@/stores/ctfStore";
import { clearSession } from "@/lib/session";

/**
 * Ctrl+Shift+R (and Ctrl+Alt+R, because Chrome and Firefox reserve
 * Ctrl+Shift+R for a hard reload) opens a confirmation modal. Confirming wipes
 * the CTF store, the virtual filesystem, every window and the session, then
 * hands control back to the caller so it can show the lockscreen again.
 */
export function useResetShortcut(onReset: () => void) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isResetCombo =
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") ||
                (e.ctrlKey && e.altKey && e.key.toLowerCase() === "r");

            if (!isResetCombo) return;

            e.preventDefault();
            setIsOpen(true);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const confirm = useCallback(() => {
        useCTFStore.getState().resetCTF();
        clearSession();
        setIsOpen(false);
        onReset();
    }, [onReset]);

    const cancel = useCallback(() => setIsOpen(false), []);

    return { isOpen, confirm, cancel };
}
