import { Gamepad2, Play } from "lucide-react";

export default function Arcade() {
    return (
        <div className="flex flex-col h-full w-full bg-[#1c1c1e] text-white">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#2c2c2e]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Gamepad2 size={24} className="text-white drop-shadow-md" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Apple Arcade</span>
                </div>
                <div className="flex bg-[#1c1c1e]/50 border border-white/10 rounded-full px-4 py-1.5 text-sm gap-4">
                    <button className="text-white font-medium">Discover</button>
                    <button className="text-gray-400 hover:text-white transition-colors">Games</button>
                    <button className="text-gray-400 hover:text-white transition-colors">Categories</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                {/* Hero section */}
                <div className="w-full h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl overflow-hidden relative shadow-2xl mb-12 flex flex-col justify-end p-8">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10 flex items-end justify-between">
                        <div>
                            <div className="text-sm font-bold uppercase tracking-widest text-white/80 mb-2">Editor&apos;s Choice</div>
                            <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Retro Racer</h1>
                            <p className="text-lg text-white/90 max-w-xl">Experience the thrill of 8-bit racing in this remastered classic optimized for modern displays.</p>
                        </div>
                        <button className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                            <Play size={18} className="fill-current" />
                            Play Now
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-6">Popular Right Now</h2>
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="group cursor-pointer">
                                <div className="aspect-[3/4] bg-[#2c2c2e] rounded-xl overflow-hidden relative mb-3 hover:-translate-y-1 transition-transform duration-300 shadow-lg border border-white/5">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="font-semibold text-sm truncate">Game Title {i}</div>
                                <div className="text-xs text-gray-400 mt-0.5">Arcade Classic • Action</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
