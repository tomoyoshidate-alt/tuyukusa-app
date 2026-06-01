import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  configureWarmBinauralOscillator,
  createBinauralPanners,
} from "@/src/lib/audioQuality";
import type { BBPreset } from "./types";

export class BBEngine {
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftPan: StereoPannerNode | null = null;
  private rightPan: StereoPannerNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private preset: BBPreset | null = null;
  private volume = 0.7;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async start(preset: BBPreset, outputGain: AudioNode, volume01: number): Promise<void> {
    await this.stop();
    if (!audioCtx) return;
    await resumeAudioCtx();

    this.preset = preset;
    this.volume = volume01;

    this.gain = audioCtx.createGain();
    this.gain.gain.value = 0;
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;

    const { leftPan, rightPan } = createBinauralPanners(audioCtx);
    this.leftPan = leftPan;
    this.rightPan = rightPan;
    leftPan.connect(this.gain);
    rightPan.connect(this.gain);

    this.leftOsc = audioCtx.createOscillator();
    this.rightOsc = audioCtx.createOscillator();
    configureWarmBinauralOscillator(this.leftOsc, audioCtx);
    configureWarmBinauralOscillator(this.rightOsc, audioCtx);
    this.leftOsc.frequency.value = preset.leftHz;
    this.rightOsc.frequency.value = preset.rightHz;

    const leftGain = audioCtx.createGain();
    const rightGain = audioCtx.createGain();
    leftGain.gain.value = 0.5 * (preset.masterVolume / 100);
    rightGain.gain.value = 0.5 * (preset.masterVolume / 100);

    this.leftOsc.connect(leftGain);
    this.rightOsc.connect(rightGain);
    leftGain.connect(leftPan);
    rightGain.connect(rightPan);
    this.gain.connect(this.analyser);
    this.analyser.connect(outputGain);

    this.leftOsc.start();
    this.rightOsc.start();

    const now = audioCtx.currentTime;
    const target = volume01 * (preset.masterVolume / 100);
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(target, now + preset.fadeInSec);
  }

  setVolume(volume01: number): void {
    this.volume = volume01;
    if (!this.gain || !audioCtx || !this.preset) return;
    this.gain.gain.setTargetAtTime(volume01 * (this.preset.masterVolume / 100), audioCtx.currentTime, 0.05);
  }

  async stop(): Promise<void> {
    if (!audioCtx || !this.gain || !this.preset) {
      this.disposeNodes();
      return;
    }
    const fade = this.preset.fadeOutSec;
    const now = audioCtx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + fade);
    await new Promise(r => setTimeout(r, fade * 1000 + 50));
    this.disposeNodes();
  }

  private disposeNodes(): void {
    [this.leftOsc, this.rightOsc].forEach(o => {
      try {
        o?.stop();
        o?.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.leftPan?.disconnect();
    this.rightPan?.disconnect();
    this.gain?.disconnect();
    this.analyser?.disconnect();
    this.leftOsc = null;
    this.rightOsc = null;
    this.leftPan = null;
    this.rightPan = null;
    this.gain = null;
    this.analyser = null;
    this.preset = null;
  }
}
