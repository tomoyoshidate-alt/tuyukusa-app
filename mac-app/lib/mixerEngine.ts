import { getAudioContext, resumeAudioContext } from "@/src/lib/audioContext";
import { BBEngine } from "./bbEngine";
import { GranularEngine } from "./granularEngine";
import type { BBPreset, GranularPreset } from "./types";

export type MixerSlot =
  | { kind: "bb"; preset: BBPreset; volume: number }
  | { kind: "granular"; preset: GranularPreset; volume: number }
  | null;

export class MixerEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bb = new BBEngine();
  private granular2 = new GranularEngine();
  private granular3 = new GranularEngine();
  private audioBaseUrl = "";
  private masterVolume = 0.8;
  private playing = false;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private setupGraph(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  async play(slots: [MixerSlot, MixerSlot, MixerSlot], masterVol: number, audioBaseUrl = ""): Promise<void> {
    await this.stopEngines();
    this.masterVolume = masterVol;
    this.audioBaseUrl = audioBaseUrl;
    const ctx = getAudioContext();
    await resumeAudioContext();
    this.ctx = ctx;

    if (!this.master || this.master.context !== ctx) {
      this.master = null;
      this.analyser = null;
      this.setupGraph(ctx);
    }

    this.master!.gain.value = masterVol;
    const tasks: Promise<void>[] = [];
    const [s1, s2, s3] = slots;
    if (s1?.kind === "bb") tasks.push(this.bb.start(s1.preset, this.master!, s1.volume));
    if (s2?.kind === "granular")
      tasks.push(this.granular2.start(s2.preset, this.master!, s2.volume, this.audioBaseUrl));
    if (s3?.kind === "granular")
      tasks.push(this.granular3.start(s3.preset, this.master!, s3.volume, this.audioBaseUrl));
    await Promise.all(tasks);
    this.playing = true;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    }
  }

  private async stopEngines(): Promise<void> {
    await Promise.all([this.bb.stop(), this.granular2.stop(), this.granular3.stop()]);
  }

  async stop(): Promise<void> {
    this.playing = false;
    await this.stopEngines();
  }
}
