"use client";

import { useEffect, useState, type CSSProperties } from "react";
import TomoyoshiDateMedia from "@/src/components/TomoyoshiDateMedia";
import {
  detectMediaPlatform,
  toEmbedUrl,
  TSUYUKUSA_RADIO_EPISODE_LIST_EMBED_URL,
  TSUYUKUSA_RADIO_TITLE,
  TSUYUKUSA_RADIO_URL,
  type MediaFavorite,
  type RadioActiveEpisode,
  type RadioEpisode,
  type RadioSettings,
} from "@/src/lib/radioFavorites";
import { radioPlaybackManager } from "@/src/lib/radioPlaybackManager";

type Props = {
  radioSettings: RadioSettings;
  onChange: (next: RadioSettings) => void;
  onOpenBinaural: () => void;
  onOpenPomodoro: () => void;
  showBinauralSwitch?: boolean;
};

function formatEpisodeDate(pubDate: string): string {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return pubDate;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export default function TsuyukusaRadio({
  radioSettings,
  onChange,
  onOpenBinaural,
  onOpenPomodoro,
  showBinauralSwitch = true,
}: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [episodes, setEpisodes] = useState<RadioEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [playback, setPlayback] = useState(() => radioPlaybackManager.getSnapshot());

  useEffect(() => radioPlaybackManager.subscribe(setPlayback), []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/radio-episodes")
      .then(r => r.json())
      .then((data: { episodes?: RadioEpisode[] }) => {
        if (!cancelled) setEpisodes(data.episodes ?? []);
      })
      .catch(() => {
        if (!cancelled) setEpisodes([]);
      })
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isShowDefault = !radioSettings.activeFavoriteId && !radioSettings.activeEpisode;
  const activeFavorite = radioSettings.favorites.find(f => f.id === radioSettings.activeFavoriteId);
  const activeTitle =
    activeFavorite?.title ??
    radioSettings.activeEpisode?.title ??
    TSUYUKUSA_RADIO_TITLE;
  const activeUrl =
    activeFavorite?.url ??
    radioSettings.activeEpisode?.openUrl ??
    TSUYUKUSA_RADIO_URL;
  const canPlay =
    isShowDefault ||
    !!radioSettings.activeEpisode?.embedUrl ||
    !!radioSettings.activeEpisode?.audioUrl ||
    (activeFavorite ? toEmbedUrl(activeFavorite.url) !== null : false);
  const isPlayingThisSource = playback.isPlaying;

  const handleChange = (next: RadioSettings) => {
    onChange(next);
    if (radioPlaybackManager.getSnapshot().isPlaying) {
      radioPlaybackManager.updateSource(next);
    }
  };

  const selectShow = () => {
    handleChange({
      ...radioSettings,
      activeFavoriteId: null,
      activeEpisode: null,
    });
  };

  const selectEpisode = (ep: RadioEpisode) => {
    const activeEpisode: RadioActiveEpisode = {
      id: ep.id,
      title: ep.title,
      openUrl: ep.openUrl,
      embedUrl: ep.embedUrl,
      audioUrl: ep.audioUrl,
    };
    handleChange({
      ...radioSettings,
      activeFavoriteId: null,
      activeEpisode,
    });
  };

  const addFavorite = () => {
    const url = newUrl.trim();
    if (!url) return;
    const fav: MediaFavorite = {
      id: `fav-${Date.now()}`,
      title: newTitle.trim() || "お気に入り",
      url,
      platform: detectMediaPlatform(url),
    };
    handleChange({
      ...radioSettings,
      favorites: [fav, ...radioSettings.favorites],
      activeFavoriteId: fav.id,
      activeEpisode: null,
    });
    setNewTitle("");
    setNewUrl("");
  };

  const removeFavorite = (id: string) => {
    handleChange({
      ...radioSettings,
      favorites: radioSettings.favorites.filter(f => f.id !== id),
      activeFavoriteId: radioSettings.activeFavoriteId === id ? null : radioSettings.activeFavoriteId,
    });
  };

  return (
    <>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228" }}>📻 {activeTitle}</div>
          {showBinauralSwitch && (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={onOpenBinaural} style={switchBtnStyle}>🎧 ビート</button>
              <button type="button" onClick={onOpenPomodoro} style={switchBtnStyle}>🍅 タイマー</button>
            </div>
          )}
        </div>

        {canPlay ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => radioPlaybackManager.toggle(radioSettings)}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: 10,
                border: "none",
                background: isPlayingThisSource ? "#4a6741" : "#1a1410",
                color: isPlayingThisSource ? "#f5f0e8" : "#e8a86a",
                textAlign: "center",
                fontSize: 13,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {isPlayingThisSource ? "⏸ 停止" : `▶ ${activeTitle} を再生`}
            </button>
            {isPlayingThisSource && (
              <div style={{ fontSize: 11, color: "#4a6741", textAlign: "center" }}>
                タブを切り替えても再生は続きます
              </div>
            )}
            <a href={activeUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
              Spotifyアプリで開く ↗
            </a>
          </div>
        ) : (
          <a href={activeUrl} target="_blank" rel="noopener noreferrer" style={playLinkStyle}>
            ▶ {activeTitle} を開く
          </a>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={sectionLabelStyle}>📋 エピソード一覧（Spotify）</div>
          <iframe
            src={TSUYUKUSA_RADIO_EPISODE_LIST_EMBED_URL}
            title="つゆくさラジオ エピソード一覧"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{
              width: "100%",
              height: 352,
              border: "none",
              borderRadius: 10,
              background: "#1a1410",
            }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={sectionLabelStyle}>🎧 プレイリスト</div>
          {episodesLoading ? (
            <div style={{ fontSize: 12, color: "#9a8b7a", padding: "8px 0" }}>エピソードを読み込み中...</div>
          ) : episodes.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9a8b7a", padding: "8px 0" }}>
              エピソード一覧を取得できませんでした
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(60,40,20,0.08)" }}>
              <button
                type="button"
                onClick={selectShow}
                style={playlistItemStyle(isShowDefault)}
              >
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#3d3228" }}>📻 {TSUYUKUSA_RADIO_TITLE}（最新）</div>
                <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 2 }}>ショー全体を再生</div>
              </button>
              {episodes.map(ep => {
                const selected = radioSettings.activeEpisode?.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => selectEpisode(ep)}
                    style={playlistItemStyle(selected)}
                  >
                    <div style={{ fontSize: 12, fontWeight: selected ? "bold" : "normal", color: "#3d3228", lineHeight: 1.4 }}>
                      {ep.title}
                    </div>
                    <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 4, display: "flex", gap: 8 }}>
                      {ep.pubDate && <span>{formatEpisodeDate(ep.pubDate)}</span>}
                      {ep.duration && <span>{ep.duration}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <SourceChip label="つゆくさラジオ" selected={isShowDefault} onClick={selectShow} />
          {radioSettings.favorites.map(fav => (
            <SourceChip
              key={fav.id}
              label={fav.title}
              selected={radioSettings.activeFavoriteId === fav.id}
              onClick={() =>
                handleChange({
                  ...radioSettings,
                  activeFavoriteId: fav.id,
                  activeEpisode: null,
                })
              }
              onRemove={() => removeFavorite(fav.id)}
            />
          ))}
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(60,40,20,0.08)" }}>
          <div style={sectionLabelStyle}>お気に入りを追加（YouTube / Spotify / Apple Podcasts）</div>
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

      <TomoyoshiDateMedia />
    </>
  );
}

function playlistItemStyle(selected: boolean): CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    border: "none",
    borderBottom: "1px solid rgba(60,40,20,0.06)",
    background: selected ? "#fdf0e4" : "white",
    cursor: "pointer",
  };
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

const cardStyle: CSSProperties = {
  margin: "12px 16px 0",
  background: "white",
  borderRadius: 14,
  padding: "14px",
  border: "1px solid rgba(60,40,20,0.1)",
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: "bold",
  color: "#4a6741",
  marginBottom: 8,
};

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

const linkBtnStyle: CSSProperties = {
  display: "block",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1.5px solid rgba(60,40,20,0.12)",
  background: "#f5f0e8",
  color: "#8b5a2b",
  textAlign: "center",
  fontSize: 11,
  fontWeight: "bold",
  textDecoration: "none",
};

const playLinkStyle: CSSProperties = {
  display: "block",
  padding: "14px",
  borderRadius: 10,
  background: "#1a1410",
  color: "#e8a86a",
  textAlign: "center",
  fontSize: 13,
  fontWeight: "bold",
  textDecoration: "none",
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
