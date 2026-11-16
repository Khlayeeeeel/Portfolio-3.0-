import { useRef, useState } from "react";
import { motion, MotionValue, useAnimation, AnimatePresence, useTransform } from "framer-motion";
import { useMouseProximity } from "./useMouseProximity";
import DockTooltip from "./DockTooltip";
import { useWindowStore } from "@/stores/windowStore";
import { cn } from "@/lib/utils";

interface DockIconProps {
    id: string;
    name: string;
    icon?: any;
    img?: string;
    color?: string;
    pulse?: boolean;
    mouseX: MotionValue<number>;
}

export default function DockIcon({
    id,
    name,
    icon: Icon,
    img,
    color,
    pulse,
    mouseX
}: DockIconProps) {
    const ref = useRef<HTMLButtonElement>(null);
    const scale = useMouseProximity(mouseX, ref, 1, 1.8, 150);
    const size = useTransform(scale, (s) => s * 48); // Base size 48px

    const [isHovered, setIsHovered] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const controls = useAnimation();

    const { openWindow, windows } = useWindowStore();
    const isRunning = windows.some((w) => w.id === id && w.isOpen);

    const handleClick = () => {
        // Open first: the window must never wait for a cosmetic animation.
        openWindow(id, name, id); // Fallback icon ID
        setIsBouncing(true);
        controls
            .start({
                y: [0, -24, 0],
                transition: { duration: 0.6, ease: "easeInOut" },
            })
            .catch(() => undefined)
            .finally(() => setIsBouncing(false));
    };

    const onRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        // Context menu placeholder for future expansion
    };

    const indicatorVariants = {
        initial: { scale: 0, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            transition: { type: "spring", stiffness: 500, damping: 15, delay: 0.1 }
        },
        exit: { scale: 0, opacity: 0 }
    };

    return (
        <div className="relative flex flex-col items-center justify-end h-full">
            <motion.button
                ref={ref}
                style={{ width: size, height: size }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleClick}
                onContextMenu={onRightClick}
                animate={controls}
                className={cn(
                    "rounded-[14px] flex items-center justify-center cursor-default transition-[background-color,box-shadow,border-color] duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-white/10 group relative mb-2",
                    color || "bg-gray-800",
                    pulse && "animate-pulse"
                )}
            >
                {img ? (
                    <img src={img} alt={name} className="w-[85%] h-[85%] object-contain drop-shadow-md pointer-events-none select-none" />
                ) : Icon ? (
                    <Icon className="w-[50%] h-[50%] text-white drop-shadow-md pointer-events-none select-none" />
                ) : null}

                <DockTooltip label={name} isHovered={isHovered && !isBouncing} />
            </motion.button>

            {/* Running app indicator */}
            <div className="absolute bottom-0 flex justify-center w-full h-[4px]">
                <AnimatePresence>
                    {isRunning && (
                        <motion.div
                            variants={indicatorVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="w-[20px] h-[4px] bg-white/90 rounded-full"
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
