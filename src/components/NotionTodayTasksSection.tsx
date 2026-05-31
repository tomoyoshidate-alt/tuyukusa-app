'use client';

import { useTranslation } from "react-i18next";
import type { NotionScheduleEvent, NotionTask } from "@/src/lib/notion";
import { formatSyncTime } from "@/src/lib/notion";
import NotionScheduleEventRows from "@/src/components/NotionScheduleEventRows";
import NotionTaskRows from "@/src/components/NotionTaskRows";

type Props = {
  tasks: NotionTask[];
  scheduleEvents: NotionScheduleEvent[];
  connected: boolean;
  lastSyncAt?: number;
  syncing: boolean;
  onToggleTask: (task: NotionTask) => void;
  onToggleScheduleEvent: (event: NotionScheduleEvent) => void;
  onSync: () => void;
};

export default function NotionTodayTasksSection({
  tasks,
  scheduleEvents,
  connected,
  lastSyncAt,
  syncing,
  onToggleTask,
  onToggleScheduleEvent,
  onSync,
}: Props) {
  const { t } = useTranslation();
  const hasContent = tasks.length > 0 || scheduleEvents.length > 0;

  return (
    <div
      id="notion-today-tasks"
      style={{
        margin: "12px 16px 0",
        background: "var(--t-card-bg)",
        borderRadius: "var(--t-radius-md)",
        padding: "14px 14px 12px",
        border: "1px solid var(--t-notion-border)",
        boxShadow: "var(--t-shadow)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: "var(--t-font-size-lg)", fontWeight: "bold", color: "var(--t-text)" }}>{t("home.notionTasks")}</div>
          <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginTop: 2 }}>
            {connected ? `Notion · ${formatSyncTime(lastSyncAt)}` : t("notion.notConnected")}
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || !connected}
          style={{
            padding: "6px 10px",
            borderRadius: "var(--t-radius-sm)",
            border: "none",
            background: "var(--t-notion-bg)",
            color: "var(--t-primary)",
            fontSize: "var(--t-font-size-sm)",
            fontWeight: "bold",
            cursor: syncing || !connected ? "default" : "pointer",
            opacity: syncing || !connected ? 0.6 : 1,
            fontFamily: "var(--t-font-family)",
          }}
        >
          {syncing ? t("common.syncing") : t("common.sync")}
        </button>
      </div>

      {!connected && (
        <div style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-text-muted)", padding: "8px 0", lineHeight: 1.6 }}>
          {t("home.notionNotConnected")}
        </div>
      )}

      {connected && !hasContent && !syncing && (
        <div style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-primary)", padding: "8px 0", lineHeight: 1.6 }}>
          {t("home.notionTasksEmpty")}
        </div>
      )}

      {tasks.length > 0 && (
        <>
          <div style={{ fontSize: "var(--t-font-size-sm)", fontWeight: "bold", color: "var(--t-primary)", marginBottom: 6 }}>{t("home.tasks")}</div>
          <NotionTaskRows tasks={tasks} onToggle={onToggleTask} showType />
        </>
      )}

      {scheduleEvents.length > 0 && (
        <>
          <div
            style={{
              fontSize: "var(--t-font-size-sm)",
              fontWeight: "bold",
              color: "var(--t-accent)",
              marginTop: tasks.length > 0 ? 12 : 0,
              marginBottom: 6,
            }}
          >
            {t("home.notionMtgDeadline")}
          </div>
          <NotionScheduleEventRows events={scheduleEvents} onToggle={onToggleScheduleEvent} />
        </>
      )}
    </div>
  );
}
