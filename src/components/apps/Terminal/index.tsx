"use client";

import { useState, useRef, useEffect } from "react";
import { useFileSystemStore } from "@/stores/fileSystemStore";

const INITIAL_OUTPUT = [
    "Welcome to macOS Sequoia Terminal",
    "Type 'help' to see available commands.",
    ""
];

export default function Terminal() {
    const [mounted, setMounted] = useState(false);
    const { items, currentFolderId, setCurrentFolder, createFolder, createFile, deleteItem } = useFileSystemStore();
    const [output, setOutput] = useState<string[]>(INITIAL_OUTPUT);
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentFolder = items[currentFolderId] || items.desktop;

    // Get path text
    const getPathString = (folderId: string): string => {
        const parts: string[] = [];
        let curr = items[folderId];
        while (curr) {
            parts.unshift(curr.name);
            curr = curr.parentId ? items[curr.parentId] : (null as any);
        }
        return "~/" + parts.slice(1).join("/");
    };

    const handleCommand = (rawCmd: string) => {
        const trimmed = rawCmd.trim();
        const promptLine = `visitor@portfolio:${getPathString(currentFolderId)}$ ${rawCmd}`;
        const newOutput = [...output, promptLine];

        if (!trimmed) {
            setOutput(newOutput);
            return;
        }

        const args = trimmed.split(/\s+/);
        const cmd = args[0].toLowerCase();
        const arg1 = args[1];

        switch (cmd) {
            case "help":
                newOutput.push(
                    "Available commands:",
                    "  ls               - List files and folders in current directory",
                    "  cd <dir>         - Change directory (e.g. cd Desktop, cd ..)",
                    "  pwd              - Print working directory path",
                    "  mkdir <name>     - Create a new directory",
                    "  touch <filename> - Create a new empty text file",
                    "  cat <filename>   - Display contents of a file",
                    "  rm <name>        - Delete a file or folder",
                    "  clear            - Clear terminal screen",
                    "  whoami           - Display current user",
                    "  date             - Display current date and time",
                    "  neofetch         - Display system architecture overview"
                );
                break;

            case "ls": {
                const children = Object.values(items).filter((i) => i.parentId === currentFolderId);
                if (children.length === 0) {
                    newOutput.push("(empty directory)");
                } else {
                    const formatted = children
                        .map((c) => (c.type === "folder" ? `${c.name}/` : c.name))
                        .join("  ");
                    newOutput.push(formatted);
                }
                break;
            }

            case "pwd":
                newOutput.push(`/Users/visitor/${getPathString(currentFolderId).replace(/^~\//, "")}`);
                break;

            case "cd":
                if (!arg1 || arg1 === "~") {
                    setCurrentFolder("desktop");
                } else if (arg1 === "..") {
                    if (currentFolder.parentId) {
                        setCurrentFolder(currentFolder.parentId);
                    }
                } else {
                    const targetName = arg1.replace(/\/$/, "");
                    const found = Object.values(items).find(
                        (i) => i.parentId === currentFolderId && i.type === "folder" && i.name.toLowerCase() === targetName.toLowerCase()
                    );
                    if (found) {
                        setCurrentFolder(found.id);
                    } else {
                        newOutput.push(`cd: no such file or directory: ${arg1}`);
                    }
                }
                break;

            case "mkdir":
                if (!arg1) {
                    newOutput.push("mkdir: missing operand");
                } else {
                    createFolder(currentFolderId, arg1);
                    newOutput.push(`directory created: ${arg1}`);
                }
                break;

            case "touch":
                if (!arg1) {
                    newOutput.push("touch: missing file operand");
                } else {
                    createFile(currentFolderId, arg1, "# New file created via Terminal\n");
                    newOutput.push(`file created: ${arg1}`);
                }
                break;

            case "cat":
                if (!arg1) {
                    newOutput.push("cat: missing file operand");
                } else {
                    const file = Object.values(items).find(
                        (i) => i.parentId === currentFolderId && i.name.toLowerCase() === arg1.toLowerCase()
                    );
                    if (!file) {
                        newOutput.push(`cat: ${arg1}: No such file or directory`);
                    } else if (file.type === "folder") {
                        newOutput.push(`cat: ${arg1}: Is a directory`);
                    } else {
                        newOutput.push(file.content || "(empty file)");
                    }
                }
                break;

            case "rm":
                if (!arg1) {
                    newOutput.push("rm: missing operand");
                } else {
                    const itemToDelete = Object.values(items).find(
                        (i) => i.parentId === currentFolderId && i.name.toLowerCase() === arg1.toLowerCase()
                    );
                    if (!itemToDelete) {
                        newOutput.push(`rm: cannot remove '${arg1}': No such file or directory`);
                    } else {
                        deleteItem(itemToDelete.id);
                        newOutput.push(`removed '${arg1}'`);
                    }
                }
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
                    "  Shell: zsh 5.9 (Integrated VFS)",
                    "  Terminal: iTerm2",
                    "  CPU: Apple M3 Max",
                    "  Memory: 64GB"
                );
                break;

            default:
                newOutput.push(`zsh: command not found: ${cmd}`);
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

    if (!mounted) return null;

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
                <span className="text-blue-400">visitor@portfolio:{getPathString(currentFolderId)}$</span>
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
