import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyUnlockProof } from "@/lib/ctf-proof";
import { storeToken } from "@/lib/ctf-tokens";
import { attemptLimit, checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Exchanges a server-signed final_photo unlock proof for a fresh single-use
 * token for evidence_03. This is the only way to recover from a refresh that
 * consumed the original token before a large image could be cached.
 */
export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (!checkRateLimit(`${ip}:proof-redeem`, attemptLimit())) {
        return NextResponse.json(
            { ok: false, error: "Too many attempts. Try again in a minute." },
            { status: 429 }
        );
    }

    let body: { proof?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    if (!verifyUnlockProof(body?.proof, "3")) {
        return NextResponse.json({ ok: false, error: "Invalid unlock proof." }, { status: 403 });
    }

    const token = randomUUID();
    storeToken(token, [3]);
    return NextResponse.json({ ok: true, token });
}
