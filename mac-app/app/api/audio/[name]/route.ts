import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { audioDir } from "@mac/lib/paths";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  const filePath = path.join(audioDir(), safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(safe).toLowerCase();
  const type =
    ext === ".mp3" ? "audio/mpeg" : ext === ".wav" ? "audio/wav" : ext === ".ogg" ? "audio/ogg" : "application/octet-stream";
  return new NextResponse(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
}
