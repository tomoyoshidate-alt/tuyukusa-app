import { audioCtx, resumeAudioCtx } from "@/src/lib/audioContext";
import { BBEngine } from "./bbEngine";
import { GranularEngine } from "./granularEngine";
import type { BBPreset, GranularPreset } from "./types";

export type MixerSlot =
  | { kind: "bb"; preset: BBPreset; volume: number }
  | { kind: "granular"; preset: GranularPreset; volume: number }
  | null;

export class MixerEngine {
  private master: GainNode | null = null;
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
    this.master = audioCtx.createGain();
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);
    this.analyser.connect(audioCtx.destination);
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
    if (s1?.kind === "bb") tasks.push(this.bb.start(s1.preset, this.master, s1.volume));
    if (s2?.kind === "granular")
      tasks.push(this.granular2.start(s2.preset, this.master, s2.volume, this.audioBaseUrl));
    if (s3?.kind === "granular")
      tasks.push(this.granular3.start(s3.preset, this.master, s3.volume, this.audioBaseUrl));
    await Promise.all(tasks);
    this.playing = true;
  }

  setMasterVolume(v: number): void {
    if (this.master && audioCtx) {
      this.master.gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
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
