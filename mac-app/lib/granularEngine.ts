import { getAudioContext, resumeAudioContext } from "@/src/lib/audioContext";
import type { GranularPreset } from "./types";
import { resolveStudioAudioUrl } from "./audioStorage";

function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export class GranularEngine {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private output: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lfoInterval: ReturnType<typeof setInterval> | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private preset: GranularPreset | null = null;
  private volume = 0.7;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async loadBuffer(audioUrl: string): Promise<void> {
    const ctx = getAudioContext();
    const res = await fetch(audioUrl);
    const arr = await res.arrayBuffer();
    this.buffer = await ctx.decodeAudioData(arr.slice(0));
  }

  async start(preset: GranularPreset, outputGain: GainNode, volume01: number, audioBaseUrl?: string): Promise<void> {
    await this.stop();
    if (!preset.audioFile) return;
    this.preset = preset;
    this.volume = volume01;
    const ctx = getAudioContext();
    await resumeAudioContext();
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.output.gain.value = volume01 * (preset.volume / 100);
    const audioUrl = resolveStudioAudioUrl(preset.audioFile, audioBaseUrl || undefined);
    await this.loadBuffer(audioUrl);
    if (!this.buffer) return;
    this.output.connect(this.analyser);
    this.analyser.connect(outputGain);
    const grainIntervalMs = Math.max(20, 1000 / preset.grainDensity);
    this.spawnGrain(preset);
    this.interval = setInterval(() => this.spawnGrain(preset), grainIntervalMs);
    if (preset.lfoEnabled) {
      this.lfoInterval = setInterval(() => this.applyLfo(preset), 100);
    }
  }

  setVolume(volume01: number): void {
    this.volume = volume01;
    if (!this.output || !this.ctx || !this.preset) return;
    this.output.gain.setTargetAtTime(volume01 * (this.preset.volume / 100), this.ctx.currentTime, 0.05);
  }

  private applyLfo(preset: GranularPreset): void {
    if (!this.output || !this.ctx) return;
    const t = this.ctx.currentTime;
    let mod = 0;
    if (preset.lfoWaveform === "random") {
      mod = (Math.random() * 2 - 1) * preset.lfoDepthSemis;
    } else {
      mod = Math.sin(t * preset.lfoSpeedHz * Math.PI * 2) * preset.lfoDepthSemis;
    }
    const base = semitoneRatio(preset.pitchSemis + mod);
    this.output.gain.setTargetAtTime(this.volume * (preset.volume / 100) * (0.85 + base * 0.05), t, 0.08);
  }

  private spawnGrain(preset: GranularPreset): void {
    if (!this.ctx || !this.buffer || !this.output) return;
    const duration = preset.grainSizeMs / 1000;
    const rand = (preset.randomnessPct / 100) * (Math.random() - 0.5);
    const startNorm = Math.min(0.99, Math.max(0, preset.positionPct / 100 + rand * 0.1));
    const startTime = startNorm * (this.buffer.duration - duration);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = semitoneRatio(preset.pitchSemis + (Math.random() - 0.5) * (preset.randomnessPct / 20));
    const grainGain = this.ctx.createGain();
    const overlap = preset.overlapPct / 100;
    const attack = duration * overlap * 0.5;
    const release = duration * (1 - overlap * 0.5);
    const now = this.ctx.currentTime;
    grainGain.gain.setValueAtTime(0, now);
    grainGain.gain.linearRampToValueAtTime(0.4 * (preset.volume / 100), now + attack);
    grainGain.gain.linearRampToValueAtTime(0, now + release);
    src.connect(grainGain);
    if (preset.reverbPct > 0) {
      const delay = this.ctx.createDelay(0.5);
      delay.delayTime.value = 0.12 + (preset.reverbPct / 100) * 0.2;
      const fb = this.ctx.createGain();
      fb.gain.value = (preset.reverbPct / 100) * 0.35;
      grainGain.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(this.output);
    }
    grainGain.connect(this.output);
    src.start(now, startTime, duration);
    this.activeSources.push(src);
    src.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== src);
      src.disconnect();
      grainGain.disconnect();
    };
  }

  async stop(): Promise<void> {
    if (this.interval) clearInterval(this.interval);
    if (this.lfoInterval) clearInterval(this.lfoInterval);
    this.interval = null;
    this.lfoInterval = null;
    this.activeSources.forEach(s => {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.activeSources = [];
    this.output?.disconnect();
    this.analyser?.disconnect();
    this.ctx = null;
    this.buffer = null;
    this.output = null;
    this.analyser = null;
    this.preset = null;
  }
}
