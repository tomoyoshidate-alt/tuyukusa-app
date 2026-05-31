import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { fetchStorageAudioBuffer, getStoragePublicUrl } from "@mac/lib/audioStorage";
import { isSupabaseConfigured } from "@mac/lib/supabaseClient";
import { audioDir } from "@mac/lib/paths";

function contentTypeFor(ext: string): string {
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  return "application/octet-stream";
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  const filePath = path.join(audioDir(), safe);
  const ext = path.extname(safe).toLowerCase();

  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath);
    return new NextResponse(buf, {
      headers: { "Content-Type": contentTypeFor(ext), "Cache-Control": "public, max-age=3600" },
    });
  }

  if (isSupabaseConfigured()) {
    const publicUrl = getStoragePublicUrl(safe);
    if (publicUrl) {
      const remote = await fetchStorageAudioBuffer(safe);
      if (remote) {
        return new NextResponse(remote, {
          headers: { "Content-Type": contentTypeFor(ext), "Cache-Control": "public, max-age=3600" },
        });
      }
      return NextResponse.redirect(publicUrl, 302);
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
