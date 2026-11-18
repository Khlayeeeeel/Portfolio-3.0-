"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Folder,
    FileText,
    FileCode,
    FileCheck,
    Image as ImageIcon,
    File,
    Trash2,
    FolderPlus,
    FilePlus,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List as ListIcon,
    Search,
    Upload,
    Download,
    Edit3,
    Eye,
    X,
    Save,
    RotateCcw,
    HardDrive,
    EyeOff,
    Lock
} from "lucide-react";
import { useFileSystemStore, FSItem, FSItemType } from "@/stores/fileSystemStore";
import { useCTFStore } from "@/stores/ctfStore";
import { useWindowStore } from "@/stores/windowStore";
import { isVisible } from "@/lib/ctf-visibility";
import { applyChallengeSuccess } from "@/lib/ctf-actions";
import { FINAL_PHOTO_CLUE } from "@/lib/ctf-content";
import PasswordModal from "@/components/ctf/PasswordModal";

const formatFileSize = (bytes: number): string =>
    bytes < 1024
        ? `${bytes} B`
        : bytes < 1024 * 1024
          ? `${(bytes / 1024).toFixed(1)} KB`
          : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function Finder() {
    const {
        items,
        currentFolderId,
        history,
        historyIndex,
        selectedItemIds,
        searchQuery,
        setCurrentFolder,
        navigateBack,
        navigateForward,
        setSearchQuery,
        setSelectedItemIds,
        toggleSelectItem,
        createFolder,
        createFile,
        deleteItem,
        renameItem,
        updateFileContent,
        importFile,
        resetToDefault,
    } = useFileSystemStore();

    const { stage, showHidden, unlockedFiles, advanceStage } = useCTFStore();
    const { openWindow } = useWindowStore();

    // UI state
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [activeFile, setActiveFile] = useState<FSItem | null>(null);
    const [editorContent, setEditorContent] = useState("");
    const [pendingUnlock, setPendingUnlock] = useState<FSItem | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [newFileName, setNewFileName] = useState("");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item?: FSItem } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isUnlocked = (item: FSItem) => !item.locked || unlockedFiles.includes(item.id);

    // Current folder item
    const currentFolder = items[currentFolderId] || items.desktop;

    // Build breadcrumbs path
    const breadcrumbs = useMemo(() => {
        const path: FSItem[] = [];
        let curr: FSItem | undefined = currentFolder;
        while (curr) {
            path.unshift(curr);
            curr = curr.parentId ? items[curr.parentId] : undefined;
        }
        return path;
    }, [currentFolder, items]);

    // Items inside current folder: progression gate + dot-file toggle + search
    const folderItems = useMemo(() => {
        const list = Object.values(items).filter(
            (item) =>
                item.parentId === currentFolderId &&
                isVisible(item, { stage, showHidden })
        );
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter((item) => item.name.toLowerCase().includes(q));
    }, [items, currentFolderId, searchQuery, stage, showHidden]);

    // Sidebar favourites: only folders that both exist and are revealed
    const favorites = useMemo(() => {
        const base = [
            { id: "desktop", name: "Desktop", icon: "💻" },
            { id: "documents", name: "Documents", icon: "📄" },
            { id: "downloads", name: "Downloads", icon: "📥" },
            { id: "classified-folder", name: "Classified", icon: "🗂️" },
            { id: "logs-folder", name: "Logs", icon: "🧾" },
            { id: "trash", name: "Trash", icon: "🗑️" },
        ];
        return base.filter((fav) => {
            const item = items[fav.id];
            return !!item && isVisible(item, { stage, showHidden });
        });
    }, [items, stage, showHidden]);

    // Get item icon based on type
    const getItemIcon = (type: FSItemType, size: number = 36) => {
        switch (type) {
            case "folder":
                return <Folder size={size} className="text-sky-500 fill-sky-500/20 drop-shadow" />;
            case "pdf":
                return <FileCheck size={size} className="text-red-500 drop-shadow" />;
            case "text":
                return <FileText size={size} className="text-emerald-500 drop-shadow" />;
            case "code":
                return <FileCode size={size} className="text-purple-500 drop-shadow" />;
            case "image":
                return <ImageIcon size={size} className="text-amber-500 drop-shadow" />;
            default:
                return <File size={size} className="text-gray-400 drop-shadow" />;
        }
    };

    // Item count helpers (visible children only)
    const getFolderChildCount = (folderId: string) => {
        return Object.values(items).filter(
            (i) => i.parentId === folderId && isVisible(i, { stage, showHidden })
        ).length;
    };

    // Double click handler: locked files never open, they ask for the password
    const handleDoubleClick = (item: FSItem) => {
        if (!isVisible(item, { stage, showHidden })) return;

        if (!isUnlocked(item)) {
            setPendingUnlock(item);
            return;
        }

        if (item.type === "folder") {
            setCurrentFolder(item.id);
            return;
        }

        // Reading the log is what opens the hidden evidence stage.
        if (item.id === "last-activity-log") advanceStage(6);

        setActiveFile(item);
        setEditorContent(item.content || "");
    };

    // Trigger file download
    const handleDownloadFile = (item: FSItem) => {
        const content = item.content || "";
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // File Upload Handler (Import from PC)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            const ext = file.name.split(".").pop()?.toLowerCase() || "";

            let itemType: FSItemType = "file";
            if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) itemType = "image";
            else if (["txt", "md", "json", "csv", "log"].includes(ext)) itemType = "text";
            else if (["js", "ts", "tsx", "jsx", "html", "css", "py"].includes(ext)) itemType = "code";
            else if (ext === "pdf") itemType = "pdf";

            if (itemType === "image" && file.size < 5000000) {
                reader.readAsDataURL(file);
                reader.onload = () => {
                    importFile(currentFolderId, file.name, reader.result as string, `${(file.size / 1024).toFixed(1)} KB`, itemType);
                };
            } else {
                reader.readAsText(file);
                reader.onload = () => {
                    importFile(currentFolderId, file.name, (reader.result as string) || "", `${(file.size / 1024).toFixed(1)} KB`, itemType);
                };
            }
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Right Click Context Menu
    const handleContextMenu = (e: React.MouseEvent, item?: FSItem) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item,
        });
        if (item) {
            setSelectedItemIds([item.id]);
        }
    };

    // Handle Create Folder Submission
    const handleCreateFolderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            createFolder(currentFolderId, newFolderName.trim());
            setNewFolderName("");
            setIsCreatingFolder(false);
        }
    };

    // Handle Create File Submission
    const handleCreateFileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFileName.trim()) {
            let name = newFileName.trim();
            let type: FSItemType = "text";
            if (name.endsWith(".tsx") || name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".py")) type = "code";
            else if (name.endsWith(".pdf")) type = "pdf";
            else if (!name.includes(".")) name += ".txt";

            createFile(currentFolderId, name, "# New Document\nStart typing here...", type);
            setNewFileName("");
            setIsCreatingFile(false);
        }
    };

    // Start inline rename
    const startRename = (item: FSItem) => {
        setRenamingId(item.id);
        setRenameValue(item.name);
        setContextMenu(null);
    };

    const submitRename = (id: string) => {
        if (renameValue.trim()) {
            renameItem(id, renameValue.trim());
        }
        setRenamingId(null);
    };

    if (!mounted) return null;

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full w-full bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-100 select-none overflow-hidden font-sans"
            onClick={() => {
                setContextMenu(null);
                setSelectedItemIds([]);
            }}
            onContextMenu={(e) => handleContextMenu(e)}
        >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/80 dark:border-zinc-800/80 bg-gray-50/70 dark:bg-zinc-900/70 backdrop-blur-md gap-3">
                {/* Nav & Path */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-zinc-800/60 rounded-md p-0.5">
                        <button
                            onClick={navigateBack}
                            disabled={historyIndex <= 0}
                            className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-all"
                            title="Back"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={navigateForward}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-all"
                            title="Forward"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Breadcrumbs Path */}
                    <div className="flex items-center text-xs text-gray-500 dark:text-zinc-400 font-medium overflow-x-auto max-w-[280px] scrollbar-none gap-1">
                        <HardDrive size={14} className="text-gray-400 flex-shrink-0" />
                        {breadcrumbs.map((folder, index) => (
                            <React.Fragment key={folder.id}>
                                {index > 0 && <span className="text-gray-300 dark:text-zinc-600">/</span>}
                                <button
                                    onClick={() => setCurrentFolder(folder.id)}
                                    className={`hover:text-blue-500 transition-colors whitespace-nowrap ${
                                        folder.id === currentFolderId ? "text-zinc-900 dark:text-zinc-100 font-semibold" : ""
                                    }`}
                                >
                                    {folder.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1 bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-md text-xs w-32 focus:w-44 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 bg-gray-200/50 dark:bg-zinc-800/50 p-1 rounded-lg">
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-white dark:hover:bg-zinc-700 rounded text-xs font-medium text-gray-700 dark:text-zinc-200 transition"
                            title="New Folder"
                        >
                            <FolderPlus size={14} className="text-sky-500" />
                            <span className="hidden sm:inline">Folder</span>
                        </button>
                        <button
                            onClick={() => setIsCreatingFile(true)}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-white dark:hover:bg-zinc-700 rounded text-xs font-medium text-gray-700 dark:text-zinc-200 transition"
                            title="New Text File"
                        >
                            <FilePlus size={14} className="text-emerald-500" />
                            <span className="hidden sm:inline">File</span>
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-white dark:hover:bg-zinc-700 rounded text-xs font-medium text-gray-700 dark:text-zinc-200 transition"
                            title="Upload File"
                        >
                            <Upload size={14} className="text-purple-500" />
                            <span className="hidden sm:inline">Upload</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                        />

                        {selectedItemIds.length > 0 && (
                            <button
                                onClick={() =>
                                    selectedItemIds
                                        .filter((id) => items[id] && !items[id].isSystem && isVisible(items[id], { stage, showHidden }))
                                        .forEach((id) => deleteItem(id))
                                }
                                className="flex items-center gap-1 px-2 py-1 hover:bg-red-500 hover:text-white rounded text-xs font-medium text-red-600 dark:text-red-400 transition"
                                title="Delete Selected"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center bg-gray-200/50 dark:bg-zinc-800/50 p-0.5 rounded-md">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1 rounded ${viewMode === "grid" ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500" : "text-gray-500 dark:text-zinc-400"}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1 rounded ${viewMode === "list" ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-500" : "text-gray-500 dark:text-zinc-400"}`}
                            title="List View"
                        >
                            <ListIcon size={15} />
                        </button>
                    </div>

                    <button
                        onClick={resetToDefault}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition"
                        title="Reset File System"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* Main Area (Sidebar + File View) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-gray-50/80 dark:bg-zinc-950/60 border-r border-gray-200/80 dark:border-zinc-800/80 p-3 flex flex-col justify-between flex-shrink-0">
                    <div className="space-y-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-2 mb-1">
                                Favorites
                            </div>
                            <div className="space-y-0.5">
                                {favorites.map((fav) => {
                                    const isActive = currentFolderId === fav.id;
                                    const childCount = getFolderChildCount(fav.id);
                                    return (
                                        <button
                                            key={fav.id}
                                            onClick={() => setCurrentFolder(fav.id)}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                isActive
                                                    ? "bg-blue-500 text-white shadow-sm"
                                                    : "text-gray-700 dark:text-zinc-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800/60"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{fav.icon}</span>
                                                <span>{fav.name}</span>
                                            </div>
                                            {childCount > 0 && (
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                        isActive
                                                            ? "bg-white/20 text-white"
                                                            : "bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                                    }`}
                                                >
                                                    {childCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`p-2 border rounded-xl text-[11px] flex items-center gap-2 ${
                            showHidden
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        }`}
                    >
                        {showHidden ? <Eye size={16} className="flex-shrink-0" /> : <EyeOff size={16} className="flex-shrink-0" />}
                        <span>
                            {showHidden
                                ? "Hidden files shown. Ctrl/Cmd + Shift + . to hide them again."
                                : "Hidden files are hidden. Ctrl/Cmd + Shift + . to reveal dot-files."}
                        </span>
                    </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto p-4 relative" onClick={() => setSelectedItemIds([])}>
                    {/* New Folder Modal Prompt */}
                    {isCreatingFolder && (
                        <div className="mb-4 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl flex items-center gap-3">
                            <Folder size={24} className="text-sky-500" />
                            <form onSubmit={handleCreateFolderSubmit} className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Folder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    className="flex-1 px-3 py-1 bg-white dark:bg-zinc-800 border border-sky-300 dark:border-sky-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white text-xs rounded-md font-medium"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingFolder(false)}
                                    className="px-3 py-1 bg-gray-200 dark:bg-zinc-800 text-xs rounded-md"
                                >
                                    Cancel
                                </button>
                            </form>
                        </div>
                    )}

                    {/* New File Modal Prompt */}
                    {isCreatingFile && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3">
                            <FileText size={24} className="text-emerald-500" />
                            <form onSubmit={handleCreateFileSubmit} className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="File Name (e.g. note.txt, script.js)"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    className="flex-1 px-3 py-1 bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-md font-medium"
                                >
                                    Create File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatingFile(false)}
                                    className="px-3 py-1 bg-gray-200 dark:bg-zinc-800 text-xs rounded-md"
                                >
                                    Cancel
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Folder Empty State */}
                    {folderItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-zinc-500">
                            <Folder size={64} strokeWidth={1} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">Folder is Empty</p>
                            <p className="text-xs mt-1">Right-click or use toolbar buttons to create folders or files.</p>
                        </div>
                    ) : viewMode === "grid" ? (
                        /* Grid View */
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {folderItems.map((item) => {
                                const isSelected = selectedItemIds.includes(item.id);
                                const locked = !isUnlocked(item);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelectItem(item.id, e.metaKey || e.ctrlKey);
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            handleDoubleClick(item);
                                        }}
                                        onContextMenu={(e) => handleContextMenu(e, item)}
                                        className={`group relative flex flex-col items-center p-3 rounded-xl cursor-default transition-all border ${
                                            isSelected
                                                ? "bg-blue-500/15 border-blue-500/40 shadow-sm"
                                                : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="mb-2 transition-transform group-hover:scale-105 relative">
                                            {getItemIcon(item.type, 44)}
                                            {locked && (
                                                <span className="absolute -right-1 -bottom-1 rounded-full bg-zinc-900/90 p-0.5">
                                                    <Lock size={10} className="text-amber-300" />
                                                </span>
                                            )}
                                        </div>

                                        {renamingId === item.id && !item.isSystem ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={() => submitRename(item.id)}
                                                onKeyDown={(e) => e.key === "Enter" && submitRename(item.id)}
                                                className="text-xs text-center bg-white dark:bg-zinc-800 border border-blue-500 rounded px-1 w-full focus:outline-none"
                                            />
                                        ) : (
                                            <span
                                                className={`text-xs text-center line-clamp-2 break-all max-w-full font-medium ${
                                                    isSelected ? "text-blue-600 dark:text-blue-400 font-semibold" : ""
                                                } ${item.hidden ? "opacity-60 italic" : ""}`}
                                            >
                                                {item.name}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* List View */
                        <div className="w-full">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 font-medium">
                                        <th className="pb-2 pl-2">Name</th>
                                        <th className="pb-2">Type</th>
                                        <th className="pb-2">Size</th>
                                        <th className="pb-2">Date Modified</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {folderItems.map((item) => {
                                        const isSelected = selectedItemIds.includes(item.id);
                                        const locked = !isUnlocked(item);
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectItem(item.id, e.metaKey || e.ctrlKey);
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDoubleClick(item);
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, item)}
                                                className={`border-b border-gray-100 dark:border-zinc-800/40 cursor-default transition-colors ${
                                                    isSelected
                                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold"
                                                        : "hover:bg-gray-100/70 dark:hover:bg-zinc-800/50"
                                                }`}
                                            >
                                                <td className="py-2 pl-2 flex items-center gap-2">
                                                    {getItemIcon(item.type, 18)}
                                                    {item.hidden && <EyeOff size={12} className="text-gray-400" />}
                                                    {locked && <Lock size={12} className="text-amber-500" />}
                                                    {renamingId === item.id && !item.isSystem ? (
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={() => submitRename(item.id)}
                                                            onKeyDown={(e) => e.key === "Enter" && submitRename(item.id)}
                                                            className="text-xs bg-white dark:bg-zinc-800 border border-blue-500 rounded px-1 focus:outline-none"
                                                        />
                                                    ) : (
                                                        <span>{item.name}</span>
                                                    )}
                                                </td>
                                                <td className="py-2 uppercase text-gray-400 text-[10px]">{item.type}</td>
                                                <td className="py-2 text-gray-400">{item.size || "--"}</td>
                                                <td className="py-2 text-gray-400">
                                                    {new Date(item.updatedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu Popup */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl py-1.5 w-44 text-xs font-medium text-gray-800 dark:text-zinc-200"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.item ? (
                        <>
                            <button
                                onClick={() => {
                                    handleDoubleClick(contextMenu.item!);
                                    setContextMenu(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                <Eye size={14} /> Open / Edit
                            </button>
                            {!contextMenu.item.isSystem && (
                                <button
                                    onClick={() => startRename(contextMenu.item!)}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                                >
                                    <Edit3 size={14} /> Rename
                                </button>
                            )}
                            {contextMenu.item.type !== "folder" && !contextMenu.item.locked && (
                                <button
                                    onClick={() => {
                                        handleDownloadFile(contextMenu.item!);
                                        setContextMenu(null);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                                >
                                    <Download size={14} /> Download File
                                </button>
                            )}
                            {!contextMenu.item.isSystem && (
                                <>
                                    <div className="my-1 border-t border-gray-200 dark:border-zinc-700" />
                                    <button
                                        onClick={() => {
                                            deleteItem(contextMenu.item!.id);
                                            setContextMenu(null);
                                        }}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete / Trash
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsCreatingFolder(true);
                                    setContextMenu(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                <FolderPlus size={14} /> New Folder
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreatingFile(true);
                                    setContextMenu(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                <FilePlus size={14} /> New File
                            </button>
                            <button
                                onClick={() => {
                                    fileInputRef.current?.click();
                                    setContextMenu(null);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                <Upload size={14} /> Upload Local File
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Locked file prompt */}
            {pendingUnlock && (
                <PasswordModal
                    isOpen
                    challenge={pendingUnlock.challenge ?? "classified_file"}
                    fileName={pendingUnlock.name}
                    clue={pendingUnlock.challenge === "final_photo" ? FINAL_PHOTO_CLUE : undefined}
                    onSuccess={(data) => {
                        applyChallengeSuccess(pendingUnlock, data);
                        // Only now may the content be shown.
                        setActiveFile(pendingUnlock);
                        setEditorContent(pendingUnlock.content || "");
                        setPendingUnlock(null);
                    }}
                    onClose={() => setPendingUnlock(null)}
                />
            )}

            {/* File Text Editor / Previewer Modal (unlocked files only) */}
            {activeFile && isUnlocked(activeFile) && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[500px] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
                            <div className="flex items-center gap-2">
                                {getItemIcon(activeFile.type, 20)}
                                <span className="font-semibold text-sm">{activeFile.name}</span>
                                <span className="text-xs text-gray-400">
                                    ({formatFileSize(new Blob([activeFile.content || ""]).size)})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeFile.type !== "image" && (
                                    <button
                                        onClick={() => {
                                            updateFileContent(activeFile.id, editorContent);
                                            setActiveFile(null);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-medium transition"
                                    >
                                        <Save size={14} /> Save
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveFile(null)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 p-4 overflow-auto bg-gray-50/50 dark:bg-zinc-900">
                            {activeFile.type === "image" ? (
                                activeFile.content?.startsWith("data:") ? (
                                    <div className="h-full flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={activeFile.content}
                                            alt={activeFile.name}
                                            className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-gray-500 dark:text-zinc-400">
                                        <ImageIcon size={48} strokeWidth={1} className="opacity-50" />
                                        <p className="text-sm font-medium">Protected evidence</p>
                                        <p className="max-w-sm text-xs">
                                            This image is streamed through the protected evidence viewer.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setActiveFile(null);
                                                openWindow("photos", "Photos", "photos");
                                            }}
                                            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
                                        >
                                            Open Photos
                                        </button>
                                    </div>
                                )
                            ) : (
                                <textarea
                                    value={editorContent}
                                    onChange={(e) => setEditorContent(e.target.value)}
                                    className="w-full h-full bg-transparent border-none outline-none font-mono text-xs text-zinc-800 dark:text-zinc-200 resize-none leading-relaxed"
                                    placeholder="Empty file..."
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
