/** Public silent MP3 loop – keeps iOS AVAudioSession alive in background. */
export const SILENT_AUDIO_URL = "/silent.mp3";

const HIDDEN_AUDIO_ID = "tuyukusa-silent-audio";

function getOrCreateAudioElement(): HTMLAudioElement {
  if (typeof document === "undefined") {
    throw new Error("document unavailable");
  }
  let audio = document.getElementById(HIDDEN_AUDIO_ID) as HTMLAudioElement | null;
  if (audio) return audio;

  audio = document.createElement("audio");
  audio.id = HIDDEN_AUDIO_ID;
  audio.src = SILENT_AUDIO_URL;
  audio.loop = true;
  audio.volume = 0.001;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.setAttribute("x-webkit-airplay", "deny");
  Object.assign(audio.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    opacity: "0.001",
    pointerEvents: "none",
    left: "-9999px",
    top: "-9999px",
  });
  document.body.appendChild(audio);
  return audio;
}

/**
 * Loop silent HTML audio so Web Audio / embed playback survives screen lock on iOS PWA.
 * Must be started from a user gesture (play button tap).
 */
export class SilentAudioKeeper {
  private audio: HTMLAudioElement | null = null;

  async start(): Promise<void> {
    if (typeof window === "undefined") return;

    const audio = getOrCreateAudioElement();
    this.audio = audio;

    if (!audio.src.includes(SILENT_AUDIO_URL)) {
      audio.src = SILENT_AUDIO_URL;
      audio.load();
    }

    try {
      await audio.play();
    } catch {
      /* Retried on visibility resume after user gesture */
    }
  }

  pause(): void {
    try {
      this.audio?.pause();
    } catch {
      /* ignore */
    }
  }

  async resume(): Promise<void> {
    if (typeof window === "undefined") return;
    if (!this.audio) {
      await this.start();
      return;
    }
    try {
      await this.audio.play();
    } catch {
      /* ignore */
    }
  }

  stop(): void {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    this.audio = null;
  }

  isActive(): boolean {
    return !!this.audio && !this.audio.paused;
  }
}
