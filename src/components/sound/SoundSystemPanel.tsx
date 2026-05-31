'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AMBIENT_SOUND_PRESETS,
  BINURAL_BEAT_PRESETS,
  getRecommendedBeatId,
  getStudioBeatPresets,
  type AmbientSoundId,
} from "@/src/lib/binauralBeats";
import { STUDIO_PRESETS_LOADED_EVENT, getStudioGranularPresets } from "@/src/components/StudioPresetsLoader";
import { studioGranularToParams } from "@/src/lib/studioPresets";
import { readPresets, readPlaylistSettings } from "@/src/lib/soundSystem/presetStorage";
import { soundSystemManager } from "@/src/lib/soundSystem/soundSystemManager";
import type {
  BinauralChannelConfig,
  ChannelConfig,
  GranularParams,
  OverlayOption,
  PlaylistSettings,
  SoundPreset,
  SoundSystemSnapshot,
  VisualizerEffect,
} from "@/src/lib/soundSystem/types";
import {
  DEFAULT_GRANULAR_PARAMS,
  DEFAULT_VISUALIZER_SETTINGS,
  DEMO_SOURCE_OPTIONS,
  OVERLAY_OPTIONS,
  VISUALIZER_EFFECTS,
  formatPitchShiftLabel,
} from "@/src/lib/soundSystem/types";
import SoundVisualizer from "@/src/components/sound/SoundVisualizer";
import NatureVisualizer from "@/src/components/NatureVisualizer";
import MoonCloudVisualizer from "@/src/components/MoonCloudVisualizer";
import PomodoroTimer from "@/src/components/PomodoroTimer";
import BinauralExplainPage from "@/src/components/BinauralExplainPage";

type Props = {
  diagnosis?: string;
  scheduleRemainingSec?: number;
  initialMode?: "mixer" | "pomodoro";
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: "bold", color: "#8b5a2b", marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5a4a3a", marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}{unit ?? ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  );
}

type SceneVizMode = "default" | "moonWater" | "moonCloud";

export default function SoundSystemPanel({
  diagnosis = "水滞",
  scheduleRemainingSec = 0,
  initialMode = "mixer",
}: Props) {
  const recommendedId = getRecommendedBeatId(diagnosis);
  const [panelMode, setPanelMode] = useState<"mixer" | "pomodoro">(initialMode);
  const [showExplain, setShowExplain] = useState(false);
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(0);
  const [snapshot, setSnapshot] = useState<SoundSystemSnapshot>(() => soundSystemManager.getSnapshot());
  const [presets, setPresets] = useState<SoundPreset[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistSettings>(() => readPlaylistSettings());
  const [presetName, setPresetName] = useState("");
  const [vizEffect, setVizEffect] = useState<VisualizerEffect>(DEFAULT_VISUALIZER_SETTINGS.effect);
  const [vizOverlays, setVizOverlays] = useState<OverlayOption[]>(DEFAULT_VISUALIZER_SETTINGS.overlays);
  const [screensaver, setScreensaver] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [sceneViz, setSceneViz] = useState<SceneVizMode>("default");
  const [studioBbPresets, setStudioBbPresets] = useState(() => getStudioBeatPresets());
  const [studioGranularPresets, setStudioGranularPresets] = useState(() => getStudioGranularPresets());

  const updatePlaylist = (next: PlaylistSettings) => {
    soundSystemManager.setPlaylistSettings(next);
    setPlaylist(next);
  };

  useEffect(() => {
    setPanelMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setPresets(readPresets());
    setPlaylist(readPlaylistSettings());
    return soundSystemManager.subscribe(s => {
      setSnapshot(s);
      setAnalyser(soundSystemManager.getAnalyser());
    });
  }, []);

  useEffect(() => {
    const onLoaded = () => {
      setStudioBbPresets(getStudioBeatPresets());
      setStudioGranularPresets(getStudioGranularPresets());
    };
    window.addEventListener(STUDIO_PRESETS_LOADED_EVENT, onLoaded);
    return () => window.removeEventListener(STUDIO_PRESETS_LOADED_EVENT, onLoaded);
  }, []);

  const channels = snapshot.channels;

  const updateChannel = useCallback((index: 0 | 1 | 2, config: ChannelConfig) => {
    soundSystemManager.setChannel(index, config);
  }, []);

  const togglePlay = async () => {
    await soundSystemManager.togglePlay();
    setAnalyser(soundSystemManager.getAnalyser());
  };

  const savePreset = () => {
    const p = soundSystemManager.saveCurrentAsPreset(presetName);
    setPresets(readPresets());
    setPresetName("");
    void p;
  };

  const loadPreset = (p: SoundPreset) => {
    soundSystemManager.loadPreset(p);
    if (!snapshot.isPlaying) void soundSystemManager.start();
  };

  const toggleOverlay = (id: OverlayOption) => {
    if (id === "none") {
      setVizOverlays(["none"]);
      return;
    }
    setVizOverlays(prev => {
      const withoutNone = prev.filter(o => o !== "none");
      return withoutNone.includes(id) ? withoutNone.filter(o => o !== id) : [...withoutNone, id];
    });
  };

  const slotLabels = ["Ch1 BB", "Ch2", "Ch3"];
  const ch0 = channels[0] as BinauralChannelConfig;
  const chActive = channels[activeSlot];

  const pomodoroAmbient = ch0.type === "binaural" ? ch0.binauralAmbientId : "rain";

  const playlistPresets = useMemo(
    () => playlist.presetIds.map(id => presets.find(p => p.id === id)).filter(Boolean) as SoundPreset[],
    [playlist.presetIds, presets]
  );

  if (showExplain) {
    return (
      <BinauralExplainPage
        onClose={() => setShowExplain(false)}
        onTryBB={() => setShowExplain(false)}
      />
    );
  }

  if (screensaver) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#0a0806" }}>
        {sceneViz === "moonWater" ? (
          <NatureVisualizer mode="moonWater" analyser={analyser} fullscreen onTap={() => setScreensaver(false)} />
        ) : sceneViz === "moonCloud" ? (
          <div style={{ height: "100vh", overflow: "auto" }} onClick={() => setScreensaver(false)} role="button" tabIndex={0}>
            <MoonCloudVisualizer />
          </div>
        ) : (
          <SoundVisualizer
            analyser={analyser}
            effect={vizEffect}
            overlays={vizOverlays}
            presetRemainingSec={snapshot.presetRemainingSec}
            scheduleRemainingSec={scheduleRemainingSec}
            fullscreen
            onTap={() => setScreensaver(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 100px", color: "#f5f0e8" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: "bold" }}>サウンド</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
          グラニュライザー · 3chミキサー · プレイリスト
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["mixer", "pomodoro"] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setPanelMode(mode)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: panelMode === mode ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.12)",
              background: panelMode === mode ? "rgba(232,168,106,0.15)" : "rgba(255,255,255,0.04)",
              color: "#f5f0e8",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {mode === "mixer" ? "ミキサー" : "ポモドーロ"}
          </button>
        ))}
      </div>

      {panelMode === "pomodoro" ? (
        <PomodoroTimer
          ambientId={pomodoroAmbient}
          masterVolume={snapshot.masterVolume}
          binauralVolume={0.45}
          ambientVolume={0.35}
        />
      ) : (
        <>
          {sceneViz === "moonWater" ? (
            <NatureVisualizer mode="moonWater" analyser={analyser} height={160} />
          ) : sceneViz === "moonCloud" ? (
            <MoonCloudVisualizer />
          ) : (
            <SoundVisualizer
              analyser={analyser}
              effect={vizEffect}
              overlays={vizOverlays}
              presetRemainingSec={snapshot.presetRemainingSec}
              scheduleRemainingSec={scheduleRemainingSec}
            />
          )}

          <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <button
              type="button"
              onClick={() => void togglePlay()}
              style={{
                flex: 1,
                padding: "14px 0",
                borderRadius: 12,
                border: "none",
                background: snapshot.isPlaying ? "#8b4545" : "#4a6741",
                color: "white",
                fontSize: 15,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {snapshot.isPlaying ? "停止" : "再生"}
            </button>
            <button
              type="button"
              onClick={() => setScreensaver(true)}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#f5f0e8",
                cursor: "pointer",
              }}
            >
              全画面
            </button>
          </div>

          <SliderRow
            label="マスター音量"
            value={Math.round(snapshot.masterVolume * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={v => soundSystemManager.setMasterVolume(v / 100)}
          />

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([0, 1, 2] as const).map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlot(i)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: activeSlot === i ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                  background: activeSlot === i ? "rgba(232,168,106,0.12)" : "transparent",
                  color: "#f5f0e8",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {slotLabels[i]}
              </button>
            ))}
          </div>

          <SliderRow
            label={`${slotLabels[activeSlot]} 音量`}
            value={Math.round(chActive.volume * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={v => updateChannel(activeSlot, { ...chActive, volume: v / 100 })}
          />

          {activeSlot === 0 && ch0.type === "binaural" && (
            <>
              <button
                type="button"
                onClick={() => setShowExplain(true)}
                style={{
                  width: "100%",
                  marginBottom: 12,
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#e8a86a",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                バイノーラルビートとは？
              </button>
              <SectionTitle>バイノーラルビート（Ch1）</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                {BINURAL_BEAT_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      updateChannel(0, { ...ch0, binauralBeatId: p.id })
                    }
                    style={{
                      textAlign: "left",
                      padding: "8px",
                      borderRadius: 8,
                      border: ch0.binauralBeatId === p.id ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                      background: ch0.binauralBeatId === p.id ? "rgba(232,168,106,0.12)" : "rgba(255,255,255,0.03)",
                      color: "#f5f0e8",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {p.emoji} {p.label}
                    {p.id === recommendedId && " (推奨)"}
                  </button>
                ))}
              </div>
              {studioBbPresets.length > 0 && (
                <>
                  <SectionTitle>Studio BB プリセット</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {studioBbPresets.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateChannel(0, { ...ch0, binauralBeatId: p.id })}
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderRadius: 8,
                          border: ch0.binauralBeatId === p.id ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                          background: ch0.binauralBeatId === p.id ? "rgba(126,200,227,0.15)" : "rgba(255,255,255,0.03)",
                          color: "#f5f0e8",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <SectionTitle>BB背景音</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {AMBIENT_SOUND_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      updateChannel(0, { ...ch0, binauralAmbientId: p.id as AmbientSoundId })
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 16,
                      border: ch0.binauralAmbientId === p.id ? "2px solid #4a6741" : "1px solid rgba(255,255,255,0.1)",
                      background: ch0.binauralAmbientId === p.id ? "rgba(74,103,65,0.25)" : "rgba(255,255,255,0.03)",
                      color: "#f5f0e8",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeSlot !== 0 && chActive.type === "granular" && (
            <>
              {studioGranularPresets.length > 0 && (
                <>
                  <SectionTitle>Studio グラニュラー</SectionTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {studioGranularPresets.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          updateChannel(activeSlot, {
                            ...chActive,
                            audioFile: p.audioFile,
                            granular: studioGranularToParams(p),
                          })
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: 16,
                          border: chActive.audioFile === p.audioFile ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                          background: chActive.audioFile === p.audioFile ? "rgba(126,200,227,0.15)" : "rgba(255,255,255,0.03)",
                          color: "#f5f0e8",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {p.icon ?? ""} {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <SectionTitle>デモ音源</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {DEMO_SOURCE_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      updateChannel(activeSlot, { ...chActive, sourceId: s.id, audioFile: undefined })
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 16,
                      border: chActive.sourceId === s.id ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                      background: chActive.sourceId === s.id ? "rgba(126,200,227,0.15)" : "rgba(255,255,255,0.03)",
                      color: "#f5f0e8",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              <GranularControls
                params={chActive.granular}
                onChange={g => updateChannel(activeSlot, { ...chActive, granular: g })}
              />
            </>
          )}

          <SectionTitle>プリセット保存</SectionTitle>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="プリセット名"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#f5f0e8",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={!presetName.trim()}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#4a6741",
                color: "white",
                cursor: presetName.trim() ? "pointer" : "default",
                opacity: presetName.trim() ? 1 : 0.5,
              }}
            >
              保存
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {presets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => loadPreset(p)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 16,
                  border: snapshot.currentPresetId === p.id ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#f5f0e8",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          <SectionTitle>プレイリスト</SectionTitle>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["asc", "desc", "random"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => updatePlaylist({ ...playlist, mode: m })}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: playlist.mode === m ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#f5f0e8",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {m === "asc" ? "昇順" : m === "desc" ? "降順" : "ランダム"}
              </button>
            ))}
          </div>
          <SliderRow
            label="フェード時間"
            value={playlist.fadeSec}
            min={0}
            max={180}
            step={1}
            unit="秒"
            onChange={v => updatePlaylist({ ...playlist, fadeSec: v })}
          />
          <SliderRow
            label="プリセット再生時間"
            value={playlist.presetDurationSec}
            min={1}
            max={600}
            step={1}
            unit="秒"
            onChange={v => updatePlaylist({ ...playlist, presetDurationSec: v })}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {presets.map(p => {
              const inList = playlist.presetIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const ids = inList
                      ? playlist.presetIds.filter(id => id !== p.id)
                      : [...playlist.presetIds, p.id];
                    updatePlaylist({ ...playlist, presetIds: ids });
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 14,
                    border: inList ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                    background: inList ? "rgba(126,200,227,0.12)" : "rgba(255,255,255,0.03)",
                    color: "#f5f0e8",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  {inList ? "" : "+ "}{p.name}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => void soundSystemManager.startPlaylist()}
              disabled={playlistPresets.length === 0}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: "#4a6741",
                color: "white",
                cursor: playlistPresets.length ? "pointer" : "default",
                opacity: playlistPresets.length ? 1 : 0.5,
              }}
            >
              プレイリスト再生
            </button>
            <button
              type="button"
              onClick={() => soundSystemManager.stopPlaylist()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#f5f0e8",
                cursor: "pointer",
              }}
            >
              停止
            </button>
          </div>
          {snapshot.isPlaylistActive && (
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>
              再生中: {snapshot.currentPresetName ?? "—"} · 残り {snapshot.presetRemainingSec}秒 ·{" "}
              {snapshot.playlistIndex + 1}/{snapshot.playlistTotal}
            </div>
          )}

          <SectionTitle>ビジュアライザー</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setSceneViz("default")}
              style={{
                padding: "6px 10px",
                borderRadius: 14,
                border: sceneViz === "default" ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f0e8",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              スペクトラム
            </button>
            <button
              type="button"
              onClick={() => setSceneViz("moonWater")}
              style={{
                padding: "6px 10px",
                borderRadius: 14,
                border: sceneViz === "moonWater" ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f0e8",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              月の水面
            </button>
            <button
              type="button"
              onClick={() => setSceneViz("moonCloud")}
              style={{
                padding: "6px 10px",
                borderRadius: 14,
                border: sceneViz === "moonCloud" ? "2px solid #c8d8e8" : "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f0e8",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              月夜
            </button>
          </div>
          {sceneViz === "default" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {VISUALIZER_EFFECTS.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => setVizEffect(e.id)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 14,
                  border: vizEffect === e.id ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#f5f0e8",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {e.emoji} {e.label}
              </button>
            ))}
          </div>
          )}
          {sceneViz === "default" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {OVERLAY_OPTIONS.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleOverlay(o.id)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 14,
                  border: vizOverlays.includes(o.id) ? "2px solid #7ec8e3" : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#f5f0e8",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  );
}

function GranularControls({
  params,
  onChange,
}: {
  params: GranularParams;
  onChange: (p: GranularParams) => void;
}) {
  const set = (patch: Partial<GranularParams>) =>
    onChange({ ...params, ...patch });

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionTitle>グラニュライザー</SectionTitle>
      <SliderRow label="Grain Size" value={params.grainSizeMs} min={10} max={500} step={5} unit="ms" onChange={v => set({ grainSizeMs: v })} />
      <SliderRow label="Overlap" value={params.overlap} min={0} max={100} step={1} unit="%" onChange={v => set({ overlap: v })} />
      <SliderRow label="Position" value={params.position} min={0} max={100} step={1} unit="%" onChange={v => set({ position: v })} />
      <SliderRow label="Randomness" value={params.randomness} min={0} max={100} step={1} unit="%" onChange={v => set({ randomness: v })} />

      <div style={{ marginTop: 14, marginBottom: 10, fontSize: 12, fontWeight: "bold", color: "#e8a86a" }}>
        Pitch Shift
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a8b7a", marginBottom: 4 }}>
        <span>-4 oct</span>
        <span>{formatPitchShiftLabel(params.pitchShift)}</span>
        <span>+24 oct</span>
      </div>
      <input
        type="range"
        min={-48}
        max={288}
        step={1}
        value={params.pitchShift}
        onChange={e => set({ pitchShift: Number(e.target.value) })}
        style={{ width: "100%", marginBottom: 16, accentColor: "#e8a86a" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: "bold", color: "#e8a86a" }}>LFO</div>
        <button
          type="button"
          onClick={() => set({ lfoEnabled: !params.lfoEnabled })}
          style={{
            padding: "4px 12px",
            borderRadius: 12,
            border: params.lfoEnabled ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.15)",
            background: params.lfoEnabled ? "rgba(232,168,106,0.2)" : "transparent",
            color: "#f5f0e8",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {params.lfoEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ marginBottom: 10, opacity: params.lfoEnabled ? 1 : 0.45 }}>
        <div style={{ fontSize: 11, color: "#5a4a3a", marginBottom: 4 }}>Wave</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["sine", "square", "random"] as const).map(s => (
            <button
              key={s}
              type="button"
              disabled={!params.lfoEnabled}
              onClick={() => set({ lfoShape: s })}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: 8,
                border: params.lfoShape === s ? "2px solid #e8a86a" : "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f5f0e8",
                fontSize: 10,
                cursor: params.lfoEnabled ? "pointer" : "default",
              }}
            >
              {s === "sine" ? "Sine" : s === "square" ? "Square" : "Random"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ opacity: params.lfoEnabled ? 1 : 0.45 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a8b7a", marginBottom: 2 }}>
          <span>Rate</span>
          <span>{params.lfoSpeed.toFixed(2)} Hz</span>
        </div>
        <input
          type="range"
          min={0.01}
          max={20}
          step={0.01}
          disabled={!params.lfoEnabled}
          value={params.lfoSpeed}
          onChange={e => set({ lfoSpeed: Number(e.target.value) })}
          style={{ width: "100%", marginBottom: 10, accentColor: "#e8a86a" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a8b7a", marginBottom: 2 }}>
          <span>Depth</span>
          <span>±{params.lfoDepth} semitones</span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={0.5}
          disabled={!params.lfoEnabled}
          value={params.lfoDepth}
          onChange={e => set({ lfoDepth: Number(e.target.value) })}
          style={{ width: "100%", marginBottom: 12, accentColor: "#e8a86a" }}
        />
      </div>

      <SliderRow label="Volume" value={params.volume} min={0} max={100} step={1} unit="%" onChange={v => set({ volume: v })} />
      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_GRANULAR_PARAMS })}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent",
          color: "#e8a86a",
          fontSize: 10,
          cursor: "pointer",
        }}
      >
        デフォルトに戻す
      </button>
    </div>
  );
}
