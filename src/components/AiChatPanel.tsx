"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { handleChatTextareaKeyDown, isMacPlatform as detectMacPlatform } from "@/src/lib/chatSubmitKeyboard";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";

export type ScheduleSuggestion = {
  id: string;
  time: string;
  label: string;
  sub: string;
};

export type AiChatPanelMessage = {
  type: string;
  text: string;
  choices?: string[];
  scheduleReflection?: ScheduleReflection;
  reflected?: boolean;
  scheduleSuggestions?: ScheduleSuggestion[];
  showSchedule?: boolean;
  addedScheduleIds?: string[];
};

type Props = {
  messages: AiChatPanelMessage[];
  isLoading: boolean;
  chatInput: string;
  isComposing: boolean;
  onChatInputChange: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onSend: () => void;
  onChoice: (choice: string) => void;
  onOpenReflection: (reflection: ScheduleReflection, messageIndex: number) => void;
  onApplyAllSuggestions: (messageIndex: number) => void;
  onAddSuggestion: (messageIndex: number, suggestionId: string) => void;
  compact?: boolean;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  placeholder?: string;
};

export function AiChatPanel({
  messages,
  isLoading,
  chatInput,
  isComposing,
  onChatInputChange,
  onCompositionStart,
  onCompositionEnd,
  onSend,
  onChoice,
  onOpenReflection,
  onApplyAllSuggestions,
  onAddSuggestion,
  compact = false,
  messagesEndRef: externalEndRef,
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const internalEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalEndRef ?? internalEndRef;
  const macPlatform = detectMacPlatform();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, messagesEndRef]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: compact ? "var(--t-card-bg)" : "transparent",
        border: compact ? "1px solid var(--t-border)" : "none",
        borderRadius: compact ? "var(--t-radius-md)" : 0,
        overflow: "hidden",
        ...(compact ? { margin: "12px 16px 0", maxHeight: 420 } : { flex: 1, minHeight: 0 }),
      }}
    >
      {compact && (
        <div
          style={{
            padding: "12px 14px 8px",
            fontSize: "var(--t-font-size-lg)",
            fontWeight: "bold",
            color: "var(--t-text)",
            borderBottom: "1px solid var(--t-border)",
          }}
        >
          {t("home.homeAiChat")}
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: compact ? 12 : 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: compact ? 200 : undefined,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 18,
                  fontSize: compact ? 12 : 13,
                  lineHeight: 1.7,
                  background: msg.type === "user" ? "#1a1410" : "white",
                  color: msg.type === "user" ? "#f5f0e8" : "#1a1410",
                  border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none",
                }}
              >
                {msg.text.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.text.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
            {msg.choices && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {msg.choices.map((c, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => onChoice(c)}
                    style={{
                      background: "#ede5d4",
                      border: "1.5px solid rgba(60,40,20,0.12)",
                      borderRadius: 20,
                      padding: "7px 14px",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "#3d3228",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {msg.scheduleReflection && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxWidth: "90%" }}>
                {msg.scheduleReflection.schedule.map((item, j) => (
                  <div
                    key={`${item.time}-${j}`}
                    style={{
                      background: "#fdf0e4",
                      border: "1.5px solid #c17f4a",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 11,
                      color: "#8b5a2b",
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      {item.time} {item.title}
                    </div>
                    {item.memo && <div style={{ opacity: 0.75, marginTop: 2 }}>{item.memo}</div>}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={msg.reflected}
                  onClick={() => onOpenReflection(msg.scheduleReflection!, i)}
                  style={{
                    textAlign: "center",
                    background: msg.reflected ? "#e8f0e4" : "#1a1410",
                    border: `1.5px solid ${msg.reflected ? "#6b8f62" : "#1a1410"}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 13,
                    fontWeight: "bold",
                    cursor: msg.reflected ? "default" : "pointer",
                    color: msg.reflected ? "#4a6741" : "#f5f0e8",
                  }}
                >
                  {msg.reflected ? t("reflectSchedule.applied") : t("reflectSchedule.applyButton")}
                </button>
              </div>
            )}
            {msg.scheduleSuggestions && msg.scheduleSuggestions.length > 0 && !msg.scheduleReflection && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxWidth: "90%" }}>
                {msg.showSchedule && (
                  <button
                    type="button"
                    disabled={msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id))}
                    onClick={() => onApplyAllSuggestions(i)}
                    style={{
                      textAlign: "center",
                      background: msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id))
                        ? "#e8f0e4"
                        : "#1a1410",
                      border: `1.5px solid ${msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id)) ? "#6b8f62" : "#1a1410"}`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: "bold",
                      cursor: msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id))
                        ? "default"
                        : "pointer",
                      color: msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id))
                        ? "#4a6741"
                        : "#f5f0e8",
                    }}
                  >
                    {msg.scheduleSuggestions.every(s => msg.addedScheduleIds?.includes(s.id))
                      ? "今日のスケジュールに反映済み"
                      : "今日のスケジュールに反映する"}
                  </button>
                )}
                {!msg.showSchedule &&
                  msg.scheduleSuggestions.map(sug => {
                    const added = msg.addedScheduleIds?.includes(sug.id);
                    return (
                      <button
                        key={sug.id}
                        type="button"
                        disabled={added}
                        onClick={() => onAddSuggestion(i, sug.id)}
                        style={{
                          textAlign: "left",
                          background: added ? "#e8f0e4" : "#fdf0e4",
                          border: `1.5px solid ${added ? "#6b8f62" : "#c17f4a"}`,
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontSize: 11,
                          cursor: added ? "default" : "pointer",
                          color: added ? "#4a6741" : "#8b5a2b",
                          opacity: added ? 0.85 : 1,
                        }}
                      >
                        <div style={{ fontWeight: "bold", marginBottom: 2 }}>
                          {added ? "スケジュールに追加済み" : "スケジュールに追加"}
                        </div>
                        <div>
                          {sug.time} {sug.label}
                        </div>
                        {sug.sub && <div style={{ opacity: 0.75, marginTop: 2 }}>{sug.sub}</div>}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              background: "white",
              border: "1px solid rgba(60,40,20,0.1)",
              borderRadius: 18,
              padding: "12px 14px",
              width: 60,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map(n => (
                <div
                  key={n}
                  style={{ width: 6, height: 6, background: "#c17f4a", borderRadius: "50%", opacity: 0.5 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: compact ? "8px 10px" : "10px 16px", background: "#f5f0e8", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          style={{
            flex: 1,
            background: "white",
            border: "1.5px solid rgba(60,40,20,0.12)",
            borderRadius: 22,
            padding: "10px 16px",
            fontSize: 13,
            outline: "none",
            resize: "none",
            minHeight: 42,
            maxHeight: 100,
            fontFamily: "sans-serif",
            lineHeight: 1.5,
          }}
          placeholder={placeholder ?? t("chat.placeholder")}
          value={chatInput}
          onChange={e => onChatInputChange(e.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onKeyDown={e => handleChatTextareaKeyDown(e, onSend, isComposing)}
          rows={2}
        />
        <button
          type="button"
          onClick={onSend}
          style={{
            padding: "10px 14px",
            minHeight: 42,
            borderRadius: 22,
            background: "#1a1410",
            border: "none",
            cursor: "pointer",
            color: "white",
            fontSize: 12,
            fontWeight: "bold",
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          {macPlatform ? t("chat.sendMac") : t("chat.sendWin")}
        </button>
      </div>
    </div>
  );
}
