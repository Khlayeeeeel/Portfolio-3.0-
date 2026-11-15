"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { LucideApple, ArrowRight, Lock } from "lucide-react";
import lockBg from "@/assets/lock_bg.jpg";
import ownerImg from "@/assets/owner.png";

interface BootSequenceProps {
    onComplete: () => void;
}

// Obfuscated cryptographic hash of the password (SHA-256)
// Prevents plaintext password exposure when inspecting client JavaScript code
const VERIFY_HASH = "8d21cc2b84ee17ce05c403a1a95bd2905aec4e476fba6cdfbeb9eb5d02a76d8e";

async function computeSha256(input: string): Promise<string> {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return "";
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
    const [stage, setStage] = useState<"apple" | "login">("apple");
    const [progress, setProgress] = useState(0);
    const [passwordInput, setPasswordInput] = useState("");
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput || isLoading) return;

        setIsLoading(true);
        setIsError(false);
        setErrorMessage("");

        try {
            // First: Attempt Server-Side Verification via Next.js API Route
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: passwordInput }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    onComplete();
                    return;
                }
            }

            // Second: Client-Side Cryptographic Hash Fallback Verification
            const clientHash = await computeSha256(passwordInput);
            if (clientHash === VERIFY_HASH) {
                onComplete();
                return;
            }

            // Failed verification
            triggerLoginError();
        } catch {
            // If offline/network failure, verify using client SHA-256 hash
            const clientHash = await computeSha256(passwordInput);
            if (clientHash === VERIFY_HASH) {
                onComplete();
            } else {
                triggerLoginError();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const triggerLoginError = () => {
        setIsError(true);
        setErrorMessage("Incorrect Password");
        setPasswordInput("");
        setTimeout(() => setIsError(false), 800);
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
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="relative z-10 flex flex-col items-center"
                        >
                            {/* User Avatar */}
                            <div className="w-24 h-24 rounded-full bg-white/20 border border-white/30 p-1 mb-4 shadow-2xl">
                                <img
                                    src={ownerImg.src}
                                    alt="Owner"
                                    className="w-full h-full rounded-full object-cover shadow-inner"
                                />
                            </div>
                            <h2 className="text-white text-xl font-semibold mb-6 drop-shadow-lg tracking-wide">
                                Mohamed Khalil Ayadhi
                            </h2>

                            {/* Password Form with Shake Error Animation */}
                            <motion.form
                                onSubmit={handleLogin}
                                animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center relative"
                            >
                                <div className="relative flex items-center">
                                    <input
                                        type="password"
                                        placeholder="Enter Password"
                                        value={passwordInput}
                                        onChange={(e) => {
                                            setPasswordInput(e.target.value);
                                            if (errorMessage) setErrorMessage("");
                                        }}
                                        autoFocus
                                        disabled={isLoading}
                                        className={`w-52 bg-white/20 backdrop-blur-xl border ${
                                            isError
                                                ? "border-red-400 focus:ring-red-400"
                                                : "border-white/30 focus:ring-white/50"
                                        } rounded-full px-4 py-2 pr-9 text-white placeholder-white/60 text-sm text-center focus:outline-none focus:ring-2 transition-all shadow-lg`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!passwordInput || isLoading}
                                        className="absolute right-1.5 p-1 rounded-full bg-white/30 hover:bg-white/50 disabled:opacity-30 text-white transition-all"
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                </div>

                                {errorMessage ? (
                                    <p className="mt-2 text-xs text-red-300 font-medium drop-shadow animate-fade-in">
                                        {errorMessage}
                                    </p>
                                ) : (
                                    <p className="mt-3 text-white/60 text-xs flex items-center gap-1">
                                        <Lock size={12} /> Press Enter to Unlock
                                    </p>
                                )}
                            </motion.form>
                        </motion.div>

                        {/* Top Time Display */}
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
