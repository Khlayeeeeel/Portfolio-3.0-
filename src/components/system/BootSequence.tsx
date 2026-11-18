"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { LucideApple, ArrowRight, Lock } from "lucide-react";
import lockBg from "@/assets/lock_bg.jpg";
import { verifyChallenge } from "@/lib/ctf-client";
import { startSession } from "@/lib/session";
import { useCTFStore } from "@/stores/ctfStore";

interface BootSequenceProps {
    onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
    const [stage, setStage] = useState<"apple" | "login">("apple");
    const [progress, setProgress] = useState(0);
    const [passwordInput, setPasswordInput] = useState("");
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const advanceStage = useCTFStore((state) => state.advanceStage);

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

    const triggerLoginError = (message: string) => {
        setIsError(true);
        setErrorMessage(message);
        setPasswordInput("");
        setTimeout(() => setIsError(false), 800);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput || isLoading) return;

        setIsLoading(true);
        setIsError(false);
        setErrorMessage("");

        try {
            // The answer never leaves the server: only the boolean comes back.
            const data = await verifyChallenge({
                challenge: "login",
                answer: passwordInput,
            });

            if (data.ok) {
                startSession();
                advanceStage(2);
                onComplete();
                return;
            }

            triggerLoginError(
                data.rateLimited
                    ? "Too many attempts. Wait a minute."
                    : data.error === "Server misconfiguration."
                      ? "System unavailable. Contact the organiser."
                      : "Incorrect Password"
            );
        } catch {
            triggerLoginError("Network error. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black font-sans">
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
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="relative z-10 flex flex-col items-center px-6 text-center"
                        >
                            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.45em] text-red-400/80">
                                IGC
                            </p>
                            <h1 className="mb-3 font-mono text-2xl font-bold tracking-[0.2em] text-white drop-shadow-lg">
                                IGC INTERNAL SYSTEM
                            </h1>
                            <p className="mb-8 max-w-md font-mono text-xs leading-relaxed text-white/60">
                                Unauthorized access prohibited. Enter system password:
                            </p>

                            <motion.form
                                onSubmit={handleLogin}
                                animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                                transition={{ duration: 0.5 }}
                                className="relative flex flex-col items-center"
                            >
                                <div className="relative flex items-center">
                                    <input
                                        type="password"
                                        placeholder="System password"
                                        value={passwordInput}
                                        onChange={(e) => {
                                            setPasswordInput(e.target.value);
                                            if (errorMessage) setErrorMessage("");
                                        }}
                                        autoFocus
                                        disabled={isLoading}
                                        className={`w-64 rounded-full border bg-white/10 px-4 py-2 pr-9 text-center font-mono text-sm text-white backdrop-blur-xl placeholder-white/40 transition-all focus:outline-none focus:ring-2 ${
                                            isError
                                                ? "border-red-400 focus:ring-red-400"
                                                : "border-white/25 focus:ring-white/40"
                                        }`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!passwordInput || isLoading}
                                        className="absolute right-1.5 rounded-full bg-white/20 p-1 text-white transition-all hover:bg-white/40 disabled:opacity-30"
                                        aria-label="Unlock"
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                </div>

                                {errorMessage ? (
                                    <p className="mt-2 animate-fade-in font-mono text-xs font-medium text-red-300 drop-shadow">
                                        {errorMessage}
                                    </p>
                                ) : (
                                    <p className="mt-3 flex items-center gap-1 font-mono text-[11px] text-white/50">
                                        <Lock size={12} /> Press Enter to Unlock
                                    </p>
                                )}
                            </motion.form>
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
    const [mounted, setMounted] = useState(false);
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setMounted(true);
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!mounted || !time) {
        return <div className="h-24" />;
    }

    return (
        <div className="text-center">
            <div className="text-7xl font-light tracking-tight drop-shadow-xl">
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-lg font-medium mt-1 drop-shadow-lg opacity-90">
                {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </div>
        </div>
    );
}
