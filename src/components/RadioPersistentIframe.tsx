"use client";

import { useEffect, useRef, useState } from "react";
import {
  radioPlaybackManager,
  type RadioPlaybackSnapshot,
} from "@/src/lib/radioPlaybackManager";

/** Persistent Spotify embed / RSS audio – lives in root layout so tab switches never unmount it. */
export default function RadioPersistentIframe() {
  const [snap, setSnap] = useState<RadioPlaybackSnapshot>(() => radioPlaybackManager.getSnapshot());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    radioPlaybackManager.hydrate();
    return radioPlaybackManager.subscribe(setSnap);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !snap.isPlaying || !snap.audioUrl) return;
    if (audio.src !== snap.audioUrl) {
      audio.src = snap.audioUrl;
      audio.load();
    }
    void audio.play().catch(() => {
      /* autoplay may need user gesture */
    });
  }, [snap.isPlaying, snap.audioUrl]);

  useEffect(() => {
    if (snap.isPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }, [snap.isPlaying]);

  if (!snap.isPlaying) return null;

  if (snap.audioUrl) {
    return (
      <audio
        ref={audioRef}
        src={snap.audioUrl}
        preload="auto"
        playsInline
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: "none",
          left: -9999,
        }}
      />
    );
  }

  if (snap.embedUrl) {
    return (
      <iframe
        key={snap.embedUrl}
        src={snap.embedUrl}
        title={snap.title}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 108,
          width: "min(430px, 100vw)",
          height: 152,
          border: "none",
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: 150,
        }}
      />
    );
  }

  return null;
}
