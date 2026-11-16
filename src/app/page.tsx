"use client";

import { useEffect, useState } from "react";
import BootSequence from "@/components/system/BootSequence";
import Desktop from "@/components/system/Desktop";
import ResetModal from "@/components/system/ResetModal";
import { useResetShortcut } from "@/hooks/useResetShortcut";
import { hasSession } from "@/lib/session";

export default function Home() {
    const [booting, setBooting] = useState(true);
    const [ready, setReady] = useState(false);

    // A refresh in the same tab keeps the machine unlocked (sessionStorage).
    useEffect(() => {
        if (hasSession()) setBooting(false);
        setReady(true);
    }, []);

    const reset = useResetShortcut(() => setBooting(true));

    if (!ready) {
        return <div className="h-screen w-screen bg-black" />;
    }

    return (
        <>
            {booting ? (
                <BootSequence onComplete={() => setBooting(false)} />
            ) : (
                <main className="relative h-screen w-screen overflow-hidden">
                    <Desktop />
                </main>
            )}
            <ResetModal isOpen={reset.isOpen} onConfirm={reset.confirm} onCancel={reset.cancel} />
        </>
    );
}
