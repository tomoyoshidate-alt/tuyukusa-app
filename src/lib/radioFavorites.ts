export type MediaPlatform = "spotify" | "youtube" | "itunes" | "other";

export type MediaFavorite = {
  id: string;
  title: string;
  url: string;
  platform: MediaPlatform;
};

export type RadioSettings = {
  favorites: MediaFavorite[];
  activeFavoriteId: string | null;
};

export const TSUYUKUSA_RADIO_URL = "https://podcasters.spotify.com/pod/show/tsuyuraji";
export const TSUYUKUSA_RADIO_TITLE = "つゆくさラジオ";

export const INITIAL_RADIO_SETTINGS: RadioSettings = {
  favorites: [],
  activeFavoriteId: null,
};

export function detectMediaPlatform(url: string): MediaPlatform {
  const lower = url.toLowerCase();
  if (lower.includes("spotify.com") || lower.includes("podcasters.spotify.com")) return "spotify";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("apple.com") || lower.includes("itunes.apple.com") || lower.includes("podcasts.apple.com")) {
    return "itunes";
  }
  return "other";
}

export function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    if (parsed.hostname.includes("open.spotify.com")) {
      const path = parsed.pathname.replace(/^\/+/, "");
      if (path.startsWith("embed/")) return parsed.toString();
      return `https://open.spotify.com/embed/${path}${parsed.search}`;
    }
    if (parsed.hostname.includes("podcasters.spotify.com")) {
      const match = parsed.pathname.match(/\/pod\/show\/([^/]+)/);
      if (match?.[1]) {
        return `https://open.spotify.com/embed/show/${match[1]}`;
      }
    }
    if (parsed.hostname.includes("podcasts.apple.com")) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeRadioSettings(data: unknown): RadioSettings {
  if (!data || typeof data !== "object") return INITIAL_RADIO_SETTINGS;
  const d = data as Partial<RadioSettings>;
  const favorites = Array.isArray(d.favorites)
    ? d.favorites
        .filter(
          (f): f is MediaFavorite =>
            !!f &&
            typeof f === "object" &&
            typeof (f as MediaFavorite).id === "string" &&
            typeof (f as MediaFavorite).title === "string" &&
            typeof (f as MediaFavorite).url === "string"
        )
        .slice(0, 20)
    : [];
  return {
    favorites,
    activeFavoriteId: typeof d.activeFavoriteId === "string" ? d.activeFavoriteId : null,
  };
}
