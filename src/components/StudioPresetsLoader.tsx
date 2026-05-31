"use client";

import { useEffect } from "react";
import {
  bbPresetToBeatPreset,
  fetchStudioBbPresets,
  fetchStudioGranularPresets,
  type StudioGranularPreset,
} from "@/src/lib/studioPresets";
import { setLoadedBeatPresets } from "@/src/lib/binauralBeats";

let studioGranularCache: StudioGranularPreset[] = [];

export function getStudioGranularPresets(): StudioGranularPreset[] {
  return studioGranularCache;
}

export const STUDIO_PRESETS_LOADED_EVENT = "tuyukusa-studio-presets-loaded";

async function loadSharedPresets(): Promise<void> {
  const [bb, gr] = await Promise.all([fetchStudioBbPresets(), fetchStudioGranularPresets()]);
  setLoadedBeatPresets(bb.map(bbPresetToBeatPreset));
  studioGranularCache = gr;
  window.dispatchEvent(new CustomEvent(STUDIO_PRESETS_LOADED_EVENT));
}

export default function StudioPresetsLoader() {
  useEffect(() => {
    void loadSharedPresets();

    const onVisible = () => {
      if (document.visibilityState === "visible") void loadSharedPresets();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
