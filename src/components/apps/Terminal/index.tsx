"use client";

import { useState, useRef, useEffect } from "react";

const INITIAL_OUTPUT = [
    "Welcome to macOS Sequoia Terminal",
    "Type 'help' to see available commands.",
    ""
];

export default function Terminal() {
    const [output, setOutput] = useState<string[]>(INITIAL_OUTPUT);
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleCommand = (cmd: string) => {
        const newOutput = [...output, `visitor@portfolio:~$ ${cmd}`];

        switch (cmd.toLowerCase().trim()) {
            case "help":
                newOutput.push(
                    "Available commands:",
                    "  help     - Show this help message",
                    "  ls       - List files/folders",
                    "  clear    - Clear the terminal",
                    "  whoami   - Display current user",
                    "  date     - Show current date/time",
                    "  neofetch - System information"
                );
                break;
            case "ls":
                newOutput.push("Desktop  Documents  Downloads  Library  Movies  Music  Pictures  Public");
                break;
            case "clear":
                setOutput([]);
                return;
            case "whoami":
                newOutput.push("visitor");
                break;
            case "date":
                newOutput.push(new Date().toString());
                break;
            case "neofetch":
                newOutput.push(
                    "                MMMMMMMMMMMMMMMMMMMMMMMM",
                    "            MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "         MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "       MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "      MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "     MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "    MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "   MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "   MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
                    "  ------------------------------------------------",
                    "  OS: macOS Sequoia 15.0",
                    "  Host: Portfolio Project",
                    "  Kernel: Darwin 24.0.0",
                    "  Uptime: 2 mins",
                    "  Packages: 390 (npm)",
                    "  Shell: zsh 5.9",
                    "  Resolution: 1920x1080",
                    "  DE: Aqua",
                    "  WM: Quartz Compositor",
                    "  Terminal: iTerm2",
                    "  CPU: Apple M3 Max",
                    "  GPU: Apple M3 Max",
                    "  Memory: 64GB"
                );
                break;
            case "":
                break;
            default:
                newOutput.push(`command not found: ${cmd}`);
        }

        setOutput(newOutput);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleCommand(input);
        setInput("");
    };

    return (
        <div
            className="h-full bg-black/90 text-green-500 font-mono p-4 text-[13px] leading-relaxed selection:bg-green-500/30 overflow-auto"
            onClick={() => inputRef.current?.focus()}
            ref={scrollRef}
        >
            <div className="whitespace-pre-wrap">
                {output.map((line, i) => (
                    <div key={i}>{line}</div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <span className="text-blue-400">visitor@portfolio:~$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-green-500 caret-white"
                    autoFocus
                />
            </form>
        </div>
    );
}
