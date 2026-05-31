"use client";

import { useEffect } from "react";
import {
  fetchStudioBbPresets,
  fetchStudioGranularPresets,
  studioBbToBeatPreset,
  type StudioGranularPreset,
} from "@/src/lib/studioPresets";
import { setStudioBeatPresets } from "@/src/lib/binauralBeats";

let studioGranularCache: StudioGranularPreset[] = [];

export function getStudioGranularPresets(): StudioGranularPreset[] {
  return studioGranularCache;
}

export const STUDIO_PRESETS_LOADED_EVENT = "tuyukusa-studio-presets-loaded";

export default function StudioPresetsLoader() {
  useEffect(() => {
    void (async () => {
      const [bb, gr] = await Promise.all([fetchStudioBbPresets(), fetchStudioGranularPresets()]);
      setStudioBeatPresets(bb.map(studioBbToBeatPreset));
      studioGranularCache = gr;
      window.dispatchEvent(new CustomEvent(STUDIO_PRESETS_LOADED_EVENT));
    })();
  }, []);

  return null;
}
