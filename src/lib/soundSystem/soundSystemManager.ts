import { BinauralAudioEngine } from "@/src/lib/binauralAudioEngine";
import { getBeatPreset } from "@/src/lib/binauralBeats";
import {
  configurePlaybackAudioSession,
  sharedBackgroundAudioSession,
} from "@/src/lib/backgroundAudioSession";
import { binauralPlaybackManager } from "@/src/lib/binauralPlaybackManager";
import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  createChannelHighPass,
  createMasterCompressor,
  createMasterLimiter,
} from "@/src/lib/audioQuality";
import { getDemoBuffer } from "@/src/lib/soundSystem/demoSources";
import { GranularEngine } from "@/src/lib/soundSystem/granularEngine";
import { normalizeGranularParams } from "@/src/lib/soundSystem/types";
import {
  readBinauralPlayerSettings,
  resolveBeatPreset,
} from "@/src/lib/binauralPlayerSettings";
import { resolveStudioAudioUrl } from "@mac/lib/audioStorage";
import {
  readPlaylistSettings,
  readPresets,
  writePlaylistSettings,
  writePresets,
} from "@/src/lib/soundSystem/presetStorage";
import type {
  ChannelConfig,
  PlaylistSettings,
  SoundPreset,
  SoundSystemSnapshot,
} from "@/src/lib/soundSystem/types";
import { defaultPresetChannels } from "@/src/lib/soundSystem/types";

const audioBufferCache = new Map<string, AudioBuffer>();

async function loadAudioFileBuffer(filename: string): Promise<AudioBuffer | null> {
  if (!audioCtx) return null;
  const key = filename;
  const cached = audioBufferCache.get(key);
  if (cached) return cached;
  try {
    const url = resolveStudioAudioUrl(filename);
    const res = await fetch(url);
    if (!res.ok) {
      const fallback = await fetch(`/audio/${encodeURIComponent(filename)}`);
      if (!fallback.ok) return null;
      const data = await fallback.arrayBuffer();
      const buffer = await audioCtx.decodeAudioData(data.slice(0));
      audioBufferCache.set(key, buffer);
      return buffer;
    }
    const data = await res.arrayBuffer();
    const buffer = await audioCtx.decodeAudioData(data.slice(0));
    audioBufferCache.set(key, buffer);
    return buffer;
  } catch {
    return null;
  }
}

type Listener = (snapshot: SoundSystemSnapshot) => void;

function cloneChannels(ch: [ChannelConfig, ChannelConfig, ChannelConfig]) {
  return JSON.parse(JSON.stringify(ch)) as [ChannelConfig, ChannelConfig, ChannelConfig];
}

class SoundSystemManager {
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: WaveShaperNode | null = null;
  private analyser: AnalyserNode | null = null;
  private channelHpfs: [BiquadFilterNode | null, BiquadFilterNode | null, BiquadFilterNode | null] = [
    null,
    null,
    null,
  ];
  private channelGains: [GainNode | null, GainNode | null, GainNode | null] = [null, null, null];
  private binauralEngine: BinauralAudioEngine | null = null;
  private granularEngines: [GranularEngine | null, GranularEngine | null] = [null, null];
  private channels: [ChannelConfig, ChannelConfig, ChannelConfig] = defaultPresetChannels();
  private masterVolume = 0.75;
  private isPlaying = false;
  private listeners = new Set<Listener>();
  private ctxUnregister: (() => void) | null = null;
  private presetRemainingSec = 0;
  private presetEndAt = 0;
  private presetTimerRef: ReturnType<typeof setInterval> | null = null;
  private currentPresetId: string | null = null;
  private currentPresetName: string | null = null;
  private playlistSettings: PlaylistSettings = readPlaylistSettings();
  private playlistIndex = 0;
  private isPlaylistActive = false;
  private transitionToken = 0;
  private readonly bgResumeHandler = (): void => {
    void audioCtx?.resume();
    void this.binauralEngine?.resumeIfSuspended();
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach(l => l(this.getSnapshot()));
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getSnapshot(): SoundSystemSnapshot {
    const presets = readPresets();
    const playlistTotal = this.playlistSettings.presetIds.filter(id =>
      presets.some(p => p.id === id)
    ).length;
    return {
      isPlaying: this.isPlaying,
      isPlaylistActive: this.isPlaylistActive,
      masterVolume: this.masterVolume,
      channels: cloneChannels(this.channels),
      currentPresetId: this.currentPresetId,
      currentPresetName: this.currentPresetName,
      presetRemainingSec: this.presetRemainingSec,
      playlistIndex: this.playlistIndex,
      playlistTotal,
    };
  }

  getChannels(): [ChannelConfig, ChannelConfig, ChannelConfig] {
    return cloneChannels(this.channels);
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  getPlaylistSettings(): PlaylistSettings {
    return { ...this.playlistSettings, presetIds: [...this.playlistSettings.presetIds] };
  }

  setChannel(index: 0 | 1 | 2, config: ChannelConfig): void {
    const prev = this.channels[index];
    this.channels[index] = JSON.parse(JSON.stringify(config)) as ChannelConfig;
    if (!this.isPlaying) {
      this.emit();
      return;
    }
    if (index !== 0 && config.type === "granular" && prev.type === "granular") {
      const sameSource = prev.sourceId === config.sourceId && prev.audioFile === config.audioFile;
      const slot = (index - 1) as 0 | 1;
      const engine = this.granularEngines[slot];
      if (sameSource && engine?.isRunning()) {
        engine.setParams(normalizeGranularParams(config.granular));
        const gain = this.channelGains[index];
        if (gain) gain.gain.value = config.volume;
        this.emit();
        return;
      }
    }
    void this.applyChannel(index);
    this.emit();
  }

  setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.masterGain && audioCtx) {
      const t = audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, t + 0.2);
    }
    this.emit();
  }

  setPlaylistSettings(settings: PlaylistSettings): void {
    this.playlistSettings = {
      ...settings,
      presetIds: [...settings.presetIds],
    };
    writePlaylistSettings(this.playlistSettings);
    this.emit();
  }

  loadPreset(preset: SoundPreset): void {
    this.channels = cloneChannels(preset.channels);
    this.masterVolume = preset.masterVolume;
    this.currentPresetId = preset.id;
    this.currentPresetName = preset.name;
    if (this.isPlaying) void this.rebuildAll();
    this.emit();
  }

  saveCurrentAsPreset(name: string): SoundPreset {
    const preset: SoundPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim() || "無題",
      channels: cloneChannels(this.channels),
      masterVolume: this.masterVolume,
      createdAt: Date.now(),
    };
    const all = [preset, ...readPresets()];
    writePresets(all);
    this.currentPresetId = preset.id;
    this.currentPresetName = preset.name;
    this.emit();
    return preset;
  }

  deletePreset(id: string): void {
    writePresets(readPresets().filter(p => p.id !== id));
    this.playlistSettings = {
      ...this.playlistSettings,
      presetIds: this.playlistSettings.presetIds.filter(pid => pid !== id),
    };
    writePlaylistSettings(this.playlistSettings);
    if (this.currentPresetId === id) {
      this.currentPresetId = null;
      this.currentPresetName = null;
    }
    this.emit();
  }

  private setupAudioGraph(): void {
    if (!audioCtx) return;

    this.compressor = createMasterCompressor(audioCtx);
    this.masterGain = audioCtx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.limiter = createMasterLimiter(audioCtx);
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    for (let i = 0; i < 3; i++) {
      const hpf = createChannelHighPass(audioCtx);
      const g = audioCtx.createGain();
      g.gain.value = this.channels[i].volume;
      hpf.connect(g);
      g.connect(this.compressor);
      this.channelHpfs[i] = hpf;
      this.channelGains[i] = g;
    }

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(audioCtx.destination);
  }

  private getChannelInput(index: 0 | 1 | 2): AudioNode | null {
    return this.channelHpfs[index];
  }

  private async ensureAudio(): Promise<boolean> {
    if (!audioCtx) return false;
    binauralPlaybackManager.stop({ silent: true });
    await resumeAudioCtx();
    if (!this.masterGain) this.setupAudioGraph();
    configurePlaybackAudioSession();
    await sharedBackgroundAudioSession.acquire(this.bgResumeHandler);
    this.ctxUnregister?.();
    this.ctxUnregister = sharedBackgroundAudioSession.registerAudioContext(audioCtx);
    sharedBackgroundAudioSession.bindAudioContext(audioCtx);
    return true;
  }

  private async applyBinauralChannel(index: 0): Promise<void> {
    const ch = this.channels[index];
    if (ch.type !== "binaural") return;
    if (!(await this.ensureAudio())) return;
    const gain = this.getChannelInput(index);
    if (!gain) return;

    const settings = readBinauralPlayerSettings();
    const preset = resolveBeatPreset(getBeatPreset(ch.binauralBeatId), settings.baseKey);

    if (ch.volume <= 0) {
      this.binauralEngine?.stop();
      this.binauralEngine = null;
      return;
    }

    if (this.binauralEngine?.isPlaying()) {
      await this.binauralEngine.applyChanges(preset, ch.binauralAmbientId, { fadeSec: settings.fadeSec });
      this.binauralEngine.setMasterVolume(1);
      this.binauralEngine.setBinauralVolume(0.55);
      this.binauralEngine.setAmbientVolume(0.45);
      return;
    }

    this.binauralEngine?.stop();
    this.binauralEngine = null;

    const engine = new BinauralAudioEngine();
    this.binauralEngine = engine;
    await engine.start(preset, ch.binauralAmbientId, { destination: gain, fadeInSec: settings.fadeSec });
    engine.setMasterVolume(1);
    engine.setBinauralVolume(0.55);
    engine.setAmbientVolume(0.45);
  }

  private async applyGranularChannel(index: 1 | 2): Promise<void> {
    const ch = this.channels[index];
    if (ch.type !== "granular") return;
    if (!(await this.ensureAudio())) return;
    const input = this.getChannelInput(index);
    const channelGain = this.channelGains[index];
    if (!input || !channelGain) return;

    const slot = index - 1;
    this.granularEngines[slot]?.stop();
    channelGain.gain.value = ch.volume;

    const engine = new GranularEngine(input, normalizeGranularParams(ch.granular));
    this.granularEngines[slot] = engine;
    const buffer = ch.audioFile ? await loadAudioFileBuffer(ch.audioFile) : getDemoBuffer(ch.sourceId);
    engine.setBuffer(buffer);
    const hasSource = ch.audioFile ? !!buffer : ch.sourceId !== "silent";
    if (ch.volume > 0 && ch.granular.volume > 0 && hasSource) {
      await engine.start();
    }
  }

  private async applyChannel(index: 0 | 1 | 2): Promise<void> {
    const ch = this.channels[index];
    const gain = this.channelGains[index];
    if (gain) gain.gain.value = ch.volume;
    if (index === 0) await this.applyBinauralChannel(0);
    else await this.applyGranularChannel(index);
  }

  private async rebuildAll(): Promise<void> {
    await this.applyBinauralChannel(0);
    await this.applyGranularChannel(1);
    await this.applyGranularChannel(2);
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  private clearPresetTimer(): void {
    if (this.presetTimerRef) {
      clearInterval(this.presetTimerRef);
      this.presetTimerRef = null;
    }
    this.presetEndAt = 0;
    this.presetRemainingSec = 0;
  }

  private startPresetTimer(durationSec: number): void {
    this.clearPresetTimer();
    this.presetEndAt = Date.now() + durationSec * 1000;
    this.presetRemainingSec = durationSec;
    this.presetTimerRef = setInterval(() => {
      const remain = Math.max(0, Math.ceil((this.presetEndAt - Date.now()) / 1000));
      this.presetRemainingSec = remain;
      this.emit();
      if (remain <= 0 && this.isPlaylistActive) {
        void this.advancePlaylist();
      }
    }, 500);
  }

  private resolvePlaylistPresets(): SoundPreset[] {
    const all = readPresets();
    const ids = this.playlistSettings.presetIds;
    const ordered = ids.map(id => all.find(p => p.id === id)).filter(Boolean) as SoundPreset[];
    if (this.playlistSettings.mode === "desc") return [...ordered].reverse();
    if (this.playlistSettings.mode === "random") {
      const shuffled = [...ordered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return ordered;
  }

  private computePresetDuration(): number {
    const base = this.playlistSettings.presetDurationSec;
    if (!this.playlistSettings.randomizeDuration || this.playlistSettings.mode !== "random") {
      return base;
    }
    const variance = base * 0.35;
    return Math.max(1, Math.round(base + (Math.random() * 2 - 1) * variance));
  }

  private async crossfadeToPreset(preset: SoundPreset): Promise<void> {
    const token = ++this.transitionToken;
    const fadeSec = this.playlistSettings.fadeSec;
    if (!(await this.ensureAudio()) || !this.masterGain || !audioCtx) return;

    if (fadeSec > 0) {
      const t = audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(0, t + fadeSec);
      await new Promise<void>(r => setTimeout(r, fadeSec * 1000));
    }
    if (token !== this.transitionToken) return;

    this.loadPreset(preset);
    await this.rebuildAll();

    if (fadeSec > 0 && this.masterGain && audioCtx) {
      const t2 = audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t2);
      this.masterGain.gain.setValueAtTime(0, t2);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, t2 + fadeSec);
      await new Promise<void>(r => setTimeout(r, fadeSec * 1000));
    } else if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
    if (token !== this.transitionToken) return;
    this.startPresetTimer(this.computePresetDuration());
  }

  private async advancePlaylist(): Promise<void> {
    const list = this.resolvePlaylistPresets();
    if (list.length === 0) {
      this.stopPlaylist();
      return;
    }
    this.playlistIndex = (this.playlistIndex + 1) % list.length;
    await this.crossfadeToPreset(list[this.playlistIndex]);
    this.emit();
  }

  async start(): Promise<void> {
    if (this.isPlaying) return;
    if (!(await this.ensureAudio())) return;
    this.isPlaying = true;
    await this.rebuildAll();
    if (this.isPlaylistActive) {
      const list = this.resolvePlaylistPresets();
      if (list.length > 0) {
        if (!this.currentPresetId) {
          this.playlistIndex = 0;
          this.loadPreset(list[0]);
          await this.rebuildAll();
        }
        this.startPresetTimer(this.computePresetDuration());
      }
    }
    this.emit();
  }

  stop(): void {
    this.isPlaying = false;
    this.clearPresetTimer();
    this.granularEngines.forEach(e => e?.stop());
    this.granularEngines = [null, null];
    this.binauralEngine?.stop();
    this.binauralEngine = null;
    this.ctxUnregister?.();
    this.ctxUnregister = null;
    sharedBackgroundAudioSession.release(this.bgResumeHandler);
    this.emit();
  }

  dispose(): void {
    if (this.isPlaying) this.stop();
  }

  async startPlaylist(): Promise<void> {
    this.isPlaylistActive = true;
    this.playlistIndex = 0;
    const list = this.resolvePlaylistPresets();
    if (list.length > 0) {
      this.loadPreset(list[0]);
    }
    if (!this.isPlaying) await this.start();
    else this.startPresetTimer(this.computePresetDuration());
    this.emit();
  }

  stopPlaylist(): void {
    this.isPlaylistActive = false;
    this.clearPresetTimer();
    this.emit();
  }

  async togglePlay(): Promise<void> {
    if (this.isPlaying) this.stop();
    else await this.start();
  }
}

export const soundSystemManager = new SoundSystemManager();
