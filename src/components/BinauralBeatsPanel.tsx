'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AMBIENT_SOUND_PRESETS,
  TIMER_OPTIONS,
  getAllBeatPresets,
  getBeatPreset,
  getRecommendedBeatId,
  type AmbientSoundId,
  type TimerMinutes,
} from "@/src/lib/binauralBeats";
import { STUDIO_PRESETS_LOADED_EVENT } from "@/src/components/StudioPresetsLoader";
import {
  binauralPlaybackManager,
  type BinauralPlaybackSnapshot,
} from "@/src/lib/binauralPlaybackManager";
import {
  BB_FAVORITES_MAX,
  readBinauralFavorites,
  writeBinauralFavorites,
  type BinauralFavorite,
} from "@/src/lib/binauralFavorites";
import {
  BASE_KEY_LABELS,
  formatBeatFrequencies,
  readBinauralPlayerSettings,
  writeBinauralPlayerSettings,
  type BaseKey,
} from "@/src/lib/binauralPlayerSettings";
import { requestNotificationPermission } from "@/src/lib/timerServiceWorker";
import PomodoroTimer from "@/src/components/PomodoroTimer";
import BinauralExplainPage from "@/src/components/BinauralExplainPage";
import AirplaneModeOption from "@/src/components/AirplaneModeOption";

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
  const [selectedBeat, setSelectedBeat] = useState<string>(recommendedId);
  const [beatPresets, setBeatPresets] = useState(() => getAllBeatPresets());
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientSoundId>("rain");
  const [timerMinutes, setTimerMinutes] = useState<TimerMinutes | null>(10);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [binauralVolume, setBinauralVolume] = useState(0.45);
  const [ambientVolume, setAmbientVolume] = useState(0.35);
  const [playback, setPlayback] = useState<BinauralPlaybackSnapshot>(() =>
    binauralPlaybackManager.getSnapshot()
  );
  const [isApplying, setIsApplying] = useState(false);
  const [bbFavorites, setBbFavorites] = useState<BinauralFavorite[]>([]);
  const [favoriteName, setFavoriteName] = useState("");
  const [baseKey, setBaseKey] = useState<BaseKey>(() => readBinauralPlayerSettings().baseKey);
  const [fadeSec, setFadeSec] = useState(() => readBinauralPlayerSettings().fadeSec);

  useEffect(() => {
    setBbFavorites(readBinauralFavorites());
  }, []);

  useEffect(() => {
    const onLoaded = () => setBeatPresets(getAllBeatPresets());
    window.addEventListener(STUDIO_PRESETS_LOADED_EVENT, onLoaded);
    return () => window.removeEventListener(STUDIO_PRESETS_LOADED_EVENT, onLoaded);
  }, []);

  useEffect(() => {
    return binauralPlaybackManager.subscribe(setPlayback);
  }, []);

  useEffect(() => {
    const snap = binauralPlaybackManager.getSnapshot();
    if (snap.isPlaying && snap.presetId) {
      setSelectedBeat(snap.presetId);
      setSelectedAmbient(snap.ambientId);
      setBaseKey(snap.baseKey);
    }
  }, []);

  const isPlaying = playback.isPlaying;
  const remainingSec = playback.remainingSec;
  const hasPendingChanges =
    isPlaying &&
    (playback.presetId !== selectedBeat ||
      playback.ambientId !== selectedAmbient ||
      playback.baseKey !== baseKey);

  const updateBaseKey = (key: BaseKey) => {
    setBaseKey(key);
    writeBinauralPlayerSettings({ baseKey: key });
  };

  const updateFadeSec = (sec: number) => {
    const next = Math.max(0, Math.min(30, Math.round(sec)));
    setFadeSec(next);
    writeBinauralPlayerSettings({ fadeSec: next });
  };

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
    }, { baseKey, fadeSec });
  }, [selectedBeat, selectedAmbient, timerMinutes, masterVolume, binauralVolume, ambientVolume, baseKey, fadeSec]);

  const applyChanges = useCallback(async () => {
    if (!hasPendingChanges || isApplying) return;
    setIsApplying(true);
    try {
      await binauralPlaybackManager.applyChanges(
        getBeatPreset(selectedBeat),
        selectedAmbient,
        { baseKey, fadeSec }
      );
    } finally {
      setIsApplying(false);
    }
  }, [hasPendingChanges, isApplying, selectedBeat, selectedAmbient, baseKey, fadeSec]);

  useEffect(() => {
    if (!isPlaying || isApplying) return;
    if (
      playback.presetId !== selectedBeat ||
      playback.ambientId !== selectedAmbient ||
      playback.baseKey !== baseKey
    ) {
      void (async () => {
        setIsApplying(true);
        try {
          await binauralPlaybackManager.applyChanges(
            getBeatPreset(selectedBeat),
            selectedAmbient,
            { baseKey, fadeSec },
          );
        } finally {
          setIsApplying(false);
        }
      })();
    }
  }, [selectedBeat, selectedAmbient, baseKey, isPlaying, isApplying, playback.presetId, playback.ambientId, playback.baseKey, fadeSec]);

  useEffect(() => {
    if (!isPlaying) return;
    binauralPlaybackManager.setVolumes({
      master: masterVolume,
      binaural: binauralVolume,
      ambient: ambientVolume,
    });
  }, [masterVolume, binauralVolume, ambientVolume, isPlaying]);

  const saveFavorite = () => {
    const name = favoriteName.trim();
    if (!name) return;
    const fav: BinauralFavorite = {
      id: `bb-fav-${Date.now()}`,
      name,
      beatId: selectedBeat,
      ambientId: selectedAmbient,
      baseKey,
      masterVolume,
      binauralVolume,
      ambientVolume,
      timerMinutes,
      createdAt: Date.now(),
    };
    const next = [fav, ...bbFavorites].slice(0, BB_FAVORITES_MAX);
    setBbFavorites(next);
    writeBinauralFavorites(next);
    setFavoriteName("");
  };

  const loadFavorite = (fav: BinauralFavorite) => {
    setSelectedBeat(fav.beatId);
    setSelectedAmbient(fav.ambientId);
    if (fav.baseKey) updateBaseKey(fav.baseKey);
    setMasterVolume(fav.masterVolume);
    setBinauralVolume(fav.binauralVolume);
    setAmbientVolume(fav.ambientVolume);
    setTimerMinutes(fav.timerMinutes);
  };

  const removeFavorite = (id: string) => {
    const next = bbFavorites.filter(f => f.id !== id);
    setBbFavorites(next);
    writeBinauralFavorites(next);
  };

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
            <div style={{ fontSize: 18, fontWeight: "bold", color: "#3d3228" }}>サウンド & タイマー</div>
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
          <TabChip label="ビート" selected={panelMode === "beats"} onClick={() => setPanelMode("beats")} />
          <TabChip label="ポモドーロ" selected={panelMode === "pomodoro"} onClick={() => setPanelMode("pomodoro")} />
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
          バイノーラルビートとは？
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
            今日の診断「{diagnosis}」におすすめ
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

        <SectionTitle>バイノーラルビート（{beatPresets.length}種類）</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {beatPresets.map(preset => {
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
                  {isRecommended && <span style={{ fontSize: 9, color: "#c17f4a", marginLeft: 4 }}>(推奨)</span>}
                </div>
                <div style={{ fontSize: 10, color: "#4a6741", marginTop: 2 }}>{preset.waveLabel}</div>
                {preset.memo && (
                  <div style={{ fontSize: 9, color: "#9a8b7a", marginTop: 4, lineHeight: 1.4 }}>{preset.memo}</div>
                )}
              </button>
            );
          })}
        </div>

        <SectionTitle>背景音（11種類）</SectionTitle>
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

        <SectionTitle>🎵 基音キー</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          {(["C", "Am"] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => updateBaseKey(key)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: baseKey === key ? "2px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
                background: baseKey === key ? "#fdf0e4" : "white",
                fontSize: 11,
                fontWeight: baseKey === key ? "bold" : "normal",
                cursor: "pointer",
                color: "#3d3228",
                lineHeight: 1.4,
              }}
            >
              {BASE_KEY_LABELS[key]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#9a8b7a", marginBottom: 16, lineHeight: 1.5 }}>
          {formatBeatFrequencies(getBeatPreset(selectedBeat), baseKey)}
        </div>

        <SectionTitle>⏱️ 切替フェード時間</SectionTitle>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3d3228", marginBottom: 4 }}>
            <span>0秒</span>
            <span>{fadeSec}秒</span>
            <span>30秒</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={fadeSec}
            onChange={e => updateFadeSec(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c17f4a" }}
          />
        </div>

        <SectionTitle>タイマー</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
        <AirplaneModeOption />

        <SectionTitle>音量</SectionTitle>
        <VolumeSlider label="全体" value={masterVolume} onChange={setMasterVolume} />
        <VolumeSlider label="バイノーラル" value={binauralVolume} onChange={setBinauralVolume} />
        <VolumeSlider label="背景音" value={ambientVolume} onChange={setAmbientVolume} />

        <SectionTitle>⭐ お気に入り（最大{BB_FAVORITES_MAX}件）</SectionTitle>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="お気に入り名（例：朝の集中セット）"
              value={favoriteName}
              onChange={e => setFavoriteName(e.target.value)}
              style={{
                flex: 1,
                boxSizing: "border-box",
                background: "#f5f0e8",
                border: "1.5px solid rgba(60,40,20,0.12)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={saveFavorite}
              disabled={!favoriteName.trim() || bbFavorites.length >= BB_FAVORITES_MAX}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1.5px solid #c17f4a",
                background: "#fdf0e4",
                color: "#8b5a2b",
                fontSize: 11,
                fontWeight: "bold",
                cursor: "pointer",
                flexShrink: 0,
                opacity: !favoriteName.trim() || bbFavorites.length >= BB_FAVORITES_MAX ? 0.5 : 1,
              }}
            >
              保存
            </button>
          </div>
          {bbFavorites.length === 0 ? (
            <div style={{ fontSize: 11, color: "#9a8b7a" }}>
              現在のBB・背景音・音量の組み合わせを名前をつけて保存できます
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bbFavorites.map(fav => {
                const beat = getBeatPreset(fav.beatId);
                const ambient = AMBIENT_SOUND_PRESETS.find(a => a.id === fav.ambientId);
                return (
                  <div
                    key={fav.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "white",
                      border: "1px solid rgba(60,40,20,0.1)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => loadFavorite(fav)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: "bold", color: "#3d3228" }}>{fav.name}</div>
                      <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 2 }}>
                        {beat.emoji} {beat.label} · {ambient?.emoji} {ambient?.label}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFavorite(fav.id)}
                      style={{ background: "none", border: "none", color: "#9a8b7a", cursor: "pointer", fontSize: 14 }}
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
            {isApplying || playback.isTransitioning ? "切り替え中..." : "変更を適用"}
          </button>
        )}

        {isPlaying && hasPendingChanges && (
          <div style={{ fontSize: 10, color: "#8b7355", marginTop: 6, textAlign: "center", lineHeight: 1.5 }}>
            BB・背景音・基音キーを変更しました。「変更を適用」でフェード切り替えできます。
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => (isPlaying ? stopPlayback() : void startPlayback())}
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
            {isPlaying ? "停止" : "再生"}
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
