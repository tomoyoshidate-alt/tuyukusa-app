"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AMBIENT_OPTIONS,
  PRESETS,
  type AmbientId,
} from "@/src/lib/simpleBinauralPresets";
import { simpleBinauralEngine } from "@/src/lib/simpleBinauralEngine";

export function SimpleBinauralPanel() {
  const [selectedId, setSelectedId] = useState("relax");
  const [ambientId, setAmbientId] = useState<AmbientId>("none");
  const [isPlaying, setIsPlaying] = useState(false);
  const [binauralVol, setBinauralVol] = useState(0.5);
  const [ambientVol, setAmbientVol] = useState(0.35);
  const [rhythmVol, setRhythmVol] = useState(0.4);

  useEffect(() => {
    return simpleBinauralEngine.subscribe(snapshot => {
      setIsPlaying(snapshot.playing);
      setSelectedId(snapshot.presetId);
    });
  }, []);

  useEffect(() => {
    simpleBinauralEngine.setVolumes({
      binaural: binauralVol,
      ambient: ambientVol,
      rhythm: rhythmVol,
    });
  }, [binauralVol, ambientVol, rhythmVol]);

  const handlePresetSelect = useCallback(async (id: string) => {
    setSelectedId(id);
    await simpleBinauralEngine.setPreset(id);
  }, []);

  const handleAmbientChange = useCallback(async (id: AmbientId) => {
    setAmbientId(id);
    await simpleBinauralEngine.setAmbient(id);
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (isPlaying) await simpleBinauralEngine.stop();
    else await simpleBinauralEngine.playPreset(selectedId);
  }, [isPlaying, selectedId]);

  const selected = PRESETS.find(p => p.id === selectedId) ?? PRESETS[0];

  return (
    <div
      style={{
        padding: "20px 16px 32px",
        minHeight: "100%",
        background: "linear-gradient(180deg, #1a1410 0%, #2a2218 100%)",
        color: "#f5f0e8",
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: "bold" }}>バイノーラル</h2>
      <p style={{ margin: "0 0 20px", fontSize: 12, opacity: 0.65 }}>
        プリセットを選んで再生してください
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => void handlePresetSelect(preset.id)}
            style={{
              padding: "12px 10px",
              borderRadius: 10,
              border:
                selectedId === preset.id
                  ? "2px solid #8fbc7a"
                  : "1px solid rgba(245,240,232,0.15)",
              background: selectedId === preset.id ? "rgba(143,188,122,0.2)" : "rgba(0,0,0,0.25)",
              color: "#f5f0e8",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: "bold" }}>{preset.name}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              {preset.band} · {preset.beatHz}Hz
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleTogglePlay()}
        style={{
          display: "block",
          width: "100%",
          padding: "20px",
          marginBottom: 28,
          borderRadius: 16,
          border: "none",
          background: isPlaying ? "#c17f4a" : "#4a6741",
          color: "#fff",
          fontSize: 22,
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {isPlaying ? "停止" : "再生"}
      </button>

      {isPlaying && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 20, textAlign: "center" }}>
          再生中: {selected.name}
        </div>
      )}

      <VolumeSlider label="バイノーラル" value={binauralVol} onChange={setBinauralVol} />
      <VolumeSlider label="環境音" value={ambientVol} onChange={setAmbientVol} />
      <VolumeSlider label="リズム" value={rhythmVol} onChange={setRhythmVol} />

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>環境音</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AMBIENT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => void handleAmbientChange(opt.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border:
                  ambientId === opt.id
                    ? "2px solid #8fbc7a"
                    : "1px solid rgba(245,240,232,0.2)",
                background: ambientId === opt.id ? "rgba(143,188,122,0.25)" : "transparent",
                color: "#f5f0e8",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, opacity: 0.5 }}>
          環境音は後日追加
        </p>
      </div>
    </div>
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#8fbc7a" }}
      />
    </div>
  );
}
