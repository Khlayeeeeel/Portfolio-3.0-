import { Folder } from "lucide-react";

export default function Finder() {
    return (
        <div className="flex h-full w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-48 bg-gray-100 dark:bg-black/50 border-r border-gray-200 dark:border-white/10 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Favorites</div>
                <div className="space-y-1">
                    {['Recents', 'Applications', 'Desktop', 'Documents', 'Downloads'].map((item) => (
                        <div key={item} className="px-2 py-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-default text-sm flex items-center gap-2">
                            <Folder size={14} className="text-blue-500" />
                            {item}
                        </div>
                    ))}
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-default transition-colors">
                            <Folder size={48} className="text-blue-500 drop-shadow-md" />
                            <span className="text-sm">Folder {i}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
