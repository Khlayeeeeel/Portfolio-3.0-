import { ChevronLeft, ChevronRight, RotateCw, Plus, LayoutGrid, Download, Share } from "lucide-react";

export default function Safari() {
    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-900">
            {/* Nav Bar */}
            <div className="h-12 border-b border-gray-200 dark:border-white/10 flex items-center px-4 gap-4 bg-gray-50/50 dark:bg-black/20">
                <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><ChevronLeft size={16} /></button>
                    <button className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"><ChevronRight size={16} /></button>
                </div>
                <div className="flex-1 max-w-2xl mx-auto flex items-center bg-black/5 dark:bg-black/40 rounded-md px-3 py-1.5 border border-black/5 dark:border-white/5">
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-full text-center flex items-center justify-center gap-2">
                        <span className="text-xs">🔒</span>
                        portfolio.dev
                    </span>
                    <button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 ml-auto"><RotateCw size={14} /></button>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                    <button className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"><Share size={16} /></button>
                    <button className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"><Plus size={16} /></button>
                    <button className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"><LayoutGrid size={16} /></button>
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-8 flex items-center justify-center bg-gray-50 dark:bg-zinc-800">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold dark:text-white">Welcome to Safari</h1>
                    <p className="text-gray-500 dark:text-gray-400">Search or enter website name</p>
                    <div className="h-10 w-full max-w-md mx-auto bg-white dark:bg-black/50 rounded-full border border-gray-200 dark:border-white/10 shadow-sm flex items-center px-4 mt-6" />
                </div>
            </div>
        </div>
    );
}
