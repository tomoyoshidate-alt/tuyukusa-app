import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  applySourcePitch,
  randomGrainPhaseOffset,
  scheduleHanningGrainEnvelope,
} from "@/src/lib/audioQuality";
import { clampPitchSemis } from "@mac/lib/pitchFormat";
import type { GranularPreset } from "./types";
import { resolveStudioAudioUrl } from "./audioStorage";

export class GranularEngine {
  private buffer: AudioBuffer | null = null;
  private output: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lfoInterval: ReturnType<typeof setInterval> | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private preset: GranularPreset | null = null;
  private volume = 0.7;
  private lfoModSemis = 0;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async loadBuffer(audioUrl: string): Promise<void> {
    if (!audioCtx) return;
    const res = await fetch(audioUrl);
    const arr = await res.arrayBuffer();
    this.buffer = await audioCtx.decodeAudioData(arr.slice(0));
  }

  async start(preset: GranularPreset, outputGain: AudioNode, volume01: number, audioBaseUrl?: string): Promise<void> {
    await this.stop();
    if (!preset.audioFile || !audioCtx) return;
    await resumeAudioCtx();

    this.preset = { ...preset, pitchSemis: clampPitchSemis(preset.pitchSemis) };
    this.volume = volume01;
    this.lfoModSemis = 0;
    this.output = audioCtx.createGain();
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.output.gain.value = volume01 * (preset.volume / 100);

    const audioUrl = resolveStudioAudioUrl(preset.audioFile, audioBaseUrl || undefined);
    await this.loadBuffer(audioUrl);
    if (!this.buffer) return;

    this.output.connect(this.analyser);
    this.analyser.connect(outputGain);

    const grainIntervalMs = Math.max(20, 1000 / preset.grainDensity);
    this.spawnGrain(this.preset);
    this.interval = setInterval(() => {
      if (this.preset) this.spawnGrain(this.preset);
    }, grainIntervalMs);
    if (preset.lfoEnabled) {
      this.lfoInterval = setInterval(() => {
        if (this.preset) this.applyLfo(this.preset);
      }, 100);
    }
  }

  updatePreset(next: GranularPreset): void {
    if (!this.preset) return;
    this.preset = { ...next, pitchSemis: clampPitchSemis(next.pitchSemis) };
    this.applyPlaybackRateToActiveGrains();
  }

  setVolume(volume01: number): void {
    this.volume = volume01;
    if (!this.output || !audioCtx || !this.preset) return;
    this.output.gain.setTargetAtTime(volume01 * (this.preset.volume / 100), audioCtx.currentTime, 0.05);
  }

  private pitchSemitones(): number {
    if (!this.preset) return 0;
    return this.preset.pitchSemis + (this.preset.lfoEnabled ? this.lfoModSemis : 0);
  }

  private applyPlaybackRateToActiveGrains(): void {
    const semitones = this.pitchSemitones();
    this.activeSources.forEach(src => {
      applySourcePitch(src, semitones);
    });
  }

  private applyLfo(preset: GranularPreset): void {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    let mod = 0;
    if (preset.lfoWaveform === "random") {
      mod = (Math.random() * 2 - 1) * preset.lfoDepthSemis;
    } else {
      mod = Math.sin(t * preset.lfoSpeedHz * Math.PI * 2) * preset.lfoDepthSemis;
    }
    this.lfoModSemis = mod;
    this.applyPlaybackRateToActiveGrains();
  }

  private spawnGrain(preset: GranularPreset): void {
    if (!audioCtx || !this.buffer || !this.output) return;
    const duration = preset.grainSizeMs / 1000;
    const rand = (preset.randomnessPct / 100) * (Math.random() - 0.5);
    const startNorm = Math.min(0.99, Math.max(0, preset.positionPct / 100 + rand * 0.1));
    const startTime = Math.max(
      0,
      startNorm * (this.buffer.duration - duration) + randomGrainPhaseOffset()
    );

    const src = audioCtx.createBufferSource();
    src.buffer = this.buffer;
    const jitter = (Math.random() - 0.5) * (preset.randomnessPct / 20);
    applySourcePitch(src, this.pitchSemitones() + jitter);

    const grainGain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    scheduleHanningGrainEnvelope(grainGain, now, duration, 0.4 * (preset.volume / 100));
    src.connect(grainGain);

    if (preset.reverbPct > 0) {
      const delay = audioCtx.createDelay(0.5);
      delay.delayTime.value = 0.12 + (preset.reverbPct / 100) * 0.2;
      const fb = audioCtx.createGain();
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
    this.buffer = null;
    this.output = null;
    this.analyser = null;
    this.preset = null;
    this.lfoModSemis = 0;
  }
}
