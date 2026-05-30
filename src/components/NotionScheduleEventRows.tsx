'use client';

import type { NotionScheduleEvent } from "@/src/lib/notion";
import { scheduleEventLabel } from "@/src/lib/notion";

type Props = {
  events: NotionScheduleEvent[];
  onToggle: (event: NotionScheduleEvent) => void;
};

export default function NotionScheduleEventRows({ events, onToggle }: Props) {
  if (events.length === 0) return null;
  return (
    <>
      {events.map(event => (
        <div
          key={event.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginBottom: 6,
            background: event.status === "done" ? "#ede5d4" : "#fdf0e4",
            borderRadius: 8,
            border: "1px solid rgba(193,127,74,0.35)",
            opacity: event.status === "done" ? 0.75 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={event.status === "done"}
            onChange={() => onToggle(event)}
            style={{ width: 16, height: 16, accentColor: "#c17f4a", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 9,
                color: event.eventType === "meeting" ? "#4a6741" : "#8b5a2b",
                background: event.eventType === "meeting" ? "#e8f0e4" : "#fdf0e4",
                borderRadius: 8,
                padding: "1px 6px",
                marginRight: 4,
              }}
            >
              {scheduleEventLabel(event.eventType)}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "#3d3228",
                textDecoration: event.status === "done" ? "line-through" : "none",
              }}
            >
              {event.title}
            </span>
            {event.time && (
              <span style={{ fontSize: 10, color: "#9a8b7a", marginLeft: 6 }}>{event.time}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
