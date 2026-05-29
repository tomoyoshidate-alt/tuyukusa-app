/** Minimal silent WAV (~100ms) – keeps iOS AVAudioSession alive when looped. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

/**
 * iOS silent-audio trick: loop near-silent HTML audio so Web Audio keeps running
 * while the screen is locked or the app is in the background.
 */
export class SilentAudioKeeper {
  private audio: HTMLAudioElement | null = null;

  async start(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.audio) {
      await this.resume();
      return;
    }

    const audio = new Audio(SILENT_WAV);
    audio.loop = true;
    audio.volume = 0.01;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");

    try {
      await audio.play();
      this.audio = audio;
    } catch {
      /* May fail without user gesture; retried on visibility resume */
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
      this.audio.removeAttribute("src");
      this.audio.load();
    } catch {
      /* ignore */
    }
    this.audio = null;
  }

  isActive(): boolean {
    return !!this.audio && !this.audio.paused;
  }
}
