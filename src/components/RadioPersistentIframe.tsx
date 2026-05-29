"use client";

import { useEffect, useState } from "react";
import {
  radioPlaybackManager,
  type RadioPlaybackSnapshot,
} from "@/src/lib/radioPlaybackManager";

/** Persistent Spotify/embed iframe – lives in root layout so tab switches never unmount it. */
export default function RadioPersistentIframe() {
  const [snap, setSnap] = useState<RadioPlaybackSnapshot>(() => radioPlaybackManager.getSnapshot());

  useEffect(() => {
    radioPlaybackManager.hydrate();
    return radioPlaybackManager.subscribe(setSnap);
  }, []);

  if (!snap.isPlaying || !snap.embedUrl) return null;

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
