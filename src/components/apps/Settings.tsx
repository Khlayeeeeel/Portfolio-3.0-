import { Search, Wifi, Bluetooth, Battery, Monitor, User } from "lucide-react";

export default function Settings() {
    return (
        <div className="flex h-full w-full bg-gray-100 dark:bg-zinc-900 text-zinc-900 dark:text-gray-100">
            {/* Sidebar */}
            <div className="w-56 bg-white dark:bg-black/30 border-r border-gray-200 dark:border-white/10 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-white/10">
                    <div className="bg-gray-100 dark:bg-white/5 rounded-md flex items-center px-2 py-1.5 border border-gray-200 dark:border-transparent">
                        <Search size={14} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            className="bg-transparent border-none outline-none text-sm ml-2 w-full"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <div className="flex items-center gap-3 p-2 rounded-md bg-blue-500 text-white cursor-default">
                        <Wifi size={18} />
                        <span className="text-sm font-medium">Wi-Fi</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-default">
                        <Bluetooth size={18} className="text-blue-500" />
                        <span className="text-sm font-medium">Bluetooth</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-default">
                        <Battery size={18} className="text-green-500" />
                        <span className="text-sm font-medium">Battery</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-default mt-4">
                        <Monitor size={18} className="text-blue-400" />
                        <span className="text-sm font-medium">Displays</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-default">
                        <User size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium">Users & Groups</span>
                    </div>
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-10 bg-gray-50 dark:bg-zinc-800">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md">
                            <Wifi size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold">Wi-Fi</h2>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-white/10">
                            <div className="font-medium">Wi-Fi</div>
                            <div className="w-10 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-black/20 text-sm text-gray-500 dark:text-gray-400">
                            Known networks will be joined automatically. If no known networks are available, you will have to manually select a network.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
