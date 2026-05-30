import type { GranularParams, LfoShape } from "@/src/lib/soundSystem/types";

function lfoValue(shape: LfoShape, phase: number): number {
  switch (shape) {
    case "sine":
      return Math.sin(phase * Math.PI * 2);
    case "triangle": {
      const x = ((phase % 1) + 1) % 1;
      return x < 0.5 ? 4 * x - 1 : 3 - 4 * x;
    }
    case "random":
      return Math.random() * 2 - 1;
    default:
      return 0;
  }
}

export class GranularEngine {
  private buffer: AudioBuffer | null = null;
  private params: GranularParams;
  private output: GainNode;
  private ctx: AudioContext;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lfoPhase = 0;
  private lastLfoTime = 0;

  constructor(ctx: AudioContext, output: GainNode, params: GranularParams) {
    this.ctx = ctx;
    this.output = output;
    this.params = { ...params };
  }

  setBuffer(buffer: AudioBuffer | null): void {
    this.buffer = buffer;
  }

  setParams(params: GranularParams): void {
    this.params = { ...params };
  }

  getLfoPitchMod(): number {
    const depth = this.params.lfoDepth;
    if (depth <= 0) return 0;
    return lfoValue(this.params.lfoShape, this.lfoPhase) * depth;
  }

  private tickLfo(): void {
    const now = performance.now() / 1000;
    if (this.lastLfoTime === 0) this.lastLfoTime = now;
    const dt = now - this.lastLfoTime;
    this.lastLfoTime = now;
    this.lfoPhase += this.params.lfoSpeed * dt;
    if (this.lfoPhase > 1000) this.lfoPhase -= 1000;
  }

  private spawnGrain(): void {
    if (!this.buffer || !this.running || this.params.volume <= 0) return;
    if (this.buffer.duration < 0.05) return;

    const dur = Math.max(0.01, Math.min(0.5, this.params.grainSizeMs / 1000));
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;

    const maxOffset = Math.max(0, this.buffer.duration - dur);
    const base = (this.params.position / 100) * maxOffset;
    const randSpan = (this.params.randomness / 100) * maxOffset * 0.5;
    const offset = Math.max(0, Math.min(maxOffset, base + (Math.random() * 2 - 1) * randSpan));

    const pitch = this.params.pitchShift + this.getLfoPitchMod();
    src.playbackRate.value = Math.pow(2, pitch / 12);

    const env = this.ctx.createGain();
    const t = this.ctx.currentTime;
    const vol = this.params.volume / 100;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + dur * 0.15);
    env.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.7);
    env.gain.linearRampToValueAtTime(0, t + dur);

    src.connect(env);
    env.connect(this.output);
    src.start(t, offset, dur);
    src.stop(t + dur + 0.01);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastLfoTime = 0;
    const dur = Math.max(0.01, this.params.grainSizeMs / 1000);
    const overlapFactor = 1 - Math.max(0, Math.min(100, this.params.overlap)) / 100;
    const ms = Math.max(20, dur * overlapFactor * 1000 * 0.5);
    this.spawnGrain();
    this.timer = setInterval(() => {
      this.tickLfo();
      this.spawnGrain();
    }, ms);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
