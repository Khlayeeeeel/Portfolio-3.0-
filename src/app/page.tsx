"use client";

import { useState } from "react";
import BootSequence from "@/components/system/BootSequence";
import Desktop from "@/components/system/Desktop";

export default function Home() {
    const [booting, setBooting] = useState(true);

    if (booting) {
        return <BootSequence onComplete={() => setBooting(false)} />;
    }

    return (
        <main className="relative h-screen w-screen overflow-hidden">
            <Desktop />
        </main>
    );
}
