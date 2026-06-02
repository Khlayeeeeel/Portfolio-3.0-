import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface DockTooltipProps {
    label: string;
    isHovered: boolean;
}

export default function DockTooltip({ label, isHovered }: DockTooltipProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isHovered) {
            // Delay appearance by 600ms
            timeout = setTimeout(() => setShow(true), 600);
        } else {
            setShow(false);
        }
        return () => clearTimeout(timeout);
    }, [isHovered]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-[6px] bg-gray-800/90 backdrop-blur-md border border-white/10 rounded-full text-white text-[12px] font-medium whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                    style={{ zIndex: 10000 }}
                >
                    {label}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
