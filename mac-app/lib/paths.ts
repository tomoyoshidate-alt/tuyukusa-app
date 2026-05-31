import path from "path";

export function repoPublicDir(): string {
  return path.join(process.cwd(), "..", "public");
}

export function presetsDir(): string {
  return path.join(repoPublicDir(), "presets");
}

export function audioDir(): string {
  return path.join(repoPublicDir(), "audio");
}

export const IS_VERCEL = process.env.VERCEL === "1";
