"use client";

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import AddToHomeScreen from "@/src/components/AddToHomeScreen";
import HealthKitBridge from "@/src/components/HealthKitBridge";
import type { HealthData } from "@/src/lib/healthData";

type Props = {
  healthData: HealthData;
};

export function SettingsConvenientUsageSection({ healthData }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionTitleStyle}>{t("settings.convenientUsageTitle")}</div>
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 12, lineHeight: 1.5 }}>
        {t("settings.convenientUsageHint")}
      </div>
      <AddToHomeScreen variant="settings" />
      <HealthKitBridge healthData={healthData} compact />
    </div>
  );
}

const sectionTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: "bold",
  color: "#3d3228",
  marginBottom: 4,
};
