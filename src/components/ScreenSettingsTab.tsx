"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  HOME_SECTION_TOGGLE_I18N_KEYS,
  HOME_WEATHER_TOGGLE_I18N_OPTIONS,
  type HomeDisplaySettings,
} from "@/src/lib/homeDisplay";
import FontSizeSettingsPanel from "@/src/components/FontSizeSettingsPanel";
import HealthKitBridge from "@/src/components/HealthKitBridge";
import LanguageSettingsPanel from "@/src/components/LanguageSettingsPanel";
import SectionOrderList from "@/src/components/SectionOrderList";
import ThemeSettingsPanel from "@/src/components/ThemeSettingsPanel";
import {
  findNearestRegionId,
  REGION_OPTIONS,
  type LocationSettings,
} from "@/src/lib/regions";
import type { HealthData } from "@/src/lib/healthData";
import { themeCardStyle, themeInputStyle, themeMutedTextStyle, themeSectionTitleStyle } from "@/src/lib/themeStyles";

type UserProfile = {
  name: string;
  nickname: string;
  nameConfigured: boolean;
  onboardingComplete: boolean;
  birthDate?: string;
  gender?: string;
};

type Props = {
  userProfile: UserProfile;
  onUserProfileChange: (next: UserProfile) => void;
  defaultUserName: string;
  locationSettings: LocationSettings;
  onLocationChange: (next: LocationSettings) => void;
  homeDisplay: HomeDisplaySettings;
  onHomeDisplayChange: (next: HomeDisplaySettings | ((prev: HomeDisplaySettings) => HomeDisplaySettings)) => void;
  healthData: HealthData;
};

export default function ScreenSettingsTab({
  userProfile,
  onUserProfileChange,
  defaultUserName,
  locationSettings,
  onLocationChange,
  homeDisplay,
  onHomeDisplayChange,
  healthData,
}: Props) {
  const { t } = useTranslation();
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const regionId = findNearestRegionId(pos.coords.latitude, pos.coords.longitude);
        onLocationChange({ regionId, autoDetected: true });
        setGeoStatus("ok");
      },
      () => setGeoStatus("error"),
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, [onLocationChange]);

  useEffect(() => {
    if (locationSettings.autoDetected) return;
    detectLocation();
  }, [locationSettings.autoDetected, detectLocation]);

  const handleSectionReorder = useCallback(
    (sectionOrder: HomeDisplaySettings["sectionOrder"]) => {
      onHomeDisplayChange(prev => ({ ...prev, sectionOrder }));
    },
    [onHomeDisplayChange]
  );

  return (
    <div style={{ padding: 16 }}>
      <ThemeSettingsPanel />
      <FontSizeSettingsPanel />
      <LanguageSettingsPanel />

      <div style={themeSectionTitleStyle}>{t("screenSettings.profileTitle")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 12, lineHeight: 1.5 }}>{t("screenSettings.profileHint")}</div>
      <div style={themeCardStyle}>
        <div style={labelStyle}>{t("screenSettings.nameLabel")}</div>
        <input
          type="text"
          placeholder={defaultUserName}
          value={userProfile.name}
          onChange={e => onUserProfileChange({ ...userProfile, name: e.target.value })}
          onBlur={() => {
            const trimmed = userProfile.name.trim() || defaultUserName;
            onUserProfileChange({ ...userProfile, name: trimmed, nameConfigured: true });
          }}
          style={{ ...themeInputStyle, marginBottom: 12 }}
        />
        <div style={labelStyle}>{t("screenSettings.nicknameLabel")}</div>
        <input
          type="text"
          placeholder={t("screenSettings.nicknamePlaceholder")}
          value={userProfile.nickname}
          onChange={e => onUserProfileChange({ ...userProfile, nickname: e.target.value })}
          onBlur={() => onUserProfileChange({ ...userProfile, nickname: userProfile.nickname.trim(), nameConfigured: true })}
          style={themeInputStyle}
        />
      </div>

      <div style={themeSectionTitleStyle}>{t("screenSettings.locationTitle")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 8, lineHeight: 1.5 }}>{t("screenSettings.locationHint")}</div>
      <div style={themeCardStyle}>
        <div style={labelStyle}>{t("screenSettings.regionLabel")}</div>
        <select
          value={locationSettings.regionId}
          onChange={e => onLocationChange({ regionId: e.target.value, autoDetected: false })}
          style={{ ...themeInputStyle, marginBottom: 10, appearance: "auto" }}
        >
          {REGION_OPTIONS.map(region => (
            <option key={region.id} value={region.id}>{region.label}</option>
          ))}
        </select>
        <button type="button" onClick={detectLocation} style={geoBtnStyle} disabled={geoStatus === "loading"}>
          {geoStatus === "loading" ? t("screenSettings.geoLoading") : t("screenSettings.geoButton")}
        </button>
        {geoStatus === "ok" && (
          <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-success)", marginTop: 8 }}>
            {REGION_OPTIONS.find(r => r.id === locationSettings.regionId)?.label} {t("screenSettings.geoOk")}
          </div>
        )}
        {geoStatus === "error" && (
          <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-error)", marginTop: 8 }}>
            {t("screenSettings.geoError")}
          </div>
        )}
      </div>

      <div style={themeSectionTitleStyle}>{t("screenSettings.healthTitle")}</div>
      <HealthKitBridge healthData={healthData} compact />

      <div style={themeSectionTitleStyle}>{t("screenSettings.homeDisplayTitle")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 8 }}>{t("screenSettings.weatherChartGroup")}</div>
      {HOME_WEATHER_TOGGLE_I18N_OPTIONS.map(opt => (
        <ToggleRow
          key={opt.key}
          label={t(opt.labelKey)}
          checked={homeDisplay[opt.key]}
          onChange={v => onHomeDisplayChange({ ...homeDisplay, [opt.key]: v })}
        />
      ))}
      {HOME_SECTION_TOGGLE_I18N_KEYS.map(opt => (
        <ToggleRow
          key={opt.key}
          label={t(opt.labelKey)}
          checked={homeDisplay[opt.key]}
          onChange={v => onHomeDisplayChange({ ...homeDisplay, [opt.key]: v })}
        />
      ))}

      <div style={themeSectionTitleStyle}>{t("screenSettings.orderTitle")}</div>
      <div style={{ ...themeMutedTextStyle, marginBottom: 8, lineHeight: 1.5 }}>{t("screenSettings.orderHint")}</div>
      <div style={themeCardStyle}>
        <SectionOrderList
          sectionOrder={homeDisplay.sectionOrder}
          onReorder={handleSectionReorder}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--t-border)", cursor: "pointer" }}>
      <span style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-text)" }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--t-checkbox-accent)" }} />
    </label>
  );
}

const labelStyle: CSSProperties = {
  fontSize: "var(--t-font-size-sm)",
  color: "var(--t-text-muted)",
  marginBottom: 6,
};

const geoBtnStyle: CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: "var(--t-radius-sm)",
  border: "1.5px solid var(--t-accent)",
  background: "var(--t-accent-bg)",
  color: "var(--t-text)",
  fontSize: "var(--t-font-size-base)",
  fontWeight: "var(--t-font-weight-bold)" as CSSProperties["fontWeight"],
  cursor: "pointer",
  fontFamily: "var(--t-font-family)",
};
