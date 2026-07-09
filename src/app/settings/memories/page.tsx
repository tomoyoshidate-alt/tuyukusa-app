"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteMemoryById,
  loadAllMemories,
} from "@/src/lib/memory/storage";
import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  type AiMemory,
  type MemoryCategory,
} from "@/src/lib/memory/types";
import {
  themeAppShellStyle,
  themeCardStyle,
  themeHeaderStyle,
  themeMutedTextStyle,
} from "@/src/lib/themeStyles";

function MemoryItem({ memory, onDelete }: { memory: AiMemory; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  return (
    <div
      style={{
        ...themeCardStyle,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, fontSize: 13, color: "var(--t-text)", lineHeight: 1.65 }}>{memory.content}</div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          onDelete(memory.id);
          setBusy(false);
        }}
        aria-label={t("memories.delete")}
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "1px solid rgba(196,74,74,0.35)",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 11,
          color: "#c44a4a",
          cursor: busy ? "default" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {t("common.delete")}
      </button>
    </div>
  );
}

export default function MemoriesSettingsPage() {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<AiMemory[]>([]);

  const refresh = useCallback(() => {
    setMemories(loadAllMemories().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = (id: string) => {
    deleteMemoryById(id);
    refresh();
  };

  const grouped = MEMORY_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = memories.filter(m => m.category === cat);
      return acc;
    },
    {} as Record<MemoryCategory, AiMemory[]>
  );

  const hasAny = memories.length > 0;

  return (
    <div style={themeAppShellStyle}>
      <header style={themeHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/settings"
            style={{ color: "inherit", textDecoration: "none", fontSize: 20, lineHeight: 1 }}
            aria-label={t("common.close")}
          >
            ←
          </Link>
          <div>
            <div style={{ fontSize: "var(--t-font-size-xl)", fontWeight: "bold" }}>
              {t("settings.memoriesPageTitle")}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{t("settings.memoriesLinkTitle")}</div>
          </div>
        </div>
      </header>

      <main style={{ padding: 16, flex: 1, paddingBottom: 32 }}>
        <div style={{ ...themeMutedTextStyle, marginBottom: 16, lineHeight: 1.7 }}>
          {t("settings.memoriesPageHint")}
        </div>

        {!hasAny && (
          <div
            style={{
              ...themeCardStyle,
              textAlign: "center",
              padding: "24px 16px",
              fontSize: 13,
              color: "var(--t-text-muted)",
              lineHeight: 1.75,
            }}
          >
            {t("settings.memoriesEmpty")}
          </div>
        )}

        {MEMORY_CATEGORIES.map(category => {
          const items = grouped[category];
          if (!items.length) return null;
          return (
            <section key={category} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#6b8f62",
                  marginBottom: 8,
                }}
              >
                {MEMORY_CATEGORY_LABELS[category]}
              </div>
              {items.map(mem => (
                <MemoryItem key={mem.id} memory={mem} onDelete={handleDelete} />
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}
