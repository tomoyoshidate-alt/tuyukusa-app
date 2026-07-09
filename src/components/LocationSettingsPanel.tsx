"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatGeocodingLabel, searchCity, type GeocodingResult } from "@/src/lib/geocoding";
import {
  DEFAULT_CHOFU_LOCATION,
  getEffectiveLocation,
  loadUserTraits,
  saveUserTraits,
  type TraitsLocation,
} from "@/src/lib/traits";
import {
  themeCardStyle,
  themeFieldLabelStyle,
  themeInputStyle,
  themeMutedTextStyle,
} from "@/src/lib/themeStyles";

export function LocationSettingsPanel() {
  const { t } = useTranslation();
  const [cityQuery, setCityQuery] = useState("");
  const [selected, setSelected] = useState<TraitsLocation>(() => getEffectiveLocation(loadUserTraits()));
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const traits = loadUserTraits();
    setSelected(getEffectiveLocation(traits));
    if (traits.location?.city) setCityQuery(traits.location.city);
  }, []);

  const runSearch = useCallback(async () => {
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const rows = await searchCity(cityQuery);
      setResults(rows);
      if (!rows.length) setError(t("settings.locationNotFound"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.locationSearchFailed"));
    } finally {
      setSearching(false);
    }
  }, [cityQuery, t]);

  const applyLocation = (loc: TraitsLocation) => {
    setSelected(loc);
    saveUserTraits({ ...loadUserTraits(), location: loc });
    setCityQuery(loc.city);
    setResults([]);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const resetDefault = () => {
    applyLocation(DEFAULT_CHOFU_LOCATION);
  };

  return (
    <div style={{ ...themeCardStyle, marginBottom: 12 }}>
      <div style={themeFieldLabelStyle}>{t("settings.locationTitle")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 12, lineHeight: 1.6 }}>
        {t("settings.locationHint")}
      </div>

      <div style={{ fontSize: 12, color: "var(--t-text-muted)", marginBottom: 8 }}>
        {t("settings.locationCurrent")}: {selected.city}（{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}）
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          value={cityQuery}
          onChange={e => setCityQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") void runSearch();
          }}
          placeholder={t("settings.locationPlaceholder")}
          style={{ ...themeInputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={searching || !cityQuery.trim()}
          style={{
            flexShrink: 0,
            padding: "10px 14px",
            borderRadius: "var(--t-radius-sm)",
            border: "none",
            background: "#4a6741",
            color: "#fff",
            fontSize: 12,
            fontWeight: "bold",
            cursor: searching ? "default" : "pointer",
            opacity: searching ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {searching ? t("settings.locationSearching") : t("settings.locationSearch")}
        </button>
      </div>

      {error && <div style={{ fontSize: 11, color: "#c44a4a", marginBottom: 8 }}>{error}</div>}

      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {results.map(r => (
            <button
              key={`${r.latitude}-${r.longitude}-${r.name}`}
              type="button"
              onClick={() =>
                applyLocation({
                  city: formatGeocodingLabel(r),
                  lat: r.latitude,
                  lon: r.longitude,
                })
              }
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--t-border)",
                background: "#f5f0e8",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                color: "var(--t-text)",
              }}
            >
              {formatGeocodingLabel(r)}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={resetDefault}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          fontSize: 11,
          color: "#9a8b7a",
          cursor: "pointer",
          fontFamily: "inherit",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        {t("settings.locationResetDefault")}
      </button>

      {saved && (
        <div style={{ fontSize: 11, color: "#4a6741", marginTop: 8 }}>{t("settings.locationSaved")}</div>
      )}
    </div>
  );
}
