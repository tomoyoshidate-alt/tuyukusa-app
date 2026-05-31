import type { BBPreset, GranularPreset, PresetStore } from "@mac/lib/types";

function presetUpdatedAt(p: { updatedAt?: string }): number {
  const t = Date.parse(p.updatedAt ?? "");
  return Number.isFinite(t) ? t : 0;
}

function mergePresets<T extends { id: string; updatedAt?: string }>(
  base: T[],
  overlay: T[],
  baseOrder: string[]
): T[] {
  const byId = new Map<string, T>();
  for (const p of base) byId.set(p.id, p);
  for (const p of overlay) {
    const existing = byId.get(p.id);
    if (!existing || presetUpdatedAt(p) >= presetUpdatedAt(existing)) {
      byId.set(p.id, p);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ai = baseOrder.indexOf(a.id);
    const bi = baseOrder.indexOf(b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function mergeBbPresetStores(
  jsonStore: PresetStore<BBPreset>,
  remoteStore: PresetStore<BBPreset>
): PresetStore<BBPreset> {
  const baseOrder = jsonStore.presets.map(p => p.id);
  return {
    presets: mergePresets(jsonStore.presets, remoteStore.presets, baseOrder),
  };
}

export function mergeGranularPresetStores(
  jsonStore: PresetStore<GranularPreset>,
  remoteStore: PresetStore<GranularPreset>
): PresetStore<GranularPreset> {
  const baseOrder = jsonStore.presets.map(p => p.id);
  return {
    presets: mergePresets(jsonStore.presets, remoteStore.presets, baseOrder),
  };
}
