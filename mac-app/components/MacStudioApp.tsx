"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomSlider } from "@/components/CustomSlider";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { classifyBrainwave, brainwaveDescription, getBbDiffHz } from "@/lib/brainwave";
import { MixerEngine, type MixerSlot } from "@/lib/mixerEngine";
import {
  exportJson,
  fetchAudioFiles,
  fetchBbPresets,
  fetchGranularPresets,
  saveBbPresets,
  saveGranularPresets,
} from "@/lib/presetClient";
import {
  DEFAULT_BB_PRESET,
  DEFAULT_GRANULAR_PRESET,
  type BBPreset,
  type BBWaveform,
  type GranularPreset,
  type LfoWaveform,
} from "@/lib/types";

type EditorTab = "bb" | "granular";

export function MacStudioApp() {
  const [tab, setTab] = useState<EditorTab>("bb");
  const [bbPresets, setBbPresets] = useState<BBPreset[]>([]);
  const [granularPresets, setGranularPresets] = useState<GranularPreset[]>([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [bbDraft, setBbDraft] = useState<BBPreset>(DEFAULT_BB_PRESET());
  const [grDraft, setGrDraft] = useState<GranularPreset>(DEFAULT_GRANULAR_PRESET());
  const [selectedBbId, setSelectedBbId] = useState<string | null>(null);
  const [selectedGrId, setSelectedGrId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [playing, setPlaying] = useState(false);
  const [masterVol, setMasterVol] = useState(80);
  const [slot1BbId, setSlot1BbId] = useState("");
  const [slot2GrId, setSlot2GrId] = useState("");
  const [slot3GrId, setSlot3GrId] = useState("");
  const [slot1Vol, setSlot1Vol] = useState(80);
  const [slot2Vol, setSlot2Vol] = useState(70);
  const [slot3Vol, setSlot3Vol] = useState(70);

  const mixerRef = useRef(new MixerEngine());

  const bbDiff = useMemo(() => getBbDiffHz(bbDraft.leftHz, bbDraft.rightHz), [bbDraft.leftHz, bbDraft.rightHz]);
  const brainwave = useMemo(() => classifyBrainwave(bbDiff), [bbDiff]);

  const loadAll = useCallback(async () => {
    const [bb, gr, files] = await Promise.all([fetchBbPresets(), fetchGranularPresets(), fetchAudioFiles()]);
    setBbPresets(bb.presets ?? []);
    setGranularPresets(gr.presets ?? []);
    setAudioFiles(files);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const saveBb = async () => {
    const updated = { ...bbDraft, updatedAt: new Date().toISOString() };
    const list = selectedBbId
      ? bbPresets.map(p => (p.id === selectedBbId ? updated : p))
      : [...bbPresets, { ...updated, id: crypto.randomUUID() }];
    const result = await saveBbPresets({ presets: list });
    setBbPresets(list);
    setSelectedBbId(updated.id);
    setStatus(result.message ?? (result.ok ? "BBプリセットを保存しました" : "保存に失敗しました"));
    if (!result.ok) exportJson("bb-presets.json", { presets: list });
  };

  const saveGr = async () => {
    const updated = { ...grDraft, updatedAt: new Date().toISOString() };
    const list = selectedGrId
      ? granularPresets.map(p => (p.id === selectedGrId ? updated : p))
      : [...granularPresets, { ...updated, id: crypto.randomUUID() }];
    const result = await saveGranularPresets({ presets: list });
    setGranularPresets(list);
    setSelectedGrId(updated.id);
    setStatus(result.message ?? (result.ok ? "グラニュラープリセットを保存しました" : "保存に失敗しました"));
    if (!result.ok) exportJson("granular-presets.json", { presets: list });
  };

  const newBb = () => {
    const p = DEFAULT_BB_PRESET();
    setBbDraft(p);
    setSelectedBbId(null);
    setTab("bb");
  };

  const newGr = () => {
    const p = DEFAULT_GRANULAR_PRESET();
    setGrDraft(p);
    setSelectedGrId(null);
    setTab("granular");
  };

  const buildSlots = (): [MixerSlot, MixerSlot, MixerSlot] => {
    const bb = bbPresets.find(p => p.id === slot1BbId);
    const g2 = granularPresets.find(p => p.id === slot2GrId);
    const g3 = granularPresets.find(p => p.id === slot3GrId);
    return [
      bb ? { kind: "bb", preset: bb, volume: slot1Vol / 100 } : null,
      g2 ? { kind: "granular", preset: { ...g2, audioFile: g2.audioFile }, volume: slot2Vol / 100 } : null,
      g3 ? { kind: "granular", preset: { ...g3, audioFile: g3.audioFile }, volume: slot3Vol / 100 } : null,
    ];
  };

  const audioBase = useMemo(() => {
    const origin = process.env.NEXT_PUBLIC_ASSET_ORIGIN ?? "";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return `${origin}${basePath}`;
  }, []);

  const togglePlay = async () => {
    if (playing) {
      await mixerRef.current.stop();
      setPlaying(false);
      return;
    }
    await mixerRef.current.play(buildSlots(), masterVol / 100, audioBase);
    setPlaying(true);
  };

  useEffect(() => {
    mixerRef.current.setMasterVolume(masterVol / 100);
  }, [masterVol]);

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-[#e8e8e8] font-sans">
      {/* 左パネル */}
      <aside className="w-[240px] shrink-0 bg-[#242424] border-r border-[#333] flex flex-col">
        <div className="p-4 border-b border-[#333]">
          <h1 className="text-sm font-bold text-[#5DCAA5] tracking-wide">つゆくさ Studio</h1>
          <p className="text-[10px] text-[#888] mt-1 font-mono">Mac Preset Editor</p>
        </div>
        <div className="p-3 flex gap-2">
          <button type="button" onClick={newBb} className="flex-1 mac-btn text-xs">
            + BB
          </button>
          <button type="button" onClick={newGr} className="flex-1 mac-btn text-xs">
            + Granular
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="text-[10px] uppercase tracking-wider text-[#666] px-2 py-2 font-mono">BB Presets</div>
          {bbPresets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setBbDraft(p);
                setSelectedBbId(p.id);
                setTab("bb");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${selectedBbId === p.id && tab === "bb" ? "bg-[#5DCAA5]/20 text-[#5DCAA5]" : "hover:bg-[#333]"}`}
            >
              {p.icon && <span className="mr-1">{p.icon}</span>}
              {p.name}
            </button>
          ))}
          <div className="text-[10px] uppercase tracking-wider text-[#666] px-2 py-2 mt-3 font-mono">Granular</div>
          {granularPresets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setGrDraft(p);
                setSelectedGrId(p.id);
                setTab("granular");
              }}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${selectedGrId === p.id && tab === "granular" ? "bg-[#5DCAA5]/20 text-[#5DCAA5]" : "hover:bg-[#333]"}`}
            >
              {p.icon && <span className="mr-1">{p.icon}</span>}
              {p.name}
            </button>
          ))}
        </div>
      </aside>

      {/* 中央パネル */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-2 mb-6">
          <button type="button" onClick={() => setTab("bb")} className={`mac-tab ${tab === "bb" ? "mac-tab--active" : ""}`}>
            BBプリセット
          </button>
          <button type="button" onClick={() => setTab("granular")} className={`mac-tab ${tab === "granular" ? "mac-tab--active" : ""}`}>
            グラニュライザー
          </button>
        </div>

        {tab === "bb" ? (
          <div className="max-w-xl">
            <div className="flex gap-2 mb-4">
              <input
                className="mac-input flex-1"
                value={bbDraft.icon ?? ""}
                onChange={e => setBbDraft({ ...bbDraft, icon: e.target.value })}
                placeholder="icon"
                maxLength={2}
                style={{ width: 48 }}
              />
              <input
                className="mac-input flex-1"
                value={bbDraft.name}
                onChange={e => setBbDraft({ ...bbDraft, name: e.target.value })}
                placeholder="プリセット名"
              />
            </div>
            <CustomSlider label="左耳周波数" value={bbDraft.leftHz} min={80} max={500} unit="Hz" onChange={v => setBbDraft({ ...bbDraft, leftHz: v })} />
            <CustomSlider label="右耳周波数" value={bbDraft.rightHz} min={80} max={500} unit="Hz" onChange={v => setBbDraft({ ...bbDraft, rightHz: v })} />
            <div className="mac-info mb-4">
              <div>BB差: <strong className="text-[#5DCAA5]">{bbDiff.toFixed(1)} Hz</strong></div>
              <div>脳波: <strong className="text-[#5DCAA5]">{brainwave}</strong> — {brainwaveDescription(brainwave)}</div>
            </div>
            <label className="block mb-4 text-xs text-[#a8a8a8]">
              ウェーブ形状
              <select
                className="mac-input w-full mt-1"
                value={bbDraft.waveform}
                onChange={e => setBbDraft({ ...bbDraft, waveform: e.target.value as BBWaveform })}
              >
                <option value="sine">サイン波</option>
                <option value="square">矩形波</option>
                <option value="triangle">三角波</option>
              </select>
            </label>
            <CustomSlider label="フェードイン" value={bbDraft.fadeInSec} min={0} max={30} unit="s" onChange={v => setBbDraft({ ...bbDraft, fadeInSec: v })} />
            <CustomSlider label="フェードアウト" value={bbDraft.fadeOutSec} min={0} max={30} unit="s" onChange={v => setBbDraft({ ...bbDraft, fadeOutSec: v })} />
            <CustomSlider label="マスターボリューム" value={bbDraft.masterVolume} min={0} max={100} unit="%" onChange={v => setBbDraft({ ...bbDraft, masterVolume: v })} />
            <label className="block mb-4 text-xs text-[#a8a8a8]">
              メモ
              <textarea className="mac-input w-full mt-1 min-h-[80px]" value={bbDraft.memo} onChange={e => setBbDraft({ ...bbDraft, memo: e.target.value })} />
            </label>
            <button type="button" onClick={() => void saveBb()} className="mac-btn-primary">
              保存
            </button>
          </div>
        ) : (
          <div className="max-w-xl">
            <div className="flex gap-2 mb-4">
              <input className="mac-input" value={grDraft.icon ?? ""} onChange={e => setGrDraft({ ...grDraft, icon: e.target.value })} placeholder="icon" maxLength={2} style={{ width: 48 }} />
              <input className="mac-input flex-1" value={grDraft.name} onChange={e => setGrDraft({ ...grDraft, name: e.target.value })} placeholder="プリセット名" />
            </div>
            <label className="block mb-4 text-xs text-[#a8a8a8]">
              音源ファイル
              <select className="mac-input w-full mt-1" value={grDraft.audioFile} onChange={e => setGrDraft({ ...grDraft, audioFile: e.target.value })}>
                <option value="">選択してください</option>
                {audioFiles.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <CustomSlider label="グレインサイズ" value={grDraft.grainSizeMs} min={20} max={500} unit="ms" onChange={v => setGrDraft({ ...grDraft, grainSizeMs: v })} />
            <CustomSlider label="グレイン密度" value={grDraft.grainDensity} min={1} max={50} unit="/s" onChange={v => setGrDraft({ ...grDraft, grainDensity: v })} />
            <CustomSlider label="オーバーラップ" value={grDraft.overlapPct} min={0} max={100} unit="%" onChange={v => setGrDraft({ ...grDraft, overlapPct: v })} />
            <CustomSlider label="再生ポジション" value={grDraft.positionPct} min={0} max={100} unit="%" onChange={v => setGrDraft({ ...grDraft, positionPct: v })} />
            <CustomSlider label="ランダムネス" value={grDraft.randomnessPct} min={0} max={100} unit="%" onChange={v => setGrDraft({ ...grDraft, randomnessPct: v })} />
            <CustomSlider label="ピッチシフト" value={grDraft.pitchSemis} min={-12} max={12} unit="st" onChange={v => setGrDraft({ ...grDraft, pitchSemis: v })} />
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" checked={grDraft.lfoEnabled} onChange={e => setGrDraft({ ...grDraft, lfoEnabled: e.target.checked })} />
              LFO ON
            </label>
            {grDraft.lfoEnabled && (
              <>
                <CustomSlider label="LFO速度" value={grDraft.lfoSpeedHz} min={0.01} max={2} step={0.01} unit="Hz" onChange={v => setGrDraft({ ...grDraft, lfoSpeedHz: v })} />
                <CustomSlider label="LFO深さ" value={grDraft.lfoDepthSemis} min={0} max={6} unit="st" onChange={v => setGrDraft({ ...grDraft, lfoDepthSemis: v })} />
                <label className="block mb-4 text-xs text-[#a8a8a8]">
                  LFO波形
                  <select className="mac-input w-full mt-1" value={grDraft.lfoWaveform} onChange={e => setGrDraft({ ...grDraft, lfoWaveform: e.target.value as LfoWaveform })}>
                    <option value="sine">サイン波</option>
                    <option value="triangle">三角波</option>
                    <option value="random">ランダム</option>
                  </select>
                </label>
              </>
            )}
            <CustomSlider label="リバーブ" value={grDraft.reverbPct} min={0} max={100} unit="%" onChange={v => setGrDraft({ ...grDraft, reverbPct: v })} />
            <CustomSlider label="ボリューム" value={grDraft.volume} min={0} max={100} unit="%" onChange={v => setGrDraft({ ...grDraft, volume: v })} />
            <label className="block mb-4 text-xs text-[#a8a8a8]">
              メモ
              <textarea className="mac-input w-full mt-1 min-h-[80px]" value={grDraft.memo} onChange={e => setGrDraft({ ...grDraft, memo: e.target.value })} />
            </label>
            <button type="button" onClick={() => void saveGr()} className="mac-btn-primary">
              保存
            </button>
          </div>
        )}
        {status && <p className="mt-4 text-xs text-[#5DCAA5] font-mono">{status}</p>}
      </main>

      {/* 右パネル */}
      <aside className="w-[300px] shrink-0 bg-[#242424] border-l border-[#333] p-4 flex flex-col">
        <h2 className="text-sm font-bold mb-4 text-[#5DCAA5]">ミキサー / 試聴</h2>
        <label className="text-xs text-[#888] mb-1 block">スロット1 — BB</label>
        <select className="mac-input w-full mb-2" value={slot1BbId} onChange={e => setSlot1BbId(e.target.value)}>
          <option value="">なし</option>
          {bbPresets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <CustomSlider label="Slot1 Vol" value={slot1Vol} min={0} max={100} unit="%" onChange={setSlot1Vol} />
        <label className="text-xs text-[#888] mb-1 block mt-2">スロット2 — Granular</label>
        <select className="mac-input w-full mb-2" value={slot2GrId} onChange={e => setSlot2GrId(e.target.value)}>
          <option value="">なし</option>
          {granularPresets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <CustomSlider label="Slot2 Vol" value={slot2Vol} min={0} max={100} unit="%" onChange={setSlot2Vol} />
        <label className="text-xs text-[#888] mb-1 block mt-2">スロット3 — Granular</label>
        <select className="mac-input w-full mb-2" value={slot3GrId} onChange={e => setSlot3GrId(e.target.value)}>
          <option value="">なし</option>
          {granularPresets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <CustomSlider label="Slot3 Vol" value={slot3Vol} min={0} max={100} unit="%" onChange={setSlot3Vol} />
        <CustomSlider label="マスター" value={masterVol} min={0} max={100} unit="%" onChange={setMasterVol} />
        <div className="flex gap-3 my-4">
          <button type="button" onClick={() => void togglePlay()} className="mac-play-btn flex-1">
            {playing ? "■ 停止" : "▶ 再生"}
          </button>
        </div>
        <WaveformVisualizer active={playing} getAnalyser={() => mixerRef.current.getAnalyser()} />
        <p className="text-[10px] text-[#666] mt-4 font-mono leading-relaxed">
          音源: ../public/audio/
          <br />
          プリセット: ../public/presets/
        </p>
      </aside>
    </div>
  );
}
