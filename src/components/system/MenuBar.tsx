"use client";

import { useState, useEffect } from "react";
import {
    LucideApple,
    Wifi,
    Battery,
    Search,
    Volume2,
    LayoutGrid
} from "lucide-react";

export default function MenuBar() {
    const [mounted, setMounted] = useState(false);
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setMounted(true);
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-[28px] z-50 flex items-center justify-between px-4 bg-white/10 backdrop-blur-md border-b border-white/5 text-white text-[13px] font-medium select-none shadow-sm">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <div className="px-2 hover:bg-white/20 rounded transition-colors cursor-default">
                    <LucideApple size={16} className="fill-current" />
                </div>
                <div className="px-2 hover:bg-white/20 rounded transition-colors cursor-default font-bold">
                    Finder
                </div>
                {["File", "Edit", "View", "Go", "Window", "Help"].map((item) => (
                    <div key={item} className="px-2 hover:bg-white/20 rounded transition-colors cursor-default hidden md:block">
                        {item}
                    </div>
                ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                <div className="px-1 hover:bg-white/20 rounded transition-colors cursor-default">
                    <Wifi size={16} />
                </div>
                <div className="px-1 hover:bg-white/20 rounded transition-colors cursor-default flex items-center gap-1">
                    <span className="text-[11px]">85%</span>
                    <Battery size={16} className="rotate-90" />
                </div>
                <div className="px-1 hover:bg-white/20 rounded transition-colors cursor-default">
                    <Volume2 size={16} />
                </div>
                <div className="px-1 hover:bg-white/20 rounded transition-colors cursor-default">
                    <Search size={16} />
                </div>
                <div className="px-1 hover:bg-white/20 rounded transition-colors cursor-default">
                    <LayoutGrid size={16} />
                </div>
                <div className="px-2 hover:bg-white/20 rounded transition-colors cursor-default font-medium min-w-[120px] text-right">
                    {mounted && time ? formatTime(time) : ""}
                </div>
            </div>
        </div>
    );
}
