import { Search, Plus, SlidersHorizontal } from "lucide-react";

export default function Photos() {
    return (
        <div className="flex h-full w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-48 bg-gray-50 dark:bg-black/50 border-r border-gray-200 dark:border-white/10 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Library</div>
                <div className="space-y-1 mb-6">
                    {['Photos', 'Moments', 'Collections', 'Years'].map((item) => (
                        <div key={item} className="px-2 py-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-default text-sm">
                            {item}
                        </div>
                    ))}
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">Albums</div>
                <div className="space-y-1">
                    {['Favorites', 'Recents', 'Screenshots'].map((item) => (
                        <div key={item} className="px-2 py-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-default text-sm flex items-center justify-between">
                            {item}
                            <span className="text-xs text-gray-400">0</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <div className="h-12 border-b border-gray-200 dark:border-white/10 flex items-center px-4 justify-between bg-gray-50/50 dark:bg-black/20">
                    <div className="flex bg-black/5 dark:bg-white/5 rounded-md p-1">
                        <button className="px-3 py-1 text-xs rounded shadow-sm bg-white dark:bg-black font-medium">Years</button>
                        <button className="px-3 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5">Months</button>
                        <button className="px-3 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5">Days</button>
                        <button className="px-3 py-1 text-xs rounded hover:bg-black/5 dark:hover:bg-white/5">All Photos</button>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <SlidersHorizontal size={16} />
                        <Plus size={16} />
                        <Search size={16} />
                    </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="aspect-square bg-gray-200 dark:bg-zinc-800 rounded-md overflow-hidden relative group">
                                <div className="absolute inset-0 bg-black/10 dark:bg-black/30 group-hover:bg-transparent transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
