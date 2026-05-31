import { audioCtx } from "@/src/lib/audioContext";
import type { DemoSourceId } from "@/src/lib/soundSystem/types";

function noiseBuffer(ctx: AudioContext, seconds: number, pink = false): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (!pink) {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
  }
  return buffer;
}

/** Procedurally generate loopable demo buffers for granular playback. */
export function generateDemoBuffer(ctx: AudioContext, sourceId: DemoSourceId): AudioBuffer {
  const duration = sourceId === "silent" ? 0.5 : 6;
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * duration);
  const buffer = ctx.createBuffer(2, length, sr);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);

  if (sourceId === "silent") {
    return buffer;
  }

  const white = noiseBuffer(ctx, duration, false).getChannelData(0);
  const pink = noiseBuffer(ctx, duration, true).getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sr;
    let s = 0;

    switch (sourceId) {
      case "ocean": {
        const lfo = 0.5 + 0.5 * Math.sin(t * 0.3 * Math.PI * 2);
        s = white[i] * 0.25 * lfo;
        break;
      }
      case "rain":
        s = (Math.random() * 2 - 1) * 0.15 + white[i] * 0.08;
        break;
      case "forest": {
        s = pink[i] * 0.35;
        if (Math.random() < 0.0008) s += Math.sin(t * 40) * 0.2 * Math.exp(-((i % 800) / 200));
        break;
      }
      case "fire":
        s = (Math.random() > 0.992 ? 0.4 : 0) + white[i] * 0.06;
        break;
      case "suikinkutsu": {
        const hit = Math.floor(t * 1.2) !== Math.floor((t - 1 / sr) * 1.2);
        if (hit) s = Math.sin(t * 900) * 0.3 * Math.exp(-((i % (sr * 0.5)) / (sr * 0.15)));
        break;
      }
      case "uguisu": {
        const chirp = Math.sin(t * (1200 + Math.sin(t * 8) * 400)) * 0.08;
        s = chirp * (0.5 + 0.5 * Math.sin(t * 3));
        break;
      }
      case "space": {
        s = white[i] * 0.04 + Math.sin(t * 52 * Math.PI * 2) * 0.02;
        if (Math.random() < 0.0003) s += Math.sin(t * 2000) * 0.15;
        break;
      }
      case "underwater": {
        s = white[i] * 0.12 * (0.7 + 0.3 * Math.sin(t * 0.5));
        break;
      }
      case "waterdrops": {
        if (Math.random() < 0.002) {
          const phase = (i % Math.floor(sr * 0.4)) / sr;
          s = Math.sin(phase * 80 * Math.PI * 2) * 0.35 * Math.exp(-phase * 8);
        }
        break;
      }
      default:
        s = white[i] * 0.1;
    }

    L[i] = s;
    R[i] = s * 0.98;
  }

  return buffer;
}

const cache = new Map<string, AudioBuffer>();

export function getDemoBuffer(sourceId: DemoSourceId): AudioBuffer | null {
  if (!audioCtx) return null;
  const key = `${audioCtx.sampleRate}-${sourceId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const buf = generateDemoBuffer(audioCtx, sourceId);
  cache.set(key, buf);
  return buf;
}
