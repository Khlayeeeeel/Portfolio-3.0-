import { SquarePen, Trash2, Search } from "lucide-react";

export default function Notes() {
    return (
        <div className="flex h-full w-full bg-[#fbf9f4] dark:bg-[#1e1e1e] text-zinc-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-[#f4f2e8] dark:bg-[#181818] border-r border-[#e6e4d9] dark:border-white/10 flex flex-col">
                <div className="p-4 border-b border-[#e6e4d9] dark:border-white/10 flex justify-between items-center">
                    <span className="font-semibold text-lg">Notes</span>
                    <div className="flex gap-2 text-gray-500">
                        <Trash2 size={18} className="hover:text-red-500 cursor-pointer" />
                        <SquarePen size={18} className="hover:text-yellow-600 cursor-pointer" />
                    </div>
                </div>
                <div className="p-2 border-b border-[#e6e4d9] dark:border-white/10">
                    <div className="bg-black/5 dark:bg-white/5 rounded flex items-center px-2 py-1">
                        <Search size={14} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            className="bg-transparent border-none outline-none text-xs ml-2 w-full"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`p-4 border-b border-[#e6e4d9] dark:border-white/10 cursor-pointer ${i === 1 ? 'bg-yellow-400/20 dark:bg-yellow-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <div className="font-semibold text-sm mb-1">New Note {i}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">No additional text</div>
                            <div className="text-[10px] text-gray-400 mt-2">10:42 AM</div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="text-gray-400 text-sm mb-4">October 24 at 10:42 AM</div>
                <h1 className="text-3xl font-bold mb-4 outline-none" contentEditable>New Note 1</h1>
                <div className="outline-none text-lg leading-relaxed min-h-[50%]" contentEditable>
                    Start typing your note here...
                </div>
            </div>
        </div>
    );
}
