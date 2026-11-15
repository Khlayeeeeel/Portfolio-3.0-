import { create } from "zustand";
import { persist } from "zustand/middleware";

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

const INITIAL_ITEMS: Record<string, FSItem> = {
    root: {
        id: "root",
        name: "Macintosh HD",
        type: "folder",
        parentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    desktop: {
        id: "desktop",
        name: "Desktop",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    documents: {
        id: "documents",
        name: "Documents",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    downloads: {
        id: "downloads",
        name: "Downloads",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    applications: {
        id: "applications",
        name: "Applications",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    pictures: {
        id: "pictures",
        name: "Pictures",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },
    trash: {
        id: "trash",
        name: "Trash",
        type: "folder",
        parentId: "root",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSystem: true,
    },

    // Initial files inside Desktop
    "resume-pdf": {
        id: "resume-pdf",
        name: "Resume.pdf",
        type: "pdf",
        parentId: "desktop",
        content: "Khalil - Senior Software Engineer\n\nExperience:\n- Full Stack Developer & UI/UX Specialist\n- React, Next.js, TypeScript, Tailwind CSS, Node.js\n\nContact: khalil@portfolio.dev",
        size: "142 KB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    "projects-folder": {
        id: "projects-folder",
        name: "Projects",
        type: "folder",
        parentId: "desktop",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    "welcome-txt": {
        id: "welcome-txt",
        name: "Welcome.txt",
        type: "text",
        parentId: "desktop",
        content: "Welcome to macOS Portfolio 3.0!\n\nYou have full access to this Virtual File System.\n- Create folders and text files\n- Rename, edit, delete or move files\n- Import real files from your computer using the Upload button\n- Open files directly in the built-in Editor / Previewer!",
        size: "1.2 KB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },

    // Files inside Desktop -> Projects
    "portfolio-code": {
        id: "portfolio-code",
        name: "portfolio-v3.tsx",
        type: "code",
        parentId: "projects-folder",
        content: "// Interactive macOS Portfolio Web Application\nimport React from 'react';\n\nexport default function App() {\n  return <div>Welcome to macOS Sequoia</div>;\n}",
        size: "4.5 KB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },

    // Files inside Documents
    "about-me-txt": {
        id: "about-me-txt",
        name: "About_Me.md",
        type: "text",
        parentId: "documents",
        content: "# About Khalil\n\nI am a passionate software developer building intuitive, high-performance web experiences.\n\n### Tech Stack:\n- **Frontend**: React, Next.js, TypeScript, Tailwind CSS, Framer Motion\n- **Backend**: Node.js, Express, PostgreSQL, GraphQL\n- **Tools**: Git, Docker, Figma",
        size: "2.1 KB",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    "ideas-notes": {
        id: "ideas-notes",
        name: "Feature_Ideas.txt",
        type: "text",
        parentId: "documents",
        content: "- Add Virtual File System store (Done!)\n- Full CRUD operations in Finder (Done!)\n- Terminal shell file system integration\n- Drag and drop file upload capability",
        size: "520 B",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
};

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const useFileSystemStore = create<FileSystemState>()(
    persist(
        (set, get) => ({
            items: INITIAL_ITEMS,
            currentFolderId: "desktop",
            history: ["desktop"],
            historyIndex: 0,
            selectedItemIds: [],
            searchQuery: "",

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

            setSearchQuery: (searchQuery: string) => set({ searchQuery }),

            setSelectedItemIds: (selectedItemIds: string[]) => set({ selectedItemIds }),

            toggleSelectItem: (id: string, multi = false) => {
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

            createFolder: (parentId: string, name: string) => {
                const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = new Date().toISOString();
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

            createFile: (parentId: string, name: string, content = "", type: FSItemType = "text") => {
                const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = new Date().toISOString();
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

            deleteItem: (id: string) => {
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
                                updatedAt: new Date().toISOString(),
                            },
                        },
                        selectedItemIds: get().selectedItemIds.filter((itemId) => itemId !== id),
                    });
                }
            },

            renameItem: (id: string, newName: string) => {
                const { items } = get();
                const item = items[id];
                if (!item || !newName.trim()) return;

                set({
                    items: {
                        ...items,
                        [id]: {
                            ...item,
                            name: newName.trim(),
                            updatedAt: new Date().toISOString(),
                        },
                    },
                });
            },

            updateFileContent: (id: string, content: string) => {
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
                            updatedAt: new Date().toISOString(),
                        },
                    },
                });
            },

            moveItem: (id: string, targetFolderId: string) => {
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
                            updatedAt: new Date().toISOString(),
                        },
                    },
                });
            },

            importFile: (parentId: string, name: string, content: string, size?: string, type: FSItemType = "file") => {
                const id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const now = new Date().toISOString();
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
                set({
                    items: INITIAL_ITEMS,
                    currentFolderId: "desktop",
                    history: ["desktop"],
                    historyIndex: 0,
                    selectedItemIds: [],
                    searchQuery: "",
                });
            },
        }),
        {
            name: "macos-filesystem-storage",
        }
    )
);
