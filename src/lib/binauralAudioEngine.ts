import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import type { AmbientSoundId, BinauralBeatPreset } from "@/src/lib/binauralBeats";

type EngineNodes = {
  master: GainNode;
  binauralGain: GainNode;
  ambientGain: GainNode;
  leftOsc: OscillatorNode;
  rightOsc: OscillatorNode;
  merger: ChannelMergerNode;
  ambientCleanup: () => void;
  ambientTimers: ReturnType<typeof setInterval>[];
};

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function connectNoiseLoop(
  ctx: AudioContext,
  destination: AudioNode,
  setup: (source: AudioBufferSourceNode, filter: BiquadFilterNode) => void
): () => void {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, 3);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  setup(source, filter);
  source.connect(filter);
  filter.connect(destination);
  source.start();
  return () => {
    try {
      source.stop();
      source.disconnect();
      filter.disconnect();
    } catch {
      /* ignore */
    }
  };
}

export function buildAmbient(
  ambientGain: GainNode,
  ambientId: AmbientSoundId
): { cleanup: () => void; timers: ReturnType<typeof setInterval>[] } {
  if (!audioCtx) return { cleanup: () => {}, timers: [] };
  const ctx = audioCtx;
  const cleanups: (() => void)[] = [];
  const timers: ReturnType<typeof setInterval>[] = [];

  switch (ambientId) {
    case "silent":
      break;
    case "rain": {
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "lowpass";
          filter.frequency.value = 900;
          filter.Q.value = 0.5;
        })
      );
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "bandpass";
          filter.frequency.value = 3000;
          filter.Q.value = 2;
        })
      );
      break;
    }
    case "ocean": {
      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.35;
      waveGain.connect(ambientGain);
      cleanups.push(
        connectNoiseLoop(ctx, waveGain, (_src, filter) => {
          filter.type = "lowpass";
          filter.frequency.value = 500;
        })
      );
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 0.25;
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);
      lfo.start();
      cleanups.push(() => {
        lfo.stop();
        lfo.disconnect();
        lfoGain.disconnect();
        waveGain.disconnect();
      });
      break;
    }
    case "forest": {
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "bandpass";
          filter.frequency.value = 1200;
          filter.Q.value = 0.8;
        })
      );
      const chirp = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 1800 + Math.random() * 2200;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      };
      timers.push(setInterval(chirp, 2200 + Math.random() * 2800));
      chirp();
      break;
    }
    case "fire": {
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "lowpass";
          filter.frequency.value = 700;
        })
      );
      const crackle = () => {
        const burst = ctx.createGain();
        burst.gain.value = 0.02 + Math.random() * 0.04;
        const src = ctx.createBufferSource();
        src.buffer = createNoiseBuffer(ctx, 0.15);
        const f = ctx.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 1000;
        src.connect(f);
        f.connect(burst);
        burst.connect(ambientGain);
        src.start();
        src.stop(ctx.currentTime + 0.15);
      };
      timers.push(setInterval(crackle, 180 + Math.random() * 420));
      break;
    }
    case "suikinkutsu": {
      const drop = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880 + Math.random() * 440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.8);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
        const delay = ctx.createDelay(2);
        delay.delayTime.value = 0.35;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.35;
        osc.connect(g);
        g.connect(ambientGain);
        g.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 2.3);
      };
      timers.push(setInterval(drop, 3500 + Math.random() * 2500));
      drop();
      break;
    }
    case "uguisu": {
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "bandpass";
          filter.frequency.value = 900;
          filter.Q.value = 0.4;
        })
      );
      const chirp = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        const base = 2600 + Math.random() * 900;
        osc.frequency.setValueAtTime(base, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(base + 500 + Math.random() * 500, ctx.currentTime + 0.12);
        osc.frequency.exponentialRampToValueAtTime(base * 0.75, ctx.currentTime + 0.55);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      };
      timers.push(setInterval(chirp, 2800 + Math.random() * 3500));
      chirp();
      break;
    }
    case "space": {
      const shimmer = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 2200 + Math.random() * 3800;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 3);
      };
      timers.push(setInterval(shimmer, 2200 + Math.random() * 3200));
      shimmer();
      break;
    }
    case "underwater": {
      cleanups.push(
        connectNoiseLoop(ctx, ambientGain, (_src, filter) => {
          filter.type = "lowpass";
          filter.frequency.value = 320;
          filter.Q.value = 0.9;
        })
      );
      const bubble = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(120 + Math.random() * 80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(380 + Math.random() * 120, ctx.currentTime + 0.07);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.028, ctx.currentTime + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      };
      timers.push(setInterval(bubble, 450 + Math.random() * 1200));
      bubble();
      break;
    }
    case "waterdrops": {
      const drop = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100 + Math.random() * 700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.35);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.038, ctx.currentTime + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(g);
        g.connect(ambientGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };
      timers.push(setInterval(drop, 700 + Math.random() * 1100));
      drop();
      break;
    }
  }

  return {
    cleanup: () => cleanups.forEach(fn => fn()),
    timers,
  };
}

const CROSSFADE_SEC = 1.5;

function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class BinauralAudioEngine {
  private nodes: EngineNodes | null = null;
  private currentAmbientId: AmbientSoundId | null = null;
  private targetMaster = 0.7;
  private targetBinaural = 0.45;
  private targetAmbient = 0.35;
  private transitioning = false;
  private transitionId = 0;
  private pausedByInterrupt = false;
  private preInterruptMaster = 0.7;
  private ctxStateCleanup: (() => void) | null = null;

  async start(
    preset: BinauralBeatPreset,
    ambientId: AmbientSoundId,
    options?: { fadeInSec?: number; destination?: AudioNode }
  ): Promise<void> {
    this.stop();
    if (!audioCtx) return;
    await resumeAudioCtx();
    const ctx = audioCtx;
    const fadeInSec = options?.fadeInSec ?? 0;

    const master = ctx.createGain();
    const t = ctx.currentTime;
    if (fadeInSec > 0) {
      master.gain.setValueAtTime(0, t);
      master.gain.linearRampToValueAtTime(this.targetMaster, t + fadeInSec);
    } else {
      master.gain.value = this.targetMaster;
    }
    master.connect(options?.destination ?? ctx.destination);

    const binauralGain = ctx.createGain();
    binauralGain.gain.value = this.targetBinaural;
    binauralGain.connect(master);

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = this.targetAmbient;
    ambientGain.connect(master);

    const merger = ctx.createChannelMerger(2);
    merger.connect(binauralGain);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = preset.carrierHz;
    leftOsc.connect(merger, 0, 0);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = preset.carrierHz + preset.beatHz;
    rightOsc.connect(merger, 0, 1);

    leftOsc.start();
    rightOsc.start();

    const { cleanup: ambientCleanup, timers: ambientTimers } = buildAmbient(ambientGain, ambientId);
    this.currentAmbientId = ambientId;

    this.ctxStateCleanup?.();
    this.ctxStateCleanup = null;
    this.pausedByInterrupt = false;

    this.nodes = {
      master,
      binauralGain,
      ambientGain,
      leftOsc,
      rightOsc,
      merger,
      ambientCleanup,
      ambientTimers,
    };
  }

  stop(): void {
    this.transitionId += 1;
    this.transitioning = false;
    if (!this.nodes) return;
    this.ctxStateCleanup?.();
    this.ctxStateCleanup = null;
    this.pausedByInterrupt = false;
    const { leftOsc, rightOsc, merger, binauralGain, ambientGain, master, ambientCleanup, ambientTimers } =
      this.nodes;
    ambientTimers.forEach(t => clearInterval(t));
    ambientCleanup();
    try {
      leftOsc.stop();
      rightOsc.stop();
    } catch {
      /* ignore */
    }
    try {
      leftOsc.disconnect();
      rightOsc.disconnect();
      merger.disconnect();
      binauralGain.disconnect();
      ambientGain.disconnect();
      master.disconnect();
    } catch {
      /* ignore */
    }
    this.nodes = null;
    this.currentAmbientId = null;
  }

  async stopWithFade(fadeSec: number): Promise<void> {
    if (!this.nodes) return;
    const id = ++this.transitionId;
    if (fadeSec <= 0) {
      this.stop();
      return;
    }
    if (!this.nodes || !audioCtx) return;
    this.transitioning = true;
    const { master } = this.nodes;
    const t = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + fadeSec);
    await sleepMs(fadeSec * 1000);
    if (id !== this.transitionId) return;
    this.stop();
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  swapAmbient(ambientId: AmbientSoundId): void {
    if (!this.nodes || this.currentAmbientId === ambientId) return;
    const { ambientGain, ambientCleanup, ambientTimers } = this.nodes;
    ambientTimers.forEach(t => clearInterval(t));
    ambientCleanup();
    const built = buildAmbient(ambientGain, ambientId);
    this.nodes.ambientCleanup = built.cleanup;
    this.nodes.ambientTimers = built.timers;
    this.currentAmbientId = ambientId;
  }

  async applyChanges(
    preset: BinauralBeatPreset,
    ambientId: AmbientSoundId,
    options?: { fadeSec?: number }
  ): Promise<void> {
    if (!this.nodes) return;
    const fadeSec = options?.fadeSec ?? CROSSFADE_SEC;
    const id = ++this.transitionId;
    this.transitioning = true;

    const apply = (): void => {
      if (!this.nodes) return;
      this.updatePreset(preset);
      this.swapAmbient(ambientId);
    };

    if (fadeSec <= 0) {
      apply();
      this.transitioning = false;
      return;
    }

    const { master } = this.nodes;
    if (!audioCtx) return;
    let t = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + fadeSec);

    await sleepMs(fadeSec * 1000);
    if (id !== this.transitionId || !this.nodes) {
      this.transitioning = false;
      return;
    }

    apply();

    t = audioCtx.currentTime;
    this.nodes.master.gain.cancelScheduledValues(t);
    this.nodes.master.gain.setValueAtTime(0, t);
    this.nodes.master.gain.linearRampToValueAtTime(this.targetMaster, t + fadeSec);

    await sleepMs(fadeSec * 1000);
    if (id === this.transitionId) this.transitioning = false;
  }

  setMasterVolume(value: number): void {
    this.targetMaster = Math.max(0, Math.min(1, value));
    if (!this.nodes || !audioCtx) return;
    const { master } = this.nodes;
    const t = audioCtx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(this.targetMaster, t + 0.3);
  }

  setBinauralVolume(value: number): void {
    this.targetBinaural = Math.max(0, Math.min(1, value));
    if (!this.nodes) return;
    this.nodes.binauralGain.gain.value = this.targetBinaural;
  }

  setAmbientVolume(value: number): void {
    this.targetAmbient = Math.max(0, Math.min(1, value));
    if (!this.nodes) return;
    this.nodes.ambientGain.gain.value = this.targetAmbient;
  }

  async resumeIfSuspended(): Promise<void> {
    if (!this.nodes || !audioCtx) return;
    if (audioCtx.state === "suspended" || (audioCtx.state as string) === "interrupted") {
      try {
        await audioCtx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  getAudioContext(): AudioContext | null {
    return audioCtx;
  }

  bindContextStateHandler(onInterrupt: () => void, onResume: () => void): void {
    if (!audioCtx) return;
    this.ctxStateCleanup?.();
    let interrupted = false;
    const handler = () => {
      const state = audioCtx!.state as string;
      if (state === "interrupted") {
        if (!interrupted) {
          interrupted = true;
          this.pauseForInterrupt();
          onInterrupt();
        }
      } else if (audioCtx!.state === "running" && interrupted) {
        interrupted = false;
        void this.resumeAfterInterrupt();
        onResume();
      }
    };
    audioCtx.addEventListener("statechange", handler);
    this.ctxStateCleanup = () => audioCtx!.removeEventListener("statechange", handler);
  }

  pauseForInterrupt(): void {
    if (!this.nodes || this.pausedByInterrupt || !audioCtx) return;
    this.pausedByInterrupt = true;
    const { master } = this.nodes;
    this.preInterruptMaster = master.gain.value;
    master.gain.setValueAtTime(0, audioCtx.currentTime);
    void audioCtx.suspend();
  }

  async resumeAfterInterrupt(): Promise<void> {
    if (!this.nodes || !this.pausedByInterrupt || !audioCtx) return;
    this.pausedByInterrupt = false;
    const { master } = this.nodes;
    try {
      await audioCtx.resume();
    } catch {
      /* ignore */
    }
    master.gain.setValueAtTime(this.preInterruptMaster || this.targetMaster, audioCtx.currentTime);
  }

  updatePreset(preset: BinauralBeatPreset): void {
    if (!this.nodes || !audioCtx) return;
    const { leftOsc, rightOsc } = this.nodes;
    const t = audioCtx.currentTime;
    leftOsc.frequency.setValueAtTime(preset.carrierHz, t);
    rightOsc.frequency.setValueAtTime(preset.carrierHz + preset.beatHz, t);
  }

  isPlaying(): boolean {
    return this.nodes !== null;
  }
}
