"use client";

import { useState, type CSSProperties } from "react";
import {
  detectMediaPlatform,
  toEmbedUrl,
  TSUYUKUSA_RADIO_TITLE,
  TSUYUKUSA_RADIO_URL,
  TSUYUKUSA_RADIO_EMBED_URL,
  type MediaFavorite,
  type RadioSettings,
} from "@/src/lib/radioFavorites";

type Props = {
  radioSettings: RadioSettings;
  onChange: (next: RadioSettings) => void;
  onOpenBinaural: () => void;
  onOpenPomodoro: () => void;
  showBinauralSwitch?: boolean;
};

export default function TsuyukusaRadio({
  radioSettings,
  onChange,
  onOpenBinaural,
  onOpenPomodoro,
  showBinauralSwitch = true,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const activeUrl =
    radioSettings.favorites.find(f => f.id === radioSettings.activeFavoriteId)?.url ?? TSUYUKUSA_RADIO_URL;
  const activeTitle =
    radioSettings.favorites.find(f => f.id === radioSettings.activeFavoriteId)?.title ?? TSUYUKUSA_RADIO_TITLE;
  const embedUrl = radioSettings.activeFavoriteId ? toEmbedUrl(activeUrl) : TSUYUKUSA_RADIO_EMBED_URL;
  const openUrl = activeUrl;

  const addFavorite = () => {
    const url = newUrl.trim();
    if (!url) return;
    const fav: MediaFavorite = {
      id: `fav-${Date.now()}`,
      title: newTitle.trim() || "お気に入り",
      url,
      platform: detectMediaPlatform(url),
    };
    onChange({
      favorites: [fav, ...radioSettings.favorites],
      activeFavoriteId: fav.id,
    });
    setNewTitle("");
    setNewUrl("");
  };

  const removeFavorite = (id: string) => {
    onChange({
      favorites: radioSettings.favorites.filter(f => f.id !== id),
      activeFavoriteId: radioSettings.activeFavoriteId === id ? null : radioSettings.activeFavoriteId,
    });
  };

  return (
    <div style={{ margin: "12px 16px 0", background: "white", borderRadius: 14, padding: "14px", border: "1px solid rgba(60,40,20,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228" }}>📻 {activeTitle}</div>
        {showBinauralSwitch && (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={onOpenBinaural} style={switchBtnStyle}>🎧 ビート</button>
            <button type="button" onClick={onOpenPomodoro} style={switchBtnStyle}>🍅 タイマー</button>
          </div>
        )}
      </div>

      {embedUrl ? (
        <>
          <iframe
            src={embedUrl}
            title={activeTitle}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ width: "100%", height: 152, border: "none", borderRadius: 10, background: "#1a1410" }}
          />
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "#f5f0e8",
              color: "#8b5a2b",
              textAlign: "center",
              fontSize: 11,
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            Spotifyアプリで開く ↗
          </a>
        </>
      ) : (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            padding: "14px",
            borderRadius: 10,
            background: "#1a1410",
            color: "#e8a86a",
            textAlign: "center",
            fontSize: 13,
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          ▶ {activeTitle} を開く
        </a>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <SourceChip
          label="つゆくさラジオ"
          selected={!radioSettings.activeFavoriteId}
          onClick={() => onChange({ ...radioSettings, activeFavoriteId: null })}
        />
        {radioSettings.favorites.map(fav => (
          <SourceChip
            key={fav.id}
            label={fav.title}
            selected={radioSettings.activeFavoriteId === fav.id}
            onClick={() => onChange({ ...radioSettings, activeFavoriteId: fav.id })}
            onRemove={() => removeFavorite(fav.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(60,40,20,0.08)" }}>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#4a6741", marginBottom: 6 }}>
          お気に入りを追加（YouTube / Spotify / Apple Podcasts）
        </div>
        <input
          type="text"
          placeholder="タイトル（任意）"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          style={inputStyle}
        />
        <input
          type="url"
          placeholder="URLを貼り付け"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          style={{ ...inputStyle, marginTop: 6 }}
        />
        <button type="button" onClick={addFavorite} style={addBtnStyle}>
          ＋ 追加
        </button>
      </div>
    </div>
  );
}

function SourceChip({
  label,
  selected,
  onClick,
  onRemove,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <button type="button" onClick={onClick} style={chipStyle(selected)}>
        {label}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "#9a8b7a", cursor: "pointer", fontSize: 12 }}>
          ×
        </button>
      )}
    </span>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#f5f0e8",
  border: "1.5px solid rgba(60,40,20,0.12)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
};

const addBtnStyle: CSSProperties = {
  marginTop: 8,
  width: "100%",
  padding: "8px",
  borderRadius: 8,
  border: "1.5px solid #c17f4a",
  background: "#fdf0e4",
  color: "#8b5a2b",
  fontSize: 12,
  fontWeight: "bold",
  cursor: "pointer",
};

const switchBtnStyle: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 8,
  border: "1.5px solid rgba(60,40,20,0.12)",
  background: "white",
  fontSize: 10,
  cursor: "pointer",
  color: "#3d3228",
};

function chipStyle(selected: boolean): CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 14,
    border: selected ? "2px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
    background: selected ? "#fdf0e4" : "white",
    fontSize: 11,
    cursor: "pointer",
    color: "#3d3228",
  };
}
