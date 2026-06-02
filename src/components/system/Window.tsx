"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Rnd } from "react-rnd";
import { useWindowStore, WindowState } from "@/stores/windowStore";
import { cn } from "@/lib/utils";
import {
    X,
    Minus,
    Maximize2
} from "lucide-react";
import { useState } from "react";

interface WindowProps {
    window: WindowState;
    children: React.ReactNode;
}

export default function Window({ window: win, children }: WindowProps) {
    const {
        focusWindow,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        updateWindowPosition,
        updateWindowSize
    } = useWindowStore();

    const [isHovered, setIsHovered] = useState(false);

    const windowVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 20 },
        visible: {
            opacity: win.isMinimized ? 0 : 1,
            scale: win.isMinimized ? 0.8 : 1,
            y: win.isMinimized ? 50 : 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.2 }
        }
    };

    // The window only completely unmounts when AnimatePresence removes it from the tree.
    // For minimize, we can just visually hide it using CSS/animations later if needed,
    // or handle `isOpen === false` exiting safely here.
    if (!win.isOpen) return null;

    return (
        <Rnd
            size={{ width: win.isMaximized ? "100%" : win.width, height: win.isMaximized ? "100%" : win.height }}
            position={{ x: win.isMaximized ? 0 : win.x, y: win.isMaximized ? 0 : win.y }}
            onDragStop={(e, d) => {
                updateWindowPosition(win.id, d.x, d.y);
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
                updateWindowSize(win.id, ref.offsetWidth, ref.offsetHeight);
                updateWindowPosition(win.id, position.x, position.y);
            }}
            dragHandleClassName="window-titlebar"
            bounds="parent"
            minWidth={400}
            minHeight={300}
            disableDragging={win.isMaximized}
            enableResizing={!win.isMaximized}
            style={{
                zIndex: win.zIndex,
                pointerEvents: win.isMinimized ? 'none' : 'auto',
                transition: "width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)"
            }}
            onMouseDown={() => focusWindow(win.id)}
        >
            <motion.div
                variants={windowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                    "flex flex-col h-full rounded-[10px] overflow-hidden shadow-window bg-[var(--window-bg)] backdrop-blur-xl border border-white/20 transition-shadow duration-200",
                    win.isFocused ? "shadow-2xl" : "shadow-lg opacity-95",
                    win.isMaximized && "rounded-none border-none"
                )}
            >
                {/* Title Bar */}
                <div
                    className="window-titlebar h-[52px] flex items-center px-4 relative select-none"
                    onDoubleClick={() => maximizeWindow(win.id)}
                >
                    {/* Traffic Lights */}
                    <div
                        className="flex items-center gap-2 z-10"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                            className="w-3 h-3 rounded-full bg-macos-red flex items-center justify-center group"
                        >
                            {isHovered && <X size={8} className="text-black/60" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                            className="w-3 h-3 rounded-full bg-macos-yellow flex items-center justify-center group"
                        >
                            {isHovered && <Minus size={8} className="text-black/60" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id); }}
                            className="w-3 h-3 rounded-full bg-macos-green flex items-center justify-center group"
                        >
                            {isHovered && <Maximize2 size={8} className="text-black/60" />}
                        </button>
                    </div>

                    {/* Title */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[13px] font-semibold text-gray-700/80 dark:text-white/80">
                            {win.title}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-white/80 dark:bg-black/20">
                    {children}
                </div>
            </motion.div>
        </Rnd>
    );
}
