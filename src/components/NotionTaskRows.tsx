'use client';

import type { NotionTask } from "@/src/lib/notion";
import { mapNotionTypeLabel } from "@/src/lib/notion";

type Props = {
  tasks: NotionTask[];
  onToggle: (task: NotionTask) => void;
  showType?: boolean;
};

export default function NotionTaskRows({ tasks, onToggle, showType = false }: Props) {
  if (tasks.length === 0) return null;
  return (
    <>
      {tasks.map(task => (
        <div
          key={task.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginBottom: 6,
            background: task.status === "done" ? "#ede5d4" : "#eef4fb",
            borderRadius: 8,
            border: "1px solid rgba(126,200,227,0.35)",
            opacity: task.status === "done" ? 0.75 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={task.status === "done"}
            onChange={() => onToggle(task)}
            style={{ width: 16, height: 16, accentColor: "#7ec8e3", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: "#4a6741", background: "#e8f0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>
              Notion
            </span>
            {showType && (
              <span style={{ fontSize: 9, color: "#7ec8e3", background: "rgba(126,200,227,0.15)", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>
                {mapNotionTypeLabel(task.type)}
              </span>
            )}
            <span
              style={{
                fontSize: 13,
                color: "#3d3228",
                textDecoration: task.status === "done" ? "line-through" : "none",
              }}
            >
              {task.text}
            </span>
            {task.time && (
              <span style={{ fontSize: 10, color: "#9a8b7a", marginLeft: 6 }}>{task.time}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
