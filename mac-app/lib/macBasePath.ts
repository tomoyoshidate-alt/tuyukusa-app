/** Base path when Studio is mounted under the main app (e.g. /mac). Empty for standalone mac-app dev. */
export function getMacBasePath(): string {
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p === "/mac" || p.startsWith("/mac/")) return "/mac";
  }
  return process.env.NEXT_PUBLIC_MAC_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

export function macApiUrl(path: string): string {
  const base = getMacBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
