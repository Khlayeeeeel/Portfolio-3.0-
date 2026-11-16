"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MenuBar from "./MenuBar";
import Dock from "../Dock/Dock";
import Window from "./Window";
import Terminal from "@/components/apps/Terminal";
import Finder from "@/components/apps/Finder";
import Safari from "@/components/apps/Safari";
import Notes from "@/components/apps/Notes";
import Photos from "@/components/apps/Photos";
import Settings from "@/components/apps/Settings";
import Arcade from "@/components/apps/Arcade";
import PasswordVault from "@/components/ctf/PasswordVault";
import PasswordModal from "@/components/ctf/PasswordModal";
import HackerPopup, { HackerPopupContent } from "@/components/ctf/HackerPopup";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useWindowStore } from "@/stores/windowStore";
import { useFileSystemStore, FSItem } from "@/stores/fileSystemStore";
import { useCTFStore } from "@/stores/ctfStore";
import { isVisible } from "@/lib/ctf-visibility";
import { applyChallengeSuccess } from "@/lib/ctf-actions";
import { FINAL_PHOTO_CLUE } from "@/lib/ctf-content";
import bgImage from "@/assets/bg.jpg";
import { Folder, FileText, FileCode, FileCheck, Image as ImageIcon, File, Lock } from "lucide-react";

const POPUPS: Array<HackerPopupContent & { minStage: number }> = [
    {
        id: "classified",
        minStage: 3,
        title: "INTRUSION DETECTED",
        lines: [
            "You shouldn't be here. I know someone is investigating what happened.",
            "But you're already too late.",
        ],
    },
    {
        id: "confidential",
        minStage: 4,
        title: "TRACE DETECTED",
        lines: ["You're getting closer... But do you really know who you're looking for?"],
    },
    {
        id: "vault",
        minStage: 5,
        title: "LAST TRACE",
        lines: ["Find me if you can. This is the last trace you'll ever find."],
        footer: "Connection terminated...",
    },
];

export default function Desktop() {
    // Initialize global shortcuts (Cmd+W, Cmd+M, hidden-files toggle)
    useKeyboardShortcuts();

    const [mounted, setMounted] = useState(false);
    const [pendingUnlock, setPendingUnlock] = useState<FSItem | null>(null);

    const { windows, openWindow } = useWindowStore();
    const { items, setCurrentFolder } = useFileSystemStore();
    const { stage, showHidden, shownPopups, unlockedFiles, markPopupShown } = useCTFStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Only icons the player is allowed to see at this stage. The classified
    // file is a real VFS item in Documents, also shown here as a shortcut so
    // Desktop, Finder and Terminal all unlock the same id.
    const desktopItems = useMemo(() => {
        const list = Object.values(items).filter(
            (item) => item.parentId === "desktop" && isVisible(item, { stage, showHidden })
        );
        for (const id of ["classified-file-txt", "confidential-data-txt"]) {
            const item = items[id];
            if (item && isVisible(item, { stage, showHidden })) list.push(item);
        }
        return list;
    }, [items, stage, showHidden]);

    const activePopup = useMemo(
        () => POPUPS.find((popup) => stage >= popup.minStage && !shownPopups.includes(popup.id)),
        [stage, shownPopups]
    );

    const handleItemDoubleClick = (item: FSItem) => {
        if (item.locked && !unlockedFiles.includes(item.id)) {
            setPendingUnlock(item);
            return;
        }

        if (item.type === "folder") {
            setCurrentFolder(item.id);
        }
        openWindow("finder", "Finder", "folder");
    };

    const getItemIcon = (type: FSItem["type"]) => {
        switch (type) {
            case "folder":
                return <Folder size={32} className="text-sky-400 drop-shadow" />;
            case "pdf":
                return <FileCheck size={32} className="text-red-400 drop-shadow" />;
            case "text":
                return <FileText size={32} className="text-emerald-400 drop-shadow" />;
            case "code":
                return <FileCode size={32} className="text-purple-400 drop-shadow" />;
            case "image":
                return <ImageIcon size={32} className="text-amber-400 drop-shadow" />;
            default:
                return <File size={32} className="text-gray-300 drop-shadow" />;
        }
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black select-none font-sans">
            {/* Menu Bar */}
            <MenuBar />

            {/* Wallpaper Layer */}
            <motion.div
                initial={{ scale: 1.1, filter: "blur(20px)" }}
                animate={{ scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url(${bgImage.src})`,
                }}
            />

            {/* Grid of Dynamic Desktop Icons */}
            <div className="absolute inset-0 z-10 p-10 pt-12 flex flex-col flex-wrap gap-6 items-end content-end pointer-events-none">
                {mounted &&
                    desktopItems.map((item) => {
                        const isLocked = !!item.locked && !unlockedFiles.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                onDoubleClick={() => handleItemDoubleClick(item)}
                                className="relative flex flex-col items-center gap-1 group w-20 pointer-events-auto cursor-default transition-transform hover:scale-105"
                            >
                                <div className="w-14 h-14 bg-black/30 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-black/50 transition-all">
                                    {getItemIcon(item.type)}
                                </div>
                                {isLocked && (
                                    <div className="pointer-events-none absolute -right-1 top-0 rounded-full bg-black/70 p-1">
                                        <Lock size={10} className="text-amber-300" />
                                    </div>
                                )}
                                <span className="text-white text-[11px] font-medium drop-shadow-md text-center leading-tight line-clamp-2 px-1 rounded bg-black/20 backdrop-blur-xs">
                                    {item.name}
                                </span>
                            </div>
                        );
                    })}
            </div>

            {/* Window Management Area */}
            <div className="relative z-20 flex-1 w-full h-full pointer-events-none">
                <AnimatePresence>
                    {mounted &&
                        windows.map((win) => (
                            <Window key={win.id} window={win}>
                                {win.id === "terminal" && <Terminal />}
                                {win.id === "finder" && <Finder />}
                                {win.id === "safari" && <Safari />}
                                {win.id === "notes" && <Notes />}
                                {win.id === "photos" && <Photos />}
                                {win.id === "preferences" && <Settings />}
                                {win.id === "arcade" && <Arcade />}
                                {win.id === "vault" && <PasswordVault />}
                                {!["terminal", "finder", "safari", "notes", "photos", "preferences", "arcade", "vault"].includes(win.id) && (
                                    <div className="p-10 flex items-center justify-center h-full text-gray-400">
                                        {win.title} is coming soon...
                                    </div>
                                )}
                            </Window>
                        ))}
                </AnimatePresence>
            </div>

            {/* Dock */}
            <Dock />

            {/* Locked file prompt (desktop icons) */}
            {pendingUnlock && (
                <PasswordModal
                    isOpen
                    challenge={pendingUnlock.challenge ?? "classified_file"}
                    fileName={pendingUnlock.name}
                    clue={pendingUnlock.challenge === "final_photo" ? FINAL_PHOTO_CLUE : undefined}
                    onSuccess={(data) => {
                        applyChallengeSuccess(pendingUnlock, data);
                        // The Desktop has no text viewer: hand the now-unlocked
                        // file back to Finder, which shows its content.
                        setCurrentFolder(pendingUnlock.parentId ?? "igc");
                        openWindow("finder", "Finder", "folder");
                        setPendingUnlock(null);
                    }}
                    onClose={() => setPendingUnlock(null)}
                />
            )}

            {/* Hacker popups, one milestone at a time */}
            <AnimatePresence>
                {activePopup && (
                    <HackerPopup
                        key={activePopup.id}
                        content={activePopup}
                        // Popup 2 must not trap the Vault that opens at stage 4.
                        variant={activePopup.id === "confidential" ? "toast" : "modal"}
                        onClose={() => markPopupShown(activePopup.id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
