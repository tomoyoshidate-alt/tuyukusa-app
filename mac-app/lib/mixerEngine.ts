import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import {
  createChannelHighPass,
  createMasterCompressor,
  createMasterLimiter,
} from "@/src/lib/audioQuality";
import { BBEngine } from "./bbEngine";
import { GranularEngine } from "./granularEngine";
import type { BBPreset, GranularPreset } from "./types";

export type MixerSlot =
  | { kind: "bb"; preset: BBPreset; volume: number }
  | { kind: "granular"; preset: GranularPreset; volume: number }
  | null;

export class MixerEngine {
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: WaveShaperNode | null = null;
  private channelHpfs: [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode] | null = null;
  private analyser: AnalyserNode | null = null;
  private bb = new BBEngine();
  private granular2 = new GranularEngine();
  private granular3 = new GranularEngine();
  private audioBaseUrl = "";
  private playing = false;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private ensureMaster(): void {
    if (!audioCtx) return;
    if (this.master) return;

    this.compressor = createMasterCompressor(audioCtx);
    this.master = audioCtx.createGain();
    this.limiter = createMasterLimiter(audioCtx);
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.channelHpfs = [
      createChannelHighPass(audioCtx),
      createChannelHighPass(audioCtx),
      createChannelHighPass(audioCtx),
    ];
    this.channelHpfs.forEach(hpf => {
      if (this.compressor) hpf.connect(this.compressor);
    });

    this.compressor.connect(this.master);
    this.master.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(audioCtx.destination);
  }

  private getChannelInput(slot: 0 | 1 | 2): BiquadFilterNode | null {
    return this.channelHpfs?.[slot] ?? null;
  }

  async play(slots: [MixerSlot, MixerSlot, MixerSlot], masterVol: number, audioBaseUrl = ""): Promise<void> {
    if (!audioCtx) return;
    await this.stopEngines();
    await resumeAudioCtx();
    this.audioBaseUrl = audioBaseUrl;
    this.ensureMaster();
    if (!this.master) return;

    this.master.gain.value = masterVol;
    const tasks: Promise<void>[] = [];
    const [s1, s2, s3] = slots;
    const ch0 = this.getChannelInput(0);
    const ch1 = this.getChannelInput(1);
    const ch2 = this.getChannelInput(2);
    if (s1?.kind === "bb" && ch0) tasks.push(this.bb.start(s1.preset, ch0, s1.volume));
    if (s2?.kind === "granular" && ch1)
      tasks.push(this.granular2.start(s2.preset, ch1, s2.volume, this.audioBaseUrl));
    if (s3?.kind === "granular" && ch2)
      tasks.push(this.granular3.start(s3.preset, ch2, s3.volume, this.audioBaseUrl));
    await Promise.all(tasks);
    this.playing = true;
  }

  setMasterVolume(v: number): void {
    if (this.master && audioCtx) {
      this.master.gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
    }
  }

  updateGranularPreset(slot: 2 | 3, preset: GranularPreset): void {
    const engine = slot === 2 ? this.granular2 : this.granular3;
    engine.updatePreset(preset);
  }

  private async stopEngines(): Promise<void> {
    await Promise.all([this.bb.stop(), this.granular2.stop(), this.granular3.stop()]);
  }

  async stop(): Promise<void> {
    this.playing = false;
    await this.stopEngines();
  }
}
