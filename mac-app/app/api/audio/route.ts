import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { audioDir } from "@mac/lib/paths";

export async function GET() {
  try {
    const dir = audioDir();
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ files: [] });
    }
    const files = fs
      .readdirSync(dir)
      .filter(f => /\.(mp3|wav|ogg|m4a|aac)$/i.test(f))
      .sort();
    return NextResponse.json({ files });
  } catch (err) {
    console.error("[audio list]", err);
    return NextResponse.json({ files: [], error: "Failed to list audio" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Upload via public/audio folder" }, { status: 405 });
}
