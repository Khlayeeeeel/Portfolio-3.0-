"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import {
    Folder,
    Terminal,
    Globe,
    FileText,
    Camera,
    Gamepad2,
    Settings,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowStore } from "@/stores/windowStore";
import safariIcon from "@/assets/icons/safari.png";

const DOCK_ITEMS = [
    { id: "finder", icon: Folder, name: "Finder", color: "bg-blue-500" },
    { id: "safari", img: safariIcon.src, name: "Safari", color: "bg-transparent hover:bg-white/10" },
    { id: "terminal", icon: Terminal, name: "Terminal", color: "bg-gray-800" },
    { id: "notes", icon: FileText, name: "Notes", color: "bg-yellow-400" },
    { id: "photos", icon: Camera, name: "Photos", color: "bg-pink-500" },
    { id: "preferences", icon: Settings, name: "System Settings", color: "bg-gray-400" },
    { id: "arcade", icon: Gamepad2, name: "Arcade", color: "bg-purple-500", pulse: true },
];

export default function Dock() {
    const mouseX = useMotionValue(Infinity);

    return (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <motion.div
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className="mx-auto flex h-[64px] items-end gap-2 rounded-2xl bg-white/20 backdrop-blur-2xl border border-white/20 px-3 pb-2 shadow-2xl pointer-events-auto"
            >
                {DOCK_ITEMS.map((item) => (
                    <DockIcon key={item.id} mouseX={mouseX} item={item} />
                ))}

                <div className="w-[1px] h-10 bg-white/20 mx-1 self-center" />

                <DockIcon key="trash" mouseX={mouseX} item={{ id: "trash", icon: Trash2, name: "Trash", color: "bg-transparent" }} />
            </motion.div>
        </div>
    );
}

function DockIcon({ mouseX, item }: { mouseX: any; item: any }) {
    const ref = useRef<HTMLDivElement>(null);
    const { openWindow, windows } = useWindowStore();
    const [isBouncing, setIsBouncing] = useState(false);

    const distance = useTransform(mouseX, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [48, 80, 48]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    const isRunning = windows.some((w) => w.id === item.id && w.isOpen);

    const handleClick = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 1000);
        openWindow(item.id, item.name, item.id);
    };

    return (
        <div className="relative flex flex-col items-center">
            <motion.div
                ref={ref}
                style={{ width }}
                onClick={handleClick}
                className={cn(
                    "aspect-square rounded-xl flex items-center justify-center cursor-default transition-[background-color,box-shadow,border-color,opacity,transform] duration-200 shadow-lg border border-white/10 group relative",
                    item.color,
                    item.pulse && "animate-pulse"
                )}
                animate={isBouncing ? { y: [0, -20, 0] } : {}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                {item.img ? (
                    <img src={item.img} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
                ) : (
                    <item.icon className="w-1/2 h-1/2 text-white drop-shadow-md" />
                )}

                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800/80 backdrop-blur-md rounded text-white text-[11px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                    {item.name}
                </div>
            </motion.div>

            {/* Running Indicator */}
            {isRunning && (
                <div className="w-1 h-1 bg-white rounded-full mt-1" />
            )}
        </div>
    );
}
