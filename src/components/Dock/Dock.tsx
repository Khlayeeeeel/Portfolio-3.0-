"use client";

import { motion, useMotionValue, Reorder, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
    Folder,
    Terminal,
    Camera,
    Trash2,
    Lock
} from "lucide-react";
import { useDockState } from "./useDockState";
import { useCTFStore } from "@/stores/ctfStore";
import DockIcon from "./DockIcon";
import DockSeparator from "./DockSeparator";
import styles from "./dock.module.css";
import { cn } from "@/lib/utils";

const STATIC_DOCK_ITEMS = {
    finder: { id: "finder", icon: Folder, name: "Finder", color: "bg-blue-500" },
    terminal: { id: "terminal", icon: Terminal, name: "Terminal", color: "bg-gray-800" },
    photos: { id: "photos", icon: Camera, name: "Photos", color: "bg-pink-500" },
    vault: { id: "vault", icon: Lock, name: "Password Vault", color: "bg-red-900" },
};

export default function Dock() {
    const mouseX = useMotionValue(Infinity);
    const { dockItemIds, reorderDockItems } = useDockState();
    const [isVisible, setIsVisible] = useState(true);
    const stage = useCTFStore((state) => state.stage);

    // Auto-hide logic (disabling initially but keeping the framework as requested)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { innerHeight } = window;
            // Hot corner threshold
            if (e.clientY > innerHeight - 10) {
                setIsVisible(true);
            } else if (e.clientY < innerHeight - 100) {
                // Setting it to true for now so it's always visible out of the box
                // Can be toggled if we add an auto-hide preference
                setIsVisible(true);
            }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Filter missing/removed items safely
    const orderedItems = dockItemIds
        .map(id => STATIC_DOCK_ITEMS[id as keyof typeof STATIC_DOCK_ITEMS])
        .filter(Boolean);

    return (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[9999] pointer-events-none">
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        // No entrance animation: the dock is critical UI and must never
                        // stay at an intermediate animation state.
                        initial={false}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onMouseMove={(e) => mouseX.set(e.pageX)}
                        onMouseLeave={() => mouseX.set(Infinity)}
                        className={cn(styles.dockContainer, "pointer-events-auto h-[66px]")}
                    >
                        <Reorder.Group
                            axis="x"
                            values={dockItemIds}
                            onReorder={reorderDockItems}
                            className="flex h-full items-end gap-[6px]"
                        >
                            {orderedItems.map((item) => (
                                <Reorder.Item key={item.id} value={item.id} className="h-full flex items-end">
                                    <DockIcon mouseX={mouseX} {...item} />
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {/* The vault only appears once the operator data is open. */}
                        {stage >= 4 && (
                            <div className="h-full flex items-end ml-1">
                                <DockIcon mouseX={mouseX} {...STATIC_DOCK_ITEMS.vault} />
                            </div>
                        )}

                        <DockSeparator />

                        {/* Trash is not reorderable and stays at the end */}
                        <div className="h-full flex items-end ml-1">
                            <DockIcon
                                mouseX={mouseX}
                                id="trash"
                                name="Trash"
                                icon={Trash2}
                                color="bg-transparent hover:bg-white/10"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
