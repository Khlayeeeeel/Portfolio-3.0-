"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { LucideApple } from "lucide-react";
import lockBg from "@/assets/lock_bg.jpg";
import ownerImg from "@/assets/owner.jpeg";

interface BootSequenceProps {
    onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
    const [stage, setStage] = useState<"apple" | "login">("apple");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (stage === "apple") {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStage("login"), 500);
                        return 100;
                    }
                    return prev + Math.random() * 5;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [stage]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden font-sans">
            <AnimatePresence mode="wait">
                {stage === "apple" ? (
                    <motion.div
                        key="apple-stage"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        >
                            <LucideApple className="w-20 h-20 text-white fill-current" />
                        </motion.div>
                        <div className="mt-12 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="login-stage"
                        initial={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 1 }}
                        className="relative w-full h-full flex items-center justify-center"
                        style={{
                            backgroundImage: `url(${lockBg.src})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="relative z-10 flex flex-col items-center"
                        >
                            <div className="w-24 h-24 rounded-full bg-white/20 border border-white/30 p-1 mb-4 shadow-xl">
                                <img
                                    src={ownerImg.src}
                                    alt="Owner"
                                    className="w-full h-full rounded-full object-cover shadow-inner"
                                />
                            </div>
                            <h2 className="text-white text-xl font-bold mb-6 drop-shadow-lg">Mohamed Khalil Ayadhi</h2>

                            <form onSubmit={handleLogin} className="flex flex-col items-center">
                                <input
                                    type="password"
                                    placeholder="Enter Password"
                                    autoFocus
                                    className="w-48 bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-macos-blue transition-all"
                                />
                                <button
                                    type="submit"
                                    className="mt-4 text-white/60 text-sm hover:text-white transition-colors"
                                >
                                    Press Enter to Login
                                </button>
                            </form>
                        </motion.div>

                        <div className="absolute top-12 flex flex-col items-center text-white">
                            <DateTimeDisplay />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DateTimeDisplay() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="text-center">
            <div className="text-7xl font-bold tracking-tighter drop-shadow-xl">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xl font-bold mt-2 drop-shadow-lg">
                {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
        </div>
    );
}
