"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getActiveModules,
  getSelectedModule,
  loadAiModuleSelection,
  saveAiModuleSelection,
} from "@/src/lib/ai/loader";
import type { AiModule } from "@/src/lib/ai/types";
import {
  themeAppShellStyle,
  themeBackLinkStyle,
  themeCardStyle,
  themeHeaderStyle,
  themeMutedTextStyle,
} from "@/src/lib/themeStyles";

function ModuleCard({
  module,
  selected,
  onSelect,
}: {
  module: AiModule;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(module.id)}
      style={{
        ...themeCardStyle,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: selected ? "2px solid #6b8f62" : "1px solid var(--t-border)",
        background: selected ? "#f4f8f2" : "var(--t-card-bg)",
        fontFamily: "inherit",
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#6b8f62", fontWeight: "bold", marginBottom: 4 }}>
            {module.display_name}
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "var(--t-text)", marginBottom: 6 }}>
            {module.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--t-text-muted)", lineHeight: 1.6 }}>{module.tagline}</div>
        </div>
        {selected && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: "bold",
              color: "#4a6741",
              background: "#e8f0e4",
              borderRadius: 12,
              padding: "4px 10px",
            }}
          >
            使用中
          </span>
        )}
      </div>
    </button>
  );
}

function ConfirmModal({
  module,
  onConfirm,
  onCancel,
}: {
  module: AiModule;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-module-confirm-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(26,20,16,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--t-card-bg, #fff)",
          borderRadius: 16,
          padding: "22px 20px",
          maxWidth: 340,
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          id="ai-module-confirm-title"
          style={{ fontSize: 16, fontWeight: "bold", color: "var(--t-text)", marginBottom: 10, lineHeight: 1.5 }}
        >
          {t("settings.aiModuleConfirmTitle")}
        </div>
        <div style={{ fontSize: 13, color: "var(--t-text-muted)", lineHeight: 1.7, marginBottom: 8 }}>
          {t("settings.aiModuleConfirmBody")}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: "bold",
            color: "#4a6741",
            background: "#f4f8f2",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 18,
          }}
        >
          {module.display_name} — {module.name}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid var(--t-border)",
              background: "transparent",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--t-text)",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "#4a6741",
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "inherit",
              color: "#fff",
            }}
          >
            {t("settings.aiModuleSwitchButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiModuleSettingsPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(() => loadAiModuleSelection().selectedModuleId);
  const [pendingModule, setPendingModule] = useState<AiModule | null>(null);
  const [toast, setToast] = useState("");

  const modules = getActiveModules();

  useEffect(() => {
    setSelectedId(getSelectedModule().id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id === selectedId) return;
      const mod = modules.find(m => m.id === id);
      if (mod) setPendingModule(mod);
    },
    [selectedId, modules]
  );

  const handleConfirm = useCallback(() => {
    if (!pendingModule) return;
    saveAiModuleSelection(pendingModule.id);
    setSelectedId(pendingModule.id);
    setPendingModule(null);
    setToast(t("settings.aiModuleSwitchedToast", { name: pendingModule.name }));
  }, [pendingModule, t]);

  return (
    <div style={themeAppShellStyle}>
      <header style={themeHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/settings" style={themeBackLinkStyle} aria-label={t("common.close")}>
            ←
          </Link>
          <div>
            <div style={{ fontSize: "var(--t-font-size-xl)", fontWeight: "bold" }}>
              {t("settings.aiModulePageTitle")}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{t("settings.aiModuleLinkTitle")}</div>
          </div>
        </div>
      </header>

      <main style={{ padding: 16, flex: 1, paddingBottom: 32 }}>
        <div style={{ ...themeMutedTextStyle, marginBottom: 16, lineHeight: 1.6 }}>
          {t("settings.aiModulePageHint")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {modules.map(mod => (
            <ModuleCard
              key={mod.id}
              module={mod}
              selected={mod.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </main>

      {pendingModule && (
        <ConfirmModal
          module={pendingModule}
          onConfirm={handleConfirm}
          onCancel={() => setPendingModule(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1410",
            color: "#f5f0e8",
            padding: "12px 20px",
            borderRadius: 24,
            fontSize: 13,
            fontWeight: "bold",
            zIndex: 1001,
            maxWidth: "calc(100% - 32px)",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
