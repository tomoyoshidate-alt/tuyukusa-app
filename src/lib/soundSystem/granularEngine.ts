import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  applySourcePitch,
  randomGrainPhaseOffset,
  scheduleEmitDurationEnvelope,
} from "@/src/lib/audioQuality";
import { normalizeGranularParams, type GranularParams, type LfoShape } from "@/src/lib/soundSystem/types";

const LFO_DEPTH_FADE_SEC = 0.1;
const RANDOM_RAMP_SEC = 0.05;
const LFO_TICK_MS = 16;

function lfoWave(shape: LfoShape, phase: number): number {
  const sine = Math.sin(phase * Math.PI * 2);
  if (shape === "square") return sine >= 0 ? 1 : -1;
  return sine;
}

export class GranularEngine {
  private buffer: AudioBuffer | null = null;
  private params: GranularParams = normalizeGranularParams({});
  private output: AudioNode;
  private running = false;
  private grainTimer: ReturnType<typeof setInterval> | null = null;
  private lfoTickTimer: ReturnType<typeof setInterval> | null = null;
  private randomTimer: ReturnType<typeof setInterval> | null = null;
  private activeSources: AudioBufferSourceNode[] = [];

  private lfoPhase = 0;
  private lfoModSemis = 0;
  private randomTargetSemis = 0;
  private effectiveLfoDepth = 0;
  private depthFadeFrom = 0;
  private depthFadeTo = 0;
  private depthFadeStartMs = 0;
  private depthFadeDurMs = 0;

  constructor(output: AudioNode, params: GranularParams) {
    this.output = output;
    this.params = normalizeGranularParams(params);
    this.effectiveLfoDepth = this.params.lfoEnabled ? this.params.lfoDepth : 0;
  }

  setBuffer(buffer: AudioBuffer | null): void {
    this.buffer = buffer;
  }

  setParams(params: GranularParams): void {
    const prev = this.params;
    const next = normalizeGranularParams(params);
    this.params = next;

    if (prev.lfoEnabled !== next.lfoEnabled) {
      this.startDepthFade(next.lfoEnabled ? next.lfoDepth : 0, LFO_DEPTH_FADE_SEC);
    } else if (next.lfoEnabled && prev.lfoDepth !== next.lfoDepth) {
      this.effectiveLfoDepth = next.lfoDepth;
    } else if (!next.lfoEnabled) {
      this.effectiveLfoDepth = 0;
    }

    if (
      prev.lfoShape !== next.lfoShape ||
      prev.lfoSpeed !== next.lfoSpeed ||
      prev.lfoEnabled !== next.lfoEnabled
    ) {
      this.configureRandomTimer();
    }

    if (prev.pitchShift !== next.pitchShift) {
      this.applyPlaybackRateToActiveGrains();
    }

    if (prev.grainSizeMs !== next.grainSizeMs || prev.overlap !== next.overlap) {
      this.configureGrainTimer();
    }
  }

  private startDepthFade(target: number, durSec: number): void {
    this.depthFadeFrom = this.effectiveLfoDepth;
    this.depthFadeTo = target;
    this.depthFadeStartMs = performance.now();
    this.depthFadeDurMs = durSec * 1000;
  }

  private updateDepthFade(): void {
    if (this.depthFadeDurMs <= 0) return;
    const elapsed = performance.now() - this.depthFadeStartMs;
    const t = Math.min(1, elapsed / this.depthFadeDurMs);
    this.effectiveLfoDepth = this.depthFadeFrom + (this.depthFadeTo - this.depthFadeFrom) * t;
    if (t >= 1) this.depthFadeDurMs = 0;
  }

  private configureRandomTimer(): void {
    if (this.randomTimer) {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    }
    if (!this.running || !this.params.lfoEnabled || this.params.lfoShape !== "random") return;
    const rate = Math.max(0.01, this.params.lfoSpeed);
    const periodMs = Math.max(50, Math.round((1 / rate) * 1000));
    this.randomTargetSemis = 0;
    this.randomTimer = setInterval(() => {
      const depth = this.effectiveLfoDepth;
      this.randomTargetSemis = (Math.random() * 2 - 1) * depth;
    }, periodMs);
  }

  private tickLfo(): void {
    this.updateDepthFade();
    const depth = this.effectiveLfoDepth;
    if (!this.params.lfoEnabled || depth <= 0) {
      if (this.lfoModSemis !== 0) {
        this.lfoModSemis = 0;
        this.applyPlaybackRateToActiveGrains();
      }
      return;
    }

    if (this.params.lfoShape === "random") {
      const alpha = Math.min(1, LFO_TICK_MS / 1000 / RANDOM_RAMP_SEC);
      this.lfoModSemis += (this.randomTargetSemis - this.lfoModSemis) * alpha;
      this.applyPlaybackRateToActiveGrains();
      return;
    }

    const dt = LFO_TICK_MS / 1000;
    this.lfoPhase += this.params.lfoSpeed * dt;
    if (this.lfoPhase > 1000) this.lfoPhase -= 1000;
    this.lfoModSemis = lfoWave(this.params.lfoShape, this.lfoPhase) * depth;
    this.applyPlaybackRateToActiveGrains();
  }

  private currentPitchSemitones(): number {
    return this.params.pitchShift + this.lfoModSemis;
  }

  private applyPlaybackRateToActiveGrains(): void {
    const semitones = this.currentPitchSemitones();
    this.activeSources.forEach(src => {
      applySourcePitch(src, semitones);
    });
  }

  private spawnGrain(): void {
    if (!audioCtx || !this.buffer || !this.running || this.params.volume <= 0) return;
    if (this.buffer.duration < 0.05) return;

    const grainSize = Math.max(0.01, Math.min(0.5, this.params.grainSizeMs / 1000));
    const emitDuration = grainSize * (this.params.emitDurationPercent / 100);
    const src = audioCtx.createBufferSource();
    src.buffer = this.buffer;

    const maxOffset = Math.max(0, this.buffer.duration - grainSize);
    const base = (this.params.position / 100) * maxOffset;
    const randSpan = (this.params.randomness / 100) * maxOffset * 0.5;
    const offset = Math.max(
      0,
      Math.min(maxOffset, base + (Math.random() * 2 - 1) * randSpan + randomGrainPhaseOffset())
    );

    const pitch = this.currentPitchSemitones();
    applySourcePitch(src, pitch);

    const env = audioCtx.createGain();
    const t = audioCtx.currentTime;
    const vol = this.params.volume / 100;
    scheduleEmitDurationEnvelope(env, t, emitDuration, vol);

    src.connect(env);
    env.connect(this.output);
    src.start(t, offset);
    src.stop(t + emitDuration + 0.01);
    this.activeSources.push(src);
    src.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== src);
      src.disconnect();
      env.disconnect();
    };
  }

  private configureGrainTimer(): void {
    if (this.grainTimer) {
      clearInterval(this.grainTimer);
      this.grainTimer = null;
    }
    if (!this.running) return;

    const dur = Math.max(0.01, this.params.grainSizeMs / 1000);
    const overlapFactor = 1 - Math.max(0, Math.min(100, this.params.overlap)) / 100;
    const ms = Math.max(20, dur * overlapFactor * 1000 * 0.5);
    this.grainTimer = setInterval(() => this.spawnGrain(), ms);
  }

  async start(): Promise<void> {
    if (this.running) return;
    await resumeAudioCtx();
    if (!audioCtx) return;
    this.running = true;
    this.lfoPhase = 0;
    this.lfoModSemis = 0;
    this.randomTargetSemis = 0;
    this.effectiveLfoDepth = this.params.lfoEnabled ? this.params.lfoDepth : 0;

    this.spawnGrain();
    this.configureGrainTimer();
    this.lfoTickTimer = setInterval(() => this.tickLfo(), LFO_TICK_MS);
    this.configureRandomTimer();
  }

  stop(): void {
    this.running = false;
    if (this.grainTimer) {
      clearInterval(this.grainTimer);
      this.grainTimer = null;
    }
    if (this.lfoTickTimer) {
      clearInterval(this.lfoTickTimer);
      this.lfoTickTimer = null;
    }
    if (this.randomTimer) {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    }
    this.activeSources.forEach(src => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.activeSources = [];
  }

  isRunning(): boolean {
    return this.running;
  }
}
