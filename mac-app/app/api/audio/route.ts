import { NextResponse } from "next/server";
import fs from "fs";
import { listAllAudioFiles } from "@mac/lib/audioStorage";
import { audioDir } from "@mac/lib/paths";

export async function GET() {
  try {
    const dir = audioDir();
    let local: string[] = [];
    if (fs.existsSync(dir)) {
      local = fs
        .readdirSync(dir)
        .filter(f => /\.(mp3|wav|ogg|m4a|aac)$/i.test(f))
        .sort();
    }
    const files = await listAllAudioFiles(local);
    return NextResponse.json({ files });
  } catch (err) {
    console.error("[audio list]", err);
    return NextResponse.json({ files: [], error: "Failed to list audio" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use Studio UI to upload to Supabase Storage, or place files in public/audio/" },
    { status: 405 }
  );
}
