import fs from "fs";
import path from "path";

export function repoPublicDir(): string {
  const atRepoRoot = path.join(process.cwd(), "public");
  if (fs.existsSync(atRepoRoot)) return atRepoRoot;
  return path.join(process.cwd(), "..", "public");
}

export function presetsDir(): string {
  return path.join(repoPublicDir(), "presets");
}

export function audioDir(): string {
  return path.join(repoPublicDir(), "audio");
}

export const IS_VERCEL = process.env.VERCEL === "1";
