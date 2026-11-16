import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { consumeToken } from "@/lib/ctf-tokens";

// The route is format agnostic so the organiser can drop real JPEGs in
// private-assets/ and keep the generated PNG placeholders otherwise.
const CANDIDATES: ReadonlyArray<readonly [string, string]> = [
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.nextUrl.searchParams.get("token");

  const { id } = params;

  // Digits only: no traversal, no separators.
  if (!/^\d{1,2}$/.test(id)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const evidenceId = Number(id);
  const baseName = `evidence_${String(evidenceId).padStart(2, "0")}`;
  const directory = path.join(process.cwd(), "private-assets");

  // Resolve the file first so a missing image never burns the player's token.
  let filePath: string | null = null;
  let contentType: string | null = null;
  for (const [extension, type] of CANDIDATES) {
    const candidate = path.join(directory, `${baseName}${extension}`);
    if (path.dirname(candidate) !== directory) continue;
    try {
      await fs.access(candidate);
      filePath = candidate;
      contentType = type;
      break;
    } catch {
      /* try the next extension */
    }
  }

  if (!filePath || !contentType) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!token || !consumeToken(token, evidenceId)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
