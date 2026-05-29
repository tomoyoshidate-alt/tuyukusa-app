'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AMBIENT_SOUND_PRESETS,
  BINURAL_BEAT_PRESETS,
  TIMER_OPTIONS,
  getBeatPreset,
  getRecommendedBeatId,
  type AmbientSoundId,
  type BinauralBeatId,
  type TimerMinutes,
} from "@/src/lib/binauralBeats";
import {
  binauralPlaybackManager,
  type BinauralPlaybackSnapshot,
} from "@/src/lib/binauralPlaybackManager";
import { requestNotificationPermission } from "@/src/lib/timerServiceWorker";
import PomodoroTimer from "@/src/components/PomodoroTimer";
import BinauralExplainPage from "@/src/components/BinauralExplainPage";

type PanelMode = "beats" | "pomodoro";

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  diagnosis: string;
  onClose: () => void;
  initialPanelMode?: PanelMode;
};

export default function BinauralBeatsPanel({ diagnosis, onClose, initialPanelMode = "beats" }: Props) {
  const recommendedId = getRecommendedBeatId(diagnosis);
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    setPanelMode(initialPanelMode);
  }, [initialPanelMode]);
  const [selectedBeat, setSelectedBeat] = useState<BinauralBeatId>(recommendedId);
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientSoundId>("rain");
  const [timerMinutes, setTimerMinutes] = useState<TimerMinutes | null>(10);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [binauralVolume, setBinauralVolume] = useState(0.45);
  const [ambientVolume, setAmbientVolume] = useState(0.35);
  const [playback, setPlayback] = useState<BinauralPlaybackSnapshot>(() =>
    binauralPlaybackManager.getSnapshot()
  );
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    return binauralPlaybackManager.subscribe(setPlayback);
  }, []);

  useEffect(() => {
    const snap = binauralPlaybackManager.getSnapshot();
    if (snap.isPlaying && snap.presetId) {
      setSelectedBeat(snap.presetId as BinauralBeatId);
      setSelectedAmbient(snap.ambientId);
    }
  }, []);

  const isPlaying = playback.isPlaying;
  const remainingSec = playback.remainingSec;
  const hasPendingChanges =
    isPlaying &&
    (playback.presetId !== selectedBeat || playback.ambientId !== selectedAmbient);

  const stopPlayback = useCallback(() => {
    binauralPlaybackManager.stopAlarm();
    binauralPlaybackManager.stop();
  }, []);

  const startPlayback = useCallback(async () => {
    await requestNotificationPermission();
    const preset = getBeatPreset(selectedBeat);
    await binauralPlaybackManager.start(preset, selectedAmbient, timerMinutes, {
      master: masterVolume,
      binaural: binauralVolume,
      ambient: ambientVolume,
    });
  }, [selectedBeat, selectedAmbient, timerMinutes, masterVolume, binauralVolume, ambientVolume]);

  const applyChanges = useCallback(async () => {
    if (!hasPendingChanges || isApplying) return;
    setIsApplying(true);
    try {
      await binauralPlaybackManager.applyChanges(
        getBeatPreset(selectedBeat),
        selectedAmbient
      );
    } finally {
      setIsApplying(false);
    }
  }, [hasPendingChanges, isApplying, selectedBeat, selectedAmbient]);

  useEffect(() => {
    if (!isPlaying) return;
    binauralPlaybackManager.setVolumes({
      master: masterVolume,
      binaural: binauralVolume,
      ambient: ambientVolume,
    });
  }, [masterVolume, binauralVolume, ambientVolume, isPlaying]);

  const recommended = getBeatPreset(recommendedId);

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(26,20,16,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#f5f0e8",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#3d3228" }}>🎧 サウンド & タイマー</div>
            <div style={{ fontSize: 11, color: "#9a8b7a", marginTop: 2 }}>バイノーラルビート · ポモドーロ</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9a8b7a", padding: 4 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TabChip label="🎧 ビート" selected={panelMode === "beats"} onClick={() => setPanelMode("beats")} />
          <TabChip label="🍅 ポモドーロ" selected={panelMode === "pomodoro"} onClick={() => setPanelMode("pomodoro")} />
        </div>

        {panelMode === "pomodoro" ? (
          <PomodoroTimer
            ambientId={selectedAmbient}
            masterVolume={masterVolume}
            binauralVolume={binauralVolume}
            ambientVolume={ambientVolume}
          />
        ) : (
        <>
        <button
          type="button"
          onClick={() => setShowExplain(true)}
          style={{
            width: "100%",
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid rgba(60,40,20,0.12)",
            background: "white",
            color: "#4a6741",
            fontSize: 13,
            fontWeight: "bold",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          🎧 バイノーラルビートとは？
        </button>

        <div
          style={{
            background: "linear-gradient(135deg, #fdf0e4, #e8f0e4)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
            border: "1px solid rgba(193,127,74,0.25)",
          }}
        >
          <div style={{ fontSize: 11, color: "#8b5a2b", fontWeight: "bold", marginBottom: 4 }}>
            ✨ 今日の診断「{diagnosis}」におすすめ
          </div>
          <div style={{ fontSize: 14, color: "#3d3228", fontWeight: "bold" }}>
            {recommended.emoji} {recommended.label}
          </div>
          <div style={{ fontSize: 11, color: "#4a6741", marginTop: 2 }}>{recommended.waveLabel}</div>
          {selectedBeat !== recommendedId && (
            <button
              type="button"
              onClick={() => setSelectedBeat(recommendedId)}
              style={{
                marginTop: 8,
                padding: "6px 12px",
                borderRadius: 14,
                border: "1.5px solid #c17f4a",
                background: "white",
                color: "#8b5a2b",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              おすすめを選択
            </button>
          )}
        </div>

        <SectionTitle>バイノーラルビート（8種類）</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {BINURAL_BEAT_PRESETS.map(preset => {
            const selected = selectedBeat === preset.id;
            const isRecommended = preset.id === recommendedId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedBeat(preset.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: selected ? "2px solid #c17f4a" : "1px solid rgba(60,40,20,0.12)",
                  background: selected ? "#fdf0e4" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: "bold", color: "#3d3228" }}>
                  {preset.emoji} {preset.label}
                  {isRecommended && <span style={{ fontSize: 9, color: "#c17f4a", marginLeft: 4 }}>★</span>}
                </div>
                <div style={{ fontSize: 10, color: "#4a6741", marginTop: 2 }}>{preset.waveLabel}</div>
              </button>
            );
          })}
        </div>

        <SectionTitle>背景音（9種類）</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {AMBIENT_SOUND_PRESETS.map(preset => {
            const selected = selectedAmbient === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedAmbient(preset.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: selected ? "2px solid #4a6741" : "1.5px solid rgba(60,40,20,0.12)",
                  background: selected ? "#e8f0e4" : "white",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#3d3228",
                }}
              >
                {preset.emoji} {preset.label}
              </button>
            );
          })}
        </div>

        <SectionTitle>タイマー</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TimerChip label="なし" selected={timerMinutes === null} onClick={() => setTimerMinutes(null)} />
          {TIMER_OPTIONS.map(min => (
            <TimerChip
              key={min}
              label={`${min}分`}
              selected={timerMinutes === min}
              onClick={() => setTimerMinutes(min)}
            />
          ))}
        </div>

        <SectionTitle>音量</SectionTitle>
        <VolumeSlider label="全体" value={masterVolume} onChange={setMasterVolume} />
        <VolumeSlider label="バイノーラル" value={binauralVolume} onChange={setBinauralVolume} />
        <VolumeSlider label="背景音" value={ambientVolume} onChange={setAmbientVolume} />

        {isPlaying && hasPendingChanges && (
          <button
            type="button"
            onClick={() => void applyChanges()}
            disabled={isApplying || playback.isTransitioning}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 10,
              border: "2px solid #c17f4a",
              background: "#fdf0e4",
              color: "#8b5a2b",
              fontSize: 14,
              fontWeight: "bold",
              cursor: isApplying || playback.isTransitioning ? "wait" : "pointer",
              opacity: isApplying || playback.isTransitioning ? 0.7 : 1,
            }}
          >
            {isApplying || playback.isTransitioning ? "切り替え中..." : "🔄 変更適応"}
          </button>
        )}

        {isPlaying && hasPendingChanges && (
          <div style={{ fontSize: 10, color: "#8b7355", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
            BBの種類や背景音を変更しました。「変更適応」でフェード切り替えできます。
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: isPlaying ? "#4a6741" : "#1a1410",
              color: "#f5f0e8",
              fontSize: 15,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {isPlaying ? "⏹ 停止" : "▶ 再生"}
          </button>
          {isPlaying && timerMinutes !== null && remainingSec > 0 && (
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#c17f4a", minWidth: 52, textAlign: "center" }}>
              {formatRemaining(remainingSec)}
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 12, lineHeight: 1.6, textAlign: "center" }}>
          左右で異なる周波数を聴取し、脳波誘導をサポートします。画面ロック中も再生継続（Mixモード・無音ループ・SWタイマー）。
        </div>
        </>
        )}
      </div>
    </div>

    {showExplain && (
      <BinauralExplainPage
        onClose={() => setShowExplain(false)}
        onTryBB={() => {
          setShowExplain(false);
          setPanelMode("beats");
        }}
      />
    )}
    </>
  );
}

function TabChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 10,
        border: selected ? "2px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
        background: selected ? "#fdf0e4" : "white",
        fontSize: 13,
        fontWeight: selected ? "bold" : "normal",
        cursor: "pointer",
        color: "#3d3228",
      }}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741", marginBottom: 8 }}>{children}</div>
  );
}

function TimerChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 20,
        border: selected ? "2px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
        background: selected ? "#fdf0e4" : "white",
        fontSize: 12,
        cursor: "pointer",
        color: "#3d3228",
      }}
    >
      {label}
    </button>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3d3228", marginBottom: 4 }}>
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        style={{ width: "100%", accentColor: "#c17f4a" }}
      />
    </div>
  );
}
