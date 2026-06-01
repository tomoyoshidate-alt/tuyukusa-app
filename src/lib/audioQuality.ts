/** Shared audio-quality helpers for granular, binaural, and mixer processing. */

export const MASTER_SAMPLE_RATE = 48000;

export function makeSoftClipCurve(amount: number): Float32Array {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export function createMasterCompressor(ctx: AudioContext): DynamicsCompressorNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  return compressor;
}

export function createMasterLimiter(ctx: AudioContext): WaveShaperNode {
  const limiter = ctx.createWaveShaper();
  limiter.curve = makeSoftClipCurve(50) as Float32Array<ArrayBuffer>;
  limiter.oversample = "4x";
  return limiter;
}

export function createChannelHighPass(ctx: AudioContext): BiquadFilterNode {
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 20;
  hpf.Q.value = 0.7;
  return hpf;
}

export function createWarmPeriodicWave(ctx: AudioContext): PeriodicWave {
  const real = new Float32Array([0, 1, 0.03, 0.01]);
  const imag = new Float32Array([0, 0, 0, 0]);
  return ctx.createPeriodicWave(real, imag);
}

export function configureWarmBinauralOscillator(osc: OscillatorNode, ctx: AudioContext): void {
  osc.setPeriodicWave(createWarmPeriodicWave(ctx));
}

export function createBinauralPanners(ctx: AudioContext): {
  leftPan: StereoPannerNode;
  rightPan: StereoPannerNode;
} {
  const leftPan = ctx.createStereoPanner();
  leftPan.pan.value = -1;
  const rightPan = ctx.createStereoPanner();
  rightPan.pan.value = 1;
  return { leftPan, rightPan };
}

export function applySourcePitch(src: AudioBufferSourceNode, semitones: number): void {
  src.playbackRate.value = 1;
  src.detune.value = semitones * 100;
}

export function scheduleHanningGrainEnvelope(
  gain: GainNode,
  startTime: number,
  duration: number,
  peak: number,
  curveSize = 64
): void {
  const curve = new Float32Array(curveSize);
  for (let i = 0; i < curveSize; i++) {
    curve[i] = peak * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (curveSize - 1)));
  }
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.setValueCurveAtTime(curve, startTime, duration);
}

export function randomGrainPhaseOffset(): number {
  return (Math.random() - 0.5) * 0.01;
}

/** Target RMS approximating -14 LUFS (Spotify / YouTube standard). */
export const LUFS_TARGET_RMS = 0.2;

export function scheduleEmitDurationEnvelope(
  gain: GainNode,
  startTime: number,
  emitDuration: number,
  peak: number
): void {
  const attack = emitDuration * 0.2;
  const fadeOutStart = startTime + emitDuration * 0.8;
  const endTime = startTime + emitDuration;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + attack);
  gain.gain.setValueAtTime(peak, fadeOutStart);
  gain.gain.linearRampToValueAtTime(0, endTime);
}

export class LoudnessNormalizer {
  readonly analyser: AnalyserNode;
  readonly gain: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly dataArray: Float32Array;

  constructor(ctx: AudioContext) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.gain = ctx.createGain();
    this.gain.gain.value = 1;
    this.dataArray = new Float32Array(this.analyser.fftSize);
  }

  start(ctx: AudioContext): void {
    this.stop();
    this.timer = setInterval(() => this.normalize(ctx), 100);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.gain.gain.value = 1;
  }

  private normalize(ctx: AudioContext): void {
    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const val = this.dataArray[i]!;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    if (rms > 0.001) {
      const targetGain = Math.min(Math.max(LUFS_TARGET_RMS / rms, 0.1), 3.0);
      this.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
    }
  }
}
