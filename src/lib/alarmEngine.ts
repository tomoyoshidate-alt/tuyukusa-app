import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";

export class AlarmEngine {
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private vibrateTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  start(): void {
    this.stop();
    this.active = true;
    void resumeAudioCtx();
    this.playPulse();
    this.pulseTimer = setInterval(() => this.playPulse(), 1400);
    this.triggerVibrate();
    this.vibrateTimer = setInterval(() => this.triggerVibrate(), 1400);
  }

  stop(): void {
    this.active = false;
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.vibrateTimer) {
      clearInterval(this.vibrateTimer);
      this.vibrateTimer = null;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private triggerVibrate(): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([400, 150, 400, 150, 400]);
    }
  }

  private playPulse(): void {
    if (!this.active || !audioCtx) return;
    const now = audioCtx.currentTime;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.85, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(audioCtx.destination);

    const freqs = [880, 988, 784, 880];
    freqs.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const g = audioCtx!.createGain();
      g.gain.value = 0.22;
      osc.connect(g);
      g.connect(master);
      const t = now + i * 0.12;
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }
}
