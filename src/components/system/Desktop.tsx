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
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useWindowStore } from "@/stores/windowStore";
import { useFileSystemStore, FSItem } from "@/stores/fileSystemStore";
import bgImage from "@/assets/bg.jpg";
import { Folder, FileText, FileCode, FileCheck, Image as ImageIcon, File } from "lucide-react";

export default function Desktop() {
    // Initialize global shortcuts
    useKeyboardShortcuts();

    const [mounted, setMounted] = useState(false);
    const { windows, openWindow } = useWindowStore();
    const { items, setCurrentFolder } = useFileSystemStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Dynamically fetch items inside the 'desktop' folder
    const desktopItems = useMemo(() => {
        return Object.values(items).filter((item) => item.parentId === "desktop");
    }, [items]);

    const handleItemDoubleClick = (item: FSItem) => {
        if (item.type === "folder") {
            setCurrentFolder(item.id);
            openWindow("finder", "Finder", "folder");
        } else {
            setCurrentFolder("desktop");
            openWindow("finder", "Finder", "folder");
        }
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
                    desktopItems.map((item) => (
                        <div
                            key={item.id}
                            onDoubleClick={() => handleItemDoubleClick(item)}
                            className="flex flex-col items-center gap-1 group w-20 pointer-events-auto cursor-default transition-transform hover:scale-105"
                        >
                            <div className="w-14 h-14 bg-black/30 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-black/50 transition-all">
                                {getItemIcon(item.type)}
                            </div>
                            <span className="text-white text-[11px] font-medium drop-shadow-md text-center leading-tight line-clamp-2 px-1 rounded bg-black/20 backdrop-blur-xs">
                                {item.name}
                            </span>
                        </div>
                    ))}
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
                                {!["terminal", "finder", "safari", "notes", "photos", "preferences", "arcade"].includes(win.id) && (
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
        </div>
    );
}
