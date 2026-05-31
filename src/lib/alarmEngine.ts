import { getAudioContext, resumeAudioContext } from "@/src/lib/audioContext";

export class AlarmEngine {
  private ctx: AudioContext | null = null;
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private vibrateTimer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  start(): void {
    this.stop();
    this.active = true;
    this.ctx = getAudioContext();
    void resumeAudioContext();
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
    this.ctx = null;
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
    if (!this.active || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.85, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(ctx.destination);

    const freqs = [880, 988, 784, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      osc.connect(g);
      g.connect(master);
      const t = now + i * 0.12;
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }
}
