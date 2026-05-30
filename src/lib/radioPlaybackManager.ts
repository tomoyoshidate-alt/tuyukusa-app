import {
  configurePlaybackAudioSession,
  sharedBackgroundAudioSession,
} from "@/src/lib/backgroundAudioSession";
import {
  normalizeRadioSettings,
  TSUYUKUSA_RADIO_TITLE,
  TSUYUKUSA_RADIO_URL,
  type RadioSettings,
} from "@/src/lib/radioFavorites";

export type RadioPlaybackSnapshot = {
  isPlaying: boolean;
  title: string;
  embedUrl: string | null;
  audioUrl: string | null;
  openUrl: string;
};

type Listener = (snapshot: RadioPlaybackSnapshot) => void;

const PLAYBACK_STORAGE_KEY = "tuyukusa-radio-playback";

type StoredPlayback = {
  isPlaying: boolean;
  activeFavoriteId: string | null;
  activeEpisodeId: string | null;
};

function resolveSource(
  settings: RadioSettings
): Pick<RadioPlaybackSnapshot, "title" | "embedUrl" | "audioUrl" | "openUrl"> {
  if (settings.activeFavoriteId) {
    const fav = settings.favorites.find(f => f.id === settings.activeFavoriteId);
    if (fav) {
      return {
        title: fav.title,
        openUrl: fav.url,
        embedUrl: null,
        audioUrl: null,
      };
    }
  }

  if (settings.activeEpisode) {
    const ep = settings.activeEpisode;
    return {
      title: ep.title,
      openUrl: ep.openUrl,
      embedUrl: null,
      audioUrl: ep.audioUrl,
    };
  }

  return {
    title: TSUYUKUSA_RADIO_TITLE,
    openUrl: TSUYUKUSA_RADIO_URL,
    embedUrl: null,
    audioUrl: null,
  };
}

function readStoredPlayback(): StoredPlayback | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYBACK_STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as StoredPlayback;
    if (typeof d.isPlaying !== "boolean") return null;
    return {
      isPlaying: d.isPlaying,
      activeFavoriteId: typeof d.activeFavoriteId === "string" ? d.activeFavoriteId : null,
      activeEpisodeId: typeof d.activeEpisodeId === "string" ? d.activeEpisodeId : null,
    };
  } catch {
    return null;
  }
}

function writeStoredPlayback(isPlaying: boolean, settings: RadioSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PLAYBACK_STORAGE_KEY,
      JSON.stringify({
        isPlaying,
        activeFavoriteId: settings.activeFavoriteId,
        activeEpisodeId: settings.activeEpisode?.id ?? null,
      })
    );
  } catch {
    /* ignore */
  }
}

function readRadioSettings(): RadioSettings {
  if (typeof window === "undefined") return normalizeRadioSettings(null);
  try {
    const raw = localStorage.getItem("tuyukusa-radio");
    return normalizeRadioSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeRadioSettings(null);
  }
}

class RadioPlaybackManager {
  private isPlaying = false;
  private title = TSUYUKUSA_RADIO_TITLE;
  private embedUrl: string | null = null;
  private audioUrl: string | null = null;
  private openUrl = TSUYUKUSA_RADIO_URL;
  private activeFavoriteId: string | null = null;
  private listeners = new Set<Listener>();
  private hydrated = false;
  private bgAcquired = false;
  private readonly bgResumeHandler = (): void => {
    void sharedBackgroundAudioSession.resumeAll();
    this.setupMediaSession();
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach(l => l(this.getSnapshot()));
  }

  getSnapshot(): RadioPlaybackSnapshot {
    return {
      isPlaying: this.isPlaying,
      title: this.title,
      embedUrl: this.embedUrl,
      audioUrl: this.audioUrl,
      openUrl: this.openUrl,
    };
  }

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;

    const stored = readStoredPlayback();
    if (!stored?.isPlaying) return;

    const settings = readRadioSettings();
    const source = resolveSource(settings);
    if (!source.audioUrl) return;
    this.activeFavoriteId = settings.activeFavoriteId;
    this.title = source.title;
    this.embedUrl = source.embedUrl;
    this.audioUrl = source.audioUrl;
    this.openUrl = source.openUrl;
    this.isPlaying = true;

    configurePlaybackAudioSession();
    void this.acquireBackgroundSession();
    this.emit();
  }

  async play(settings: RadioSettings): Promise<void> {
    const source = resolveSource(settings);
    if (!source.audioUrl) return;
    this.activeFavoriteId = settings.activeFavoriteId;
    this.title = source.title;
    this.embedUrl = source.embedUrl;
    this.audioUrl = source.audioUrl;
    this.openUrl = source.openUrl;
    this.isPlaying = true;

    configurePlaybackAudioSession();
    await this.acquireBackgroundSession();
    writeStoredPlayback(true, settings);
    this.emit();
  }

  pause(): void {
    this.isPlaying = false;
    this.releaseBackgroundSession();
    this.clearMediaSession();
    writeStoredPlayback(false, readRadioSettings());
    this.emit();
  }

  toggle(settings: RadioSettings): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      void this.play(settings);
    }
  }

  updateSource(settings: RadioSettings): void {
    const source = resolveSource(settings);
    this.activeFavoriteId = settings.activeFavoriteId;
    this.title = source.title;
    this.embedUrl = source.embedUrl;
    this.audioUrl = source.audioUrl;
    this.openUrl = source.openUrl;
    if (this.isPlaying) {
      writeStoredPlayback(true, settings);
      this.setupMediaSession();
    }
    this.emit();
  }

  private async acquireBackgroundSession(): Promise<void> {
    if (this.bgAcquired) {
      await sharedBackgroundAudioSession.resumeAll();
      this.setupMediaSession();
      return;
    }
    await sharedBackgroundAudioSession.acquire(this.bgResumeHandler);
    this.bgAcquired = true;
    this.setupMediaSession();
  }

  private releaseBackgroundSession(): void {
    if (!this.bgAcquired) return;
    sharedBackgroundAudioSession.release(this.bgResumeHandler);
    this.bgAcquired = false;
  }

  private setupMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.title,
        artist: "つゆくさラジオ",
        album: "つゆくさアプリ",
      });
      navigator.mediaSession.playbackState = "playing";
    } catch {
      /* ignore */
    }
  }

  private clearMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    } catch {
      /* ignore */
    }
  }
}

export const radioPlaybackManager = new RadioPlaybackManager();

export { resolveSource as resolveRadioSource };
