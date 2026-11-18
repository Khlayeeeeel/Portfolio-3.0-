import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyUnlockProof, type ProofScope } from "@/lib/ctf-proof";
import { storeToken } from "@/lib/ctf-tokens";
import { attemptLimit, checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Exchanges a server-signed unlock proof for a fresh single-use token.
 * Scope "3" comes from final_photo, "gallery" from the vault; both let a
 * refresh recover an image whose original token was already consumed.
 */
export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    let body: { proof?: unknown; scope?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    // The scope is only an evidence id set; it is still restricted server-side.
    const scope: ProofScope = body?.scope === "gallery" ? "gallery" : "3";
    if (!checkRateLimit(`${ip}:proof-redeem:${scope}`, attemptLimit())) {
        return NextResponse.json(
            { ok: false, error: "Too many attempts. Try again in a minute." },
            { status: 429 }
        );
    }

    if (!verifyUnlockProof(body?.proof, scope)) {
        return NextResponse.json({ ok: false, error: "Invalid unlock proof." }, { status: 403 });
    }

    const token = randomUUID();
    storeToken(token, scope === "gallery" ? [1] : [3]);
    return NextResponse.json({ ok: true, token });
}
