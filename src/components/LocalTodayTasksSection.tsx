"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LocalTask } from "@/src/lib/localTasks";
import { LOCAL_TASK_CATEGORIES } from "@/src/lib/localTasks";
import { themeIconButtonStyle } from "@/src/lib/themeStyles";

type Props = {
  tasks: LocalTask[];
  onToggle: (task: LocalTask) => void;
  onAdd: (text: string, category: string) => void;
  onRemove: (id: string) => void;
};

export function LocalTodayTasksSection({ tasks, onToggle, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<string>("生活");

  const handleAdd = () => {
    if (!input.trim()) return;
    onAdd(input.trim(), category);
    setInput("");
  };

  return (
    <div
      id="today-tasks"
      style={{
        margin: "12px 16px 0",
        background: "var(--t-card-bg)",
        borderRadius: "var(--t-radius-md)",
        padding: "14px 14px 12px",
        border: "1px solid var(--t-border)",
        boxShadow: "var(--t-shadow)",
      }}
    >
      <div style={{ fontSize: "var(--t-font-size-lg)", fontWeight: "bold", color: "var(--t-text)", marginBottom: 10 }}>
        {t("home.todayTasks")}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("home.addTaskPlaceholder")}
          onKeyDown={e => {
            if (e.key === "Enter") handleAdd();
          }}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--t-border)",
            fontSize: "var(--t-font-size-base)",
            background: "var(--t-input-bg)",
            color: "var(--t-text)",
            minHeight: 44,
          }}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            padding: "8px 6px",
            borderRadius: 8,
            border: "1px solid var(--t-border)",
            fontSize: "var(--t-font-size-sm)",
            background: "var(--t-input-bg)",
            color: "var(--t-text)",
            minHeight: 44,
          }}
        >
          {LOCAL_TASK_CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: "8px 12px",
            minHeight: 44,
            borderRadius: 8,
            border: "none",
            background: "var(--t-primary)",
            color: "var(--t-text-inverse)",
            fontSize: "var(--t-font-size-base)",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {t("common.add")}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-text-muted)", padding: "4px 0", lineHeight: 1.6 }}>
          {t("home.todayTasksEmpty")}
        </div>
      ) : (
        tasks.map(task => (
          <div
            key={task.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              marginBottom: 6,
              // ダークテーマでも文字が読めるようトークンから作る
              background: task.status === "done" ? "var(--t-primary-bg)" : "var(--t-accent-bg)",
              borderRadius: 8,
              border: "1px solid var(--t-border)",
              opacity: task.status === "done" ? 0.75 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={task.status === "done"}
              onChange={() => onToggle(task)}
              style={{ width: 22, height: 22, accentColor: "var(--t-checkbox-accent)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: "var(--t-font-size-sm)",
                  color: "var(--t-primary-text, var(--t-primary))",
                  background: "var(--t-accent-bg)",
                  borderRadius: 8,
                  padding: "1px 6px",
                  marginRight: 4,
                }}
              >
                {task.category}
              </span>
              <span
                style={{
                  fontSize: "var(--t-font-size-base)",
                  color: "var(--t-text)",
                  textDecoration: task.status === "done" ? "line-through" : "none",
                }}
              >
                {task.text}
              </span>
              {task.time && (
                <span style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginLeft: 6 }}>
                  {task.time}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(task.id)}
              aria-label={t("common.delete")}
              style={{
                ...themeIconButtonStyle,
                color: "var(--t-text-muted)",
                fontSize: "var(--t-font-size-lg)",
              }}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
}
