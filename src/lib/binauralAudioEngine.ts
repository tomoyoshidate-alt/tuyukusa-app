import type { AmbientSoundId, BinauralBeatPreset } from "@/src/lib/binauralBeats";

type EngineNodes = {
  ctx: AudioContext;
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

function buildAmbient(
  ctx: AudioContext,
  ambientGain: GainNode,
  ambientId: AmbientSoundId
): { cleanup: () => void; timers: ReturnType<typeof setInterval>[] } {
  const cleanups: (() => void)[] = [];
  const timers: ReturnType<typeof setInterval>[] = [];

  switch (ambientId) {
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
  }

  return {
    cleanup: () => cleanups.forEach(fn => fn()),
    timers,
  };
}

export class BinauralAudioEngine {
  private nodes: EngineNodes | null = null;

  async start(preset: BinauralBeatPreset, ambientId: AmbientSoundId): Promise<void> {
    this.stop();
    const ctx = new AudioContext();
    await ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);

    const binauralGain = ctx.createGain();
    binauralGain.gain.value = 0.45;
    binauralGain.connect(master);

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.35;
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

    const { cleanup: ambientCleanup, timers: ambientTimers } = buildAmbient(ctx, ambientGain, ambientId);

    this.nodes = {
      ctx,
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
    if (!this.nodes) return;
    const { ctx, leftOsc, rightOsc, merger, ambientCleanup, ambientTimers } = this.nodes;
    ambientTimers.forEach(t => clearInterval(t));
    ambientCleanup();
    try {
      leftOsc.stop();
      rightOsc.stop();
    } catch {
      /* ignore */
    }
    merger.disconnect();
    void ctx.close();
    this.nodes = null;
  }

  setMasterVolume(value: number): void {
    if (!this.nodes) return;
    this.nodes.master.gain.value = Math.max(0, Math.min(1, value));
  }

  setBinauralVolume(value: number): void {
    if (!this.nodes) return;
    this.nodes.binauralGain.gain.value = Math.max(0, Math.min(1, value));
  }

  setAmbientVolume(value: number): void {
    if (!this.nodes) return;
    this.nodes.ambientGain.gain.value = Math.max(0, Math.min(1, value));
  }

  updatePreset(preset: BinauralBeatPreset): void {
    if (!this.nodes) return;
    const { ctx, leftOsc, rightOsc } = this.nodes;
    const t = ctx.currentTime;
    leftOsc.frequency.setValueAtTime(preset.carrierHz, t);
    rightOsc.frequency.setValueAtTime(preset.carrierHz + preset.beatHz, t);
  }

  isPlaying(): boolean {
    return this.nodes !== null;
  }
}
