"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFileSystemStore, FSItem } from "@/stores/fileSystemStore";
import { useCTFStore } from "@/stores/ctfStore";
import { isRevealed, isVisible } from "@/lib/ctf-visibility";
import { applyChallengeSuccess } from "@/lib/ctf-actions";
import { FINAL_PHOTO_CLUE } from "@/lib/ctf-content";
import PasswordModal from "@/components/ctf/PasswordModal";
import type { VerifyResult } from "@/lib/ctf-client";

const INITIAL_OUTPUT = [
    "IGC Internal System – Terminal v3.0",
    "SECURITY BREACH INVESTIGATION MODE",
    "Type 'help' to see available commands.",
    "",
];

export default function Terminal() {
    const [mounted, setMounted] = useState(false);
    const { items, currentFolderId, setCurrentFolder, createFolder, createFile, deleteItem } = useFileSystemStore();
    const { unlockedFiles, stage, advanceStage } = useCTFStore();
    const [output, setOutput] = useState<string[]>(INITIAL_OUTPUT);
    const [input, setInput] = useState("");
    const [pendingUnlock, setPendingUnlock] = useState<FSItem | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentFolder = items[currentFolderId] || items.igc;

    // Get path text
    const getPathString = (folderId: string): string => {
        const parts: string[] = [];
        let curr = items[folderId];
        while (curr) {
            parts.unshift(curr.name);
            curr = curr.parentId ? items[curr.parentId] : (null as any);
        }
        // parts = [Macintosh HD, home, igc, ...]: report the absolute path.
        const relative = parts.slice(2);
        return relative.length ? `/home/${relative.join("/")}` : "/home";
    };

    /** Resolves an absolute (/home/igc/Logs) or relative path to a folder id. */
    const resolveFolder = (raw: string): string | null => {
        const cleaned = raw.trim().replace(/\/+$/, "");
        if (!cleaned || cleaned === ".") return currentFolderId;
        if (cleaned === "~") return "igc";

        let folderId: string;
        let segments: string[];
        if (cleaned.startsWith("/")) {
            const parts = cleaned.split("/").filter(Boolean);
            if (parts[0] !== "home" || parts[1] !== "igc") return null;
            folderId = "igc";
            segments = parts.slice(2);
        } else {
            folderId = currentFolderId;
            segments = cleaned.split("/").filter(Boolean);
        }

        for (const segment of segments) {
            if (segment === ".") continue;
            if (segment === "..") {
                const parent = items[folderId]?.parentId;
                if (!parent) return null;
                folderId = parent;
                continue;
            }
            const found = Object.values(items).find(
                (i) =>
                    i.parentId === folderId &&
                    i.type === "folder" &&
                    i.name.toLowerCase() === segment.toLowerCase() &&
                    isRevealed(i, stage)
            );
            if (!found) return null;
            folderId = found.id;
        }
        return folderId;
    };

    const handleUnlockSuccess = useCallback(
        (item: FSItem, data: VerifyResult) => {
            applyChallengeSuccess(item, data);
            setOutput((prev) => [
                ...prev,
                `✓ File unlocked: ${item.name}`,
                `  You can now read it with: cat ${item.name}`,
            ]);
        },
        []
    );

    /**
     * Finds a child of the current folder. Progression decides whether the item
     * exists at all; dot-files are reachable by name (cd .evidence) even when the
     * listing hides them.
     */
    const findChild = (name: string) =>
        Object.values(items).find(
            (i) =>
                i.parentId === currentFolderId &&
                i.name.toLowerCase() === name.toLowerCase() &&
                isRevealed(i, stage)
        );

    const handleCommand = (rawCmd: string) => {
        const trimmed = rawCmd.trim();
        const promptLine = `analyst@igc-system:${getPathString(currentFolderId)}$ ${rawCmd}`;
        const newOutput = [...output, promptLine];

        if (!trimmed) {
            setOutput(newOutput);
            return;
        }

        const args = trimmed.split(/\s+/);
        const cmd = args[0].toLowerCase();
        const arg1 = args[1];
        const flags = args.slice(1).filter((a) => a.startsWith("-")).map((a) => a.toLowerCase());
        const showAll = flags.includes("-a") || flags.includes("-la") || flags.includes("-al");
        const longFormat = flags.includes("-la") || flags.includes("-al") || flags.includes("-l");

        switch (cmd) {
            case "help":
                newOutput.push(
                    "Available commands:",
                    "  ls               - List files and folders (hidden files excluded)",
                    "  ls -a            - List all files including hidden ones (dot-folders)",
                    "  ls -la           - List all files with details",
                    "  cd <dir>         - Change directory (e.g. cd Documents, cd .evidence, cd ..)",
                    "  pwd              - Print working directory path",
                    "  mkdir <name>     - Create a new directory",
                    "  touch <filename> - Create a new empty text file",
                    "  cat <filename>   - Display contents of a file",
                    "  rm <name>        - Delete a file or folder",
                    "  unlock <filename>- Unlock a password-protected file",
                    "  open <filename>  - Open a file (unlock if needed)",
                    "  clear            - Clear terminal screen",
                    "  whoami           - Display current user",
                    "  date             - Display current date and time",
                    "  neofetch         - Display system info",
                    "",
                    "Hint: 'ls' hides dot-folders. Try 'ls -a' to reveal them."
                );
                break;

            case "ls": {
                const pathArg = args.slice(1).find((a) => !a.startsWith("-"));
                const targetId = pathArg ? resolveFolder(pathArg) : currentFolderId;
                if (!targetId) {
                    newOutput.push(`ls: ${pathArg}: No such file or directory`);
                    break;
                }
                const children = Object.values(items).filter((i) => i.parentId === targetId);

                // Visibility: progression first (never bypassed), then -a for dot-files.
                const visible = children.filter((i) =>
                    isVisible(i, { stage, showHidden: showAll })
                );

                if (visible.length === 0) {
                    newOutput.push("(empty directory)");
                } else if (longFormat) {
                    // ls -la: show details
                    newOutput.push("total " + visible.length);
                    visible.forEach((c) => {
                        const type = c.type === "folder" ? "d" : "-";
                        const perms = c.locked && !unlockedFiles.includes(c.id) ? "r--------" : "rwxr-xr-x";
                        const size = c.size || (c.content ? `${c.content.length}B` : "0B");
                        const name = c.type === "folder" ? `${c.name}/` : c.name;
                        const hidden = c.hidden ? " [hidden]" : "";
                        newOutput.push(`${type}${perms}  1 analyst  staff  ${size.padStart(8)}  ${name}${hidden}`);
                    });
                } else {
                    // ls or ls -a: simple listing
                    const formatted = visible
                        .map((c) => (c.type === "folder" ? `${c.name}/` : c.name))
                        .join("  ");
                    newOutput.push(formatted);
                }
                break;
            }

            case "pwd":
                newOutput.push(getPathString(currentFolderId));
                break;

            case "cd":
                if (!arg1 || arg1 === "~") {
                    setCurrentFolder("igc");
                } else {
                    // resolveFolder enforces isRevealed per segment, so dot-folders
                    // stay unreachable by path until stage 6.
                    const target = resolveFolder(arg1);
                    if (target && items[target]?.type === "folder") {
                        setCurrentFolder(target);
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

            case "cat": {
                if (!arg1) {
                    newOutput.push("cat: missing file operand");
                } else {
                    const file = findChild(arg1);
                    if (!file) {
                        newOutput.push(`cat: ${arg1}: No such file or directory`);
                    } else if (file.type === "folder") {
                        newOutput.push(`cat: ${arg1}: Is a directory`);
                    } else if (file.locked && !unlockedFiles.includes(file.id)) {
                        newOutput.push(
                            `cat: ${arg1}: Permission denied – File is locked. Use 'unlock ${arg1}' to access it.`
                        );
                    } else {
                        // Reading the log is what opens the evidence stage.
                        if (file.id === "last-activity-log") advanceStage(6);
                        newOutput.push(file.content || "(empty file)");
                    }
                }
                break;
            }

            case "unlock": {
                if (!arg1) {
                    newOutput.push("unlock: missing filename");
                } else {
                    const file = findChild(arg1);
                    if (!file) {
                        newOutput.push(`unlock: ${arg1}: No such file or directory`);
                    } else if (!file.locked) {
                        newOutput.push(`unlock: ${arg1}: File is not locked`);
                    } else if (unlockedFiles.includes(file.id)) {
                        newOutput.push(`unlock: ${arg1}: File is already unlocked`);
                    } else {
                        newOutput.push(`Opening password prompt for: ${arg1}`);
                        setOutput(newOutput);
                        setPendingUnlock(file);
                        return;
                    }
                }
                break;
            }

            case "open": {
                if (!arg1) {
                    newOutput.push("open: missing filename");
                } else {
                    const file = findChild(arg1);
                    if (!file) {
                        newOutput.push(`open: ${arg1}: No such file or directory`);
                    } else if (file.locked && !unlockedFiles.includes(file.id)) {
                        newOutput.push(`File is locked. Opening unlock prompt for: ${arg1}`);
                        setOutput(newOutput);
                        setPendingUnlock(file);
                        return;
                    } else if (file.type === "folder") {
                        setCurrentFolder(file.id);
                    } else {
                        if (file.id === "last-activity-log") advanceStage(6);
                        newOutput.push(`Opening ${file.name}...`, file.content || "(empty file)");
                    }
                }
                break;
            }

            case "rm": {
                if (!arg1) {
                    newOutput.push("rm: missing operand");
                } else {
                    const itemToDelete = findChild(arg1);
                    if (!itemToDelete) {
                        newOutput.push(`rm: cannot remove '${arg1}': No such file or directory`);
                    } else if (itemToDelete.isSystem) {
                        newOutput.push(`rm: cannot remove '${arg1}': Operation not permitted`);
                    } else {
                        deleteItem(itemToDelete.id);
                        newOutput.push(`removed '${arg1}'`);
                    }
                }
                break;
            }

            case "clear":
                setOutput([]);
                return;

            case "whoami":
                newOutput.push("analyst");
                break;

            case "date":
                newOutput.push(new Date().toString());
                break;

            case "neofetch":
                newOutput.push(
                    "igc@igc-system",
                    "----------------",
                    "OS: IGC Internal System v3.0",
                    "Kernel: IGC-SEC 6.1.0-insider",
                    "Shell: igcsh 5.2.1",
                    "Terminal: IGC Terminal",
                    "Status: SECURITY BREACH DETECTED"
                );
                break;

            default:
                newOutput.push(`igcsh: command not found: ${cmd}`);
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
                <span className="text-blue-400">analyst@igc-system:{getPathString(currentFolderId)}$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-green-500 caret-white"
                    autoFocus
                />
            </form>

            {pendingUnlock && (
                <PasswordModal
                    isOpen
                    challenge={pendingUnlock.challenge ?? "classified_file"}
                    fileName={pendingUnlock.name}
                    clue={pendingUnlock.challenge === "final_photo" ? FINAL_PHOTO_CLUE : undefined}
                    onSuccess={(data) => {
                        handleUnlockSuccess(pendingUnlock, data);
                        setPendingUnlock(null);
                    }}
                    onClose={() => setPendingUnlock(null)}
                />
            )}
        </div>
    );
}
