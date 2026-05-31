import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { IS_VERCEL, presetsDir } from "@mac/lib/paths";
import type { PresetStore, BBPreset } from "@mac/lib/types";

const FILE = "bb-presets.json";

function readStore(): PresetStore<BBPreset> {
  const filePath = path.join(presetsDir(), FILE);
  if (!fs.existsSync(filePath)) return { presets: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PresetStore<BBPreset>;
}

export async function GET() {
  try {
    if (IS_VERCEL) {
      const url = new URL("/presets/bb-presets.json", process.env.NEXT_PUBLIC_ASSET_ORIGIN || "https://tuyukusa-app.vercel.app");
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return NextResponse.json(await res.json());
    }
    return NextResponse.json(readStore());
  } catch (err) {
    console.error("[bb presets GET]", err);
    return NextResponse.json({ presets: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PresetStore<BBPreset>;
    if (IS_VERCEL) {
      return NextResponse.json({
        ok: false,
        message: "Vercel上ではファイル直接書き込み不可。エクスポートして public/presets にコミットしてください。",
        data: body,
      });
    }
    const dir = presetsDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, FILE), JSON.stringify(body, null, 2), "utf8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bb presets POST]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
