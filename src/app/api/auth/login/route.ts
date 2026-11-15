import { NextResponse } from "next/server";
import crypto from "crypto";

// Expected password SHA-256 hash: "8d21cc2b84ee17ce05c403a1a95bd2905aec4e476fba6cdfbeb9eb5d02a76d8e" (IGC-2018)
const TARGET_HASH = "8d21cc2b84ee17ce05c403a1a95bd2905aec4e476fba6cdfbeb9eb5d02a76d8e";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password } = body;

        if (!password || typeof password !== "string") {
            return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
        }

        const inputHash = crypto.createHash("sha256").update(password).digest("hex");

        if (inputHash === TARGET_HASH) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
