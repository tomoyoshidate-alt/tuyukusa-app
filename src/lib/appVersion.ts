import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
export const LAST_APP_VERSION_KEY = "tuyukusa-last-app-version";

export type ChangelogEntry = { version: string; date: string; changes: string[] };

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(n => parseInt(n, 10) || 0);
  const aa = parse(a);
  const bb = parse(b);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const diff = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function readStoredAppVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_APP_VERSION_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAppVersion(version: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_APP_VERSION_KEY, version);
  } catch {
    /* ignore */
  }
}

export async function fetchChangelog(): Promise<ChangelogEntry | null> {
  try {
    const res = await fetch("/CHANGELOG.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as ChangelogEntry;
    if (!data?.version || !Array.isArray(data.changes)) return null;
    return data;
  } catch {
    return null;
  }
}

export function isAppUpdateAvailable(storedVersion: string | null, currentVersion = APP_VERSION): boolean {
  if (!storedVersion) return false;
  return compareVersions(storedVersion, currentVersion) < 0;
}
