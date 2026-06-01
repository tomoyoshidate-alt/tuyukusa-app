import { getAudioContext, resumeAudioCtx } from "@/src/lib/audioContext";
import { resolveStudioAudioUrl } from "@mac/lib/audioStorage";
import { getDemoBuffer } from "@/src/lib/soundSystem/demoSources";
import { GranularEngine } from "@/src/lib/soundSystem/granularEngine";
import {
  normalizeGranularParams,
  type DemoSourceId,
  type GranularParams,
} from "@/src/lib/soundSystem/types";

const audioBufferCache = new Map<string, AudioBuffer>();

async function loadAudioFileBuffer(filename: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  const cached = audioBufferCache.get(filename);
  if (cached) return cached;
  try {
    const url = resolveStudioAudioUrl(filename);
    const res = await fetch(url);
    if (!res.ok) {
      const fallback = await fetch(`/audio/${encodeURIComponent(filename)}`);
      if (!fallback.ok) return null;
      const data = await fallback.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data.slice(0));
      audioBufferCache.set(filename, buffer);
      return buffer;
    }
    const data = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data.slice(0));
    audioBufferCache.set(filename, buffer);
    return buffer;
  } catch {
    return null;
  }
}

export type GranularPreviewConfig = {
  sourceId: DemoSourceId;
  audioFile?: string;
  granular: GranularParams;
};

type Listener = (playing: boolean) => void;

class GranularPreviewManager {
  private previewGain: GainNode | null = null;
  private engine: GranularEngine | null = null;
  private running = false;
  private volume = 0.7;
  private currentConfig: GranularPreviewConfig | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.running);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach(l => l(this.running));
  }

  isPlaying(): boolean {
    return this.running;
  }

  getVolume(): number {
    return this.volume;
  }

  hasSource(config: GranularPreviewConfig): boolean {
    if (config.audioFile) return true;
    return config.sourceId !== "silent";
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.previewGain) {
      this.previewGain.gain.value = this.volume;
    }
  }

  private ensurePreviewGain(): GainNode | null {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!this.previewGain) {
      this.previewGain = ctx.createGain();
      this.previewGain.gain.value = this.volume;
      this.previewGain.connect(ctx.destination);
    }
    return this.previewGain;
  }

  private async resolveBuffer(config: GranularPreviewConfig): Promise<AudioBuffer | null> {
    if (config.audioFile) return loadAudioFileBuffer(config.audioFile);
    return getDemoBuffer(config.sourceId);
  }

  async start(config: GranularPreviewConfig): Promise<boolean> {
    if (!this.hasSource(config)) return false;
    const gain = this.ensurePreviewGain();
    if (!gain) return false;

    await resumeAudioCtx();

    const buffer = await this.resolveBuffer(config);
    const hasBuffer = config.audioFile ? !!buffer : config.sourceId !== "silent";
    if (!hasBuffer) return false;

    this.engine?.stop();
    this.engine = new GranularEngine(gain, normalizeGranularParams(config.granular));
    this.engine.setBuffer(buffer);
    await this.engine.start();
    this.running = true;
    this.currentConfig = { ...config, granular: normalizeGranularParams(config.granular) };
    this.emit();
    return true;
  }

  async update(config: GranularPreviewConfig): Promise<void> {
    if (!this.running) return;
    if (!this.hasSource(config)) {
      this.stop();
      return;
    }

    const sameSource =
      this.currentConfig?.sourceId === config.sourceId &&
      this.currentConfig?.audioFile === config.audioFile;

    if (sameSource && this.engine?.isRunning()) {
      this.engine.setParams(normalizeGranularParams(config.granular));
      this.currentConfig = { ...config, granular: normalizeGranularParams(config.granular) };
      return;
    }

    await this.start(config);
  }

  stop(): void {
    this.engine?.stop();
    this.engine = null;
    this.running = false;
    this.currentConfig = null;
    this.emit();
  }

  dispose(): void {
    this.stop();
    this.previewGain?.disconnect();
    this.previewGain = null;
  }
}

export const granularPreviewManager = new GranularPreviewManager();
