import type { BBPreset } from "./types";

export class BBEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private preset: BBPreset | null = null;
  private volume = 0.7;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async start(preset: BBPreset, outputGain: GainNode, volume01: number): Promise<void> {
    await this.stop();
    this.preset = preset;
    this.volume = volume01;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.merger = this.ctx.createChannelMerger(2);
    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();
    this.leftOsc.type = preset.waveform;
    this.rightOsc.type = preset.waveform;
    this.leftOsc.frequency.value = preset.leftHz;
    this.rightOsc.frequency.value = preset.rightHz;
    const leftGain = this.ctx.createGain();
    const rightGain = this.ctx.createGain();
    leftGain.gain.value = 0.5 * (preset.masterVolume / 100);
    rightGain.gain.value = 0.5 * (preset.masterVolume / 100);
    this.leftOsc.connect(leftGain);
    this.rightOsc.connect(rightGain);
    leftGain.connect(this.merger, 0, 0);
    rightGain.connect(this.merger, 0, 1);
    this.merger.connect(this.gain);
    this.gain.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(outputGain);
    this.leftOsc.start();
    this.rightOsc.start();
    const now = this.ctx.currentTime;
    const target = volume01 * (preset.masterVolume / 100);
    this.gain.gain.setValueAtTime(0, now);
    this.gain.gain.linearRampToValueAtTime(target, now + preset.fadeInSec);
  }

  setVolume(volume01: number): void {
    this.volume = volume01;
    if (!this.gain || !this.ctx || !this.preset) return;
    this.gain.gain.setTargetAtTime(volume01 * (this.preset.masterVolume / 100), this.ctx.currentTime, 0.05);
  }

  async stop(): Promise<void> {
    if (!this.ctx || !this.gain || !this.preset) {
      this.disposeNodes();
      return;
    }
    const fade = this.preset.fadeOutSec;
    const now = this.ctx.currentTime;
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
    this.merger?.disconnect();
    this.gain?.disconnect();
    this.master?.disconnect();
    this.analyser?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.merger = null;
    this.gain = null;
    this.master = null;
    this.analyser = null;
    this.preset = null;
  }
}
