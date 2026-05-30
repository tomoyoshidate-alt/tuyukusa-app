export type MediaPlatform = "spotify" | "youtube" | "itunes" | "other";

export type MediaFavorite = {
  id: string;
  title: string;
  url: string;
  platform: MediaPlatform;
};

export type RadioEpisode = {
  id: string;
  title: string;
  pubDate: string;
  duration: string;
  openUrl: string;
  embedUrl: string | null;
  audioUrl: string | null;
};

export type RadioActiveEpisode = {
  id: string;
  title: string;
  openUrl: string;
  embedUrl: string | null;
  audioUrl: string | null;
};

export type RadioSettings = {
  favorites: MediaFavorite[];
  activeFavoriteId: string | null;
  activeEpisode: RadioActiveEpisode | null;
};

/** RSS podcast show metadata */
export const TSUYUKUSA_RADIO_TITLE = "つゆくさラジオ";

export const INITIAL_RADIO_SETTINGS: RadioSettings = {
  favorites: [],
  activeFavoriteId: null,
  activeEpisode: null,
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
    activeEpisode: normalizeActiveEpisode(d.activeEpisode),
  };
}

function normalizeActiveEpisode(data: unknown): RadioActiveEpisode | null {
  if (!data || typeof data !== "object") return null;
  const e = data as Partial<RadioActiveEpisode>;
  if (typeof e.id !== "string" || typeof e.title !== "string" || typeof e.openUrl !== "string") {
    return null;
  }
  return {
    id: e.id,
    title: e.title,
    openUrl: e.openUrl,
    embedUrl: typeof e.embedUrl === "string" ? e.embedUrl : null,
    audioUrl: typeof e.audioUrl === "string" ? e.audioUrl : null,
  };
}
