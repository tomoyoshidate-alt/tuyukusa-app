"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  radioPlaybackManager,
  type RadioPlaybackSnapshot,
} from "@/src/lib/radioPlaybackManager";

const PLAYER_STYLE: CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: 108,
  width: "min(430px, 100vw)",
  height: 152,
  border: "none",
  borderRadius: 12,
  zIndex: 155,
  boxShadow: "0 4px 20px rgba(26,20,16,0.15)",
};

/** Persistent RSS audio – survives tab switches. */
export default function RadioPersistentIframe() {
  const [snap, setSnap] = useState<RadioPlaybackSnapshot>(() => radioPlaybackManager.getSnapshot());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    radioPlaybackManager.hydrate();
    return radioPlaybackManager.subscribe(setSnap);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !snap.isPlaying || !snap.audioUrl || snap.embedUrl) return;
    if (audio.src !== snap.audioUrl) {
      audio.src = snap.audioUrl;
      audio.load();
    }
    void audio.play().catch(() => {
      /* autoplay may need user gesture */
    });
  }, [snap.isPlaying, snap.audioUrl, snap.embedUrl]);

  useEffect(() => {
    if (snap.isPlaying) return;
    audioRef.current?.pause();
  }, [snap.isPlaying]);

  if (!snap.isPlaying || !snap.audioUrl) return null;

  return (
    <audio
      ref={audioRef}
      src={snap.audioUrl}
      preload="auto"
      playsInline
      style={{ ...PLAYER_STYLE, width: 1, height: 1, opacity: 0, bottom: 108 }}
    />
  );
}
