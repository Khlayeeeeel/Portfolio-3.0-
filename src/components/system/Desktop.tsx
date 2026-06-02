"use client";

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
import bgImage from "@/assets/bg.jpg";

export default function Desktop() {
    // Initialize global shortcuts
    useKeyboardShortcuts();

    const { windows } = useWindowStore();

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

            {/* Grid of Desktop Icons */}
            <div className="absolute inset-0 z-10 p-10 pt-12 flex flex-col flex-wrap gap-8 items-end content-end pointer-events-none">
                <div className="flex flex-col items-center gap-1 group w-20 pointer-events-auto cursor-default">
                    <div className="w-16 h-16 bg-blue-500/80 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-blue-400/90 transition-all">
                        <div className="w-10 h-10 border-2 border-white/50 rounded flex items-center justify-center text-white/50 text-[10px] font-bold">PDF</div>
                    </div>
                    <span className="text-white text-[12px] font-medium drop-shadow-lg text-center leading-tight">Resume.pdf</span>
                </div>

                <div className="flex flex-col items-center gap-1 group w-20 pointer-events-auto cursor-default">
                    <div className="w-16 h-16 bg-yellow-500/80 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-yellow-400/90 transition-all">
                        <div className="w-10 h-10 border-2 border-white/50 rounded-full flex items-center justify-center text-white/50 text-xl">📁</div>
                    </div>
                    <span className="text-white text-[12px] font-medium drop-shadow-lg text-center leading-tight">Projects</span>
                </div>
            </div>

            {/* Window Management Area */}
            <div className="relative z-20 flex-1 w-full h-full pointer-events-none">
                <AnimatePresence>
                    {windows.map((win) => (
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
