import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LAST_ACTIVITY_LOG_CONTENT, REVEAL_STAGES } from "@/lib/ctf-content";

export type FSItemType = "folder" | "text" | "pdf" | "image" | "code" | "archive" | "file";

export interface FSItem {
    id: string;
    name: string;
    type: FSItemType;
    parentId: string | null;
    content?: string; // Text content, base64 data, or markdown
    size?: string;
    createdAt: string;
    updatedAt: string;
    isSystem?: boolean; // System folders shouldn't be deleted accidentally
    locked?: boolean;   // file requires password to open
    challenge?: string; // which CTF challenge unlocks this file
    hidden?: boolean;   // dot-file: only listed with the hidden-files toggle
    revealStage?: number; // first CTF stage at which the item exists for the player
}

interface FileSystemState {
    items: Record<string, FSItem>;
    currentFolderId: string;
    history: string[];
    historyIndex: number;
    selectedItemIds: string[];
    searchQuery: string;

    // Actions
    setCurrentFolder: (folderId: string) => void;
    navigateBack: () => void;
    navigateForward: () => void;
    setSearchQuery: (query: string) => void;
    setSelectedItemIds: (ids: string[]) => void;
    toggleSelectItem: (id: string, multi?: boolean) => void;

    // File Operations
    createFolder: (parentId: string, name: string) => string;
    createFile: (parentId: string, name: string, content?: string, type?: FSItemType) => string;
    deleteItem: (id: string) => void;
    renameItem: (id: string, newName: string) => void;
    updateFileContent: (id: string, content: string) => void;
    moveItem: (id: string, targetFolderId: string) => void;
    importFile: (parentId: string, name: string, content: string, size?: string, type?: FSItemType) => string;
    resetToDefault: () => void;
}

const timestamp = () => new Date().toISOString();

const INITIAL_ITEMS: Record<string, FSItem> = {
    // ── System folders ──────────────────────────────────────────────────────
    root: {
        id: "root",
        name: "Macintosh HD",
        type: "folder",
        parentId: null,
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    home: {
        id: "home",
        name: "home",
        type: "folder",
        parentId: "root",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    igc: {
        id: "igc",
        name: "igc",
        type: "folder",
        parentId: "home",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    desktop: {
        id: "desktop",
        name: "Desktop",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    documents: {
        id: "documents",
        name: "Documents",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    downloads: {
        id: "downloads",
        name: "Downloads",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    trash: {
        id: "trash",
        name: "Trash",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    // Classified folder: absent from the tree until classified_file is unlocked.
    "classified-folder": {
        id: "classified-folder",
        name: "Classified",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        locked: false,
        revealStage: REVEAL_STAGES.classifiedFolder,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "logs-folder": {
        id: "logs-folder",
        name: "Logs",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "evidence-folder": {
        id: "evidence-folder",
        name: ".evidence",
        type: "folder",
        parentId: "igc",
        isSystem: true,
        hidden: true,
        revealStage: REVEAL_STAGES.evidenceFolder,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },

    // ── Documents children ───────────────────────────────────────────────────
    "instagram-txt": {
        id: "instagram-txt",
        name: "instagram_account.txt",
        type: "text",
        parentId: "documents",
        content: "Instagram Account:\nhttps://www.instagram.com/igc_officiel/\n\nNote: Monitor this account for recent activity.",
        revealStage: REVEAL_STAGES.instagramAccount,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "classified-file-txt": {
        id: "classified-file-txt",
        name: "classified_file.txt",
        type: "text",
        parentId: "documents",
        locked: true,
        challenge: "classified_file",
        revealStage: REVEAL_STAGES.classifiedFile,
        content: "CLASSIFIED - INTERNAL USE ONLY\n\n[This file is password protected]\nPassword obtained from decrypting the encrypted archive.\n\nCONFIDENTIAL CONTENT:\nThe insider has been identified. The attack was coordinated from within.\nAgent codename: SHADOW\nTarget: IGC Internal Network\nMethod: Social Engineering + Insider Access",
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },

    // ── Classified folder children ───────────────────────────────────────────
    "phone-txt": {
        id: "phone-txt",
        name: "phone_number.txt",
        type: "text",
        parentId: "classified-folder",
        content: "Contact Number (Operator):\n+216 XX XXX XXX\n\nNote: Call this number to obtain confidential data from the telecom operator.",
        revealStage: REVEAL_STAGES.phoneNumber,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "confidential-data-txt": {
        id: "confidential-data-txt",
        name: "confidential_data.txt",
        type: "text",
        parentId: "classified-folder",
        locked: true,
        challenge: "confidential_data",
        revealStage: REVEAL_STAGES.confidentialData,
        content: "CONFIDENTIAL DATA - TELECOM OPERATOR\n\nData obtained from the telecom operator:\nThis file contains sensitive location and timing information related to the security breach.\n\nOpen the Password Vault to cross-check the date, the time and the room.",
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },

    // ── Logs folder children ─────────────────────────────────────────────────
    "last-activity-log": {
        id: "last-activity-log",
        name: "last_activity.log",
        type: "text",
        parentId: "logs-folder",
        // Not a dot-file: from stage 5 it must appear in Finder/Terminal ls and
        // the sidebar count without the hidden-files toggle being enabled.
        hidden: false,
        revealStage: REVEAL_STAGES.lastActivityLog,
        content: LAST_ACTIVITY_LOG_CONTENT,
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },

    // ── Evidence folder children (dot-files, stage 6) ────────────────────────
    "evidence-01": {
        id: "evidence-01",
        name: "evidence_01.jpg",
        type: "image",
        parentId: "evidence-folder",
        hidden: true,
        revealStage: REVEAL_STAGES.evidenceFiles,
        content: "evidence_01",
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "evidence-02": {
        id: "evidence-02",
        name: "evidence_02.jpg",
        type: "image",
        parentId: "evidence-folder",
        hidden: true,
        revealStage: REVEAL_STAGES.evidenceFiles,
        content: "evidence_02",
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
    "evidence-03": {
        id: "evidence-03",
        name: "evidence_03.jpg",
        type: "image",
        parentId: "evidence-folder",
        hidden: true,
        locked: true,
        challenge: "final_photo",
        revealStage: REVEAL_STAGES.evidenceFiles,
        content: "evidence_03",
        createdAt: timestamp(),
        updatedAt: timestamp(),
    },
};

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Items created by the visitor, preserved across VFS migrations. */
const isUserItem = (id: string) => /^(folder|file|imported)-/.test(id);

const defaultTree = () => ({
    items: INITIAL_ITEMS,
    currentFolderId: "igc",
    history: ["igc"],
    historyIndex: 0,
    selectedItemIds: [] as string[],
    searchQuery: "",
});

export const useFileSystemStore = create<FileSystemState>()(
    persist(
        (set, get) => ({
            ...defaultTree(),

            setCurrentFolder: (folderId: string) => {
                const { items, history, historyIndex } = get();
                if (!items[folderId] || items[folderId].type !== "folder") return;

                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(folderId);

                set({
                    currentFolderId: folderId,
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                    selectedItemIds: [],
                });
            },

            navigateBack: () => {
                const { history, historyIndex } = get();
                if (historyIndex > 0) {
                    const nextIndex = historyIndex - 1;
                    set({
                        currentFolderId: history[nextIndex],
                        historyIndex: nextIndex,
                        selectedItemIds: [],
                    });
                }
            },

            navigateForward: () => {
                const { history, historyIndex } = get();
                if (historyIndex < history.length - 1) {
                    const nextIndex = historyIndex + 1;
                    set({
                        currentFolderId: history[nextIndex],
                        historyIndex: nextIndex,
                        selectedItemIds: [],
                    });
                }
            },

            setSearchQuery: (searchQuery) => set({ searchQuery }),

            setSelectedItemIds: (selectedItemIds) => set({ selectedItemIds }),

            toggleSelectItem: (id, multi = false) => {
                const { selectedItemIds } = get();
                if (multi) {
                    if (selectedItemIds.includes(id)) {
                        set({ selectedItemIds: selectedItemIds.filter((item) => item !== id) });
                    } else {
                        set({ selectedItemIds: [...selectedItemIds, id] });
                    }
                } else {
                    set({ selectedItemIds: [id] });
                }
            },

            createFolder: (parentId, name) => {
                const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = timestamp();
                const newFolder: FSItem = {
                    id,
                    name: name.trim() || "Untitled Folder",
                    type: "folder",
                    parentId,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    items: {
                        ...state.items,
                        [id]: newFolder,
                    },
                }));
                return id;
            },

            createFile: (parentId, name, content = "", type = "text") => {
                const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = timestamp();
                const bytes = new Blob([content]).size;
                const newFile: FSItem = {
                    id,
                    name: name.trim() || "New Document.txt",
                    type,
                    parentId,
                    content,
                    size: formatSize(bytes),
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    items: {
                        ...state.items,
                        [id]: newFile,
                    },
                }));
                return id;
            },

            deleteItem: (id) => {
                const { items } = get();
                const item = items[id];
                if (!item || item.isSystem) return; // Protect root system folders

                if (item.parentId === "trash") {
                    // Permanently delete item and child items if folder
                    const itemsToDelete = new Set<string>();
                    const collect = (targetId: string) => {
                        itemsToDelete.add(targetId);
                        Object.values(items).forEach((child) => {
                            if (child.parentId === targetId) collect(child.id);
                        });
                    };
                    collect(id);

                    const newItems = { ...items };
                    itemsToDelete.forEach((key) => delete newItems[key]);

                    set({
                        items: newItems,
                        selectedItemIds: get().selectedItemIds.filter((itemId) => itemId !== id),
                    });
                } else {
                    // Move to Trash folder
                    set({
                        items: {
                            ...items,
                            [id]: {
                                ...item,
                                parentId: "trash",
                                updatedAt: timestamp(),
                            },
                        },
                        selectedItemIds: get().selectedItemIds.filter((itemId) => itemId !== id),
                    });
                }
            },

            renameItem: (id, newName) => {
                const { items } = get();
                const item = items[id];
                if (!item || !newName.trim()) return;

                set({
                    items: {
                        ...items,
                        [id]: {
                            ...item,
                            name: newName.trim(),
                            updatedAt: timestamp(),
                        },
                    },
                });
            },

            updateFileContent: (id, content) => {
                const { items } = get();
                const item = items[id];
                if (!item || item.type === "folder") return;

                const bytes = new Blob([content]).size;
                set({
                    items: {
                        ...items,
                        [id]: {
                            ...item,
                            content,
                            size: formatSize(bytes),
                            updatedAt: timestamp(),
                        },
                    },
                });
            },

            moveItem: (id, targetFolderId) => {
                const { items } = get();
                const item = items[id];
                const targetFolder = items[targetFolderId];
                if (!item || !targetFolder || targetFolder.type !== "folder" || id === targetFolderId) return;

                set({
                    items: {
                        ...items,
                        [id]: {
                            ...item,
                            parentId: targetFolderId,
                            updatedAt: timestamp(),
                        },
                    },
                });
            },

            importFile: (parentId, name, content, size, type = "file") => {
                const id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = timestamp();
                const importedItem: FSItem = {
                    id,
                    name,
                    type,
                    parentId,
                    content,
                    size: size || formatSize(new Blob([content]).size),
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    items: {
                        ...state.items,
                        [id]: importedItem,
                    },
                }));
                return id;
            },

            resetToDefault: () => {
                set({ ...defaultTree() });
            },
        }),
        {
            name: "macos-filesystem-storage",
            version: 3,
            /**
             * Restore/refresh every canonical CTF item from INITIAL_ITEMS (so a
             * stage-5 file that was flagged hidden or stored under a stale version
             * reappears), while keeping every runtime item the visitor created.
             */
            migrate: (persisted) => {
                const previous = (persisted ?? {}) as Partial<FileSystemState>;
                const previousItems = previous.items ?? {};
                const userItems = Object.fromEntries(
                    Object.entries(previousItems).filter(([id]) => isUserItem(id))
                );

                return {
                    ...defaultTree(),
                    // INITIAL_ITEMS first: canonical CTF ids win over stale copies.
                    items: { ...INITIAL_ITEMS, ...userItems },
                };
            },
        }
    )
);
