"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { handleChatTextareaKeyDown, isMacPlatform as detectMacPlatform } from "@/src/lib/chatSubmitKeyboard";

type Props = {
  latestMessage: string;
  onOpenChat: () => void;
  onSubmit?: (text: string) => void;
};

const PLACEHOLDER_KEYS = [
  "home.homeAiChatPlaceholderHealth",
  "home.homeAiChatPlaceholderSchedule",
  "home.homeAiChatPlaceholderSupabase",
  "home.homeAiChatPlaceholderSound",
  "home.homeAiChatPlaceholderWellness",
] as const;

const PLACEHOLDER_ROTATE_MS = 4000;

function truncateOneLine(text: string, max = 48): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max)}…`;
}

export function HomeAiChatTeaser({ latestMessage, onOpenChat, onSubmit }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = useMemo(
    () => PLACEHOLDER_KEYS.map(key => t(key)),
    [t],
  );

  useEffect(() => {
    if (input.trim()) return;
    const timer = window.setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % placeholders.length);
    }, PLACEHOLDER_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [input, placeholders.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) {
      onOpenChat();
      return;
    }
    onSubmit?.(text);
    setInput("");
  };

  const rotatingPlaceholder = placeholders[placeholderIndex] ?? t("home.homeAiChatPlaceholder");

  return (
    <div style={{ margin: "12px 16px 0", background: "var(--t-card-bg)", border: "1px solid var(--t-border)", borderRadius: "var(--t-radius-md)", padding: "14px 16px" }}>
      <button
        type="button"
        onClick={onOpenChat}
        style={{ display: "block", width: "100%", padding: 0, margin: 0, border: "none", background: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
      >
        <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-text)", marginBottom: 8 }}>
          {t("home.homeAiChatTitle")}
        </div>
        <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
          「{latestMessage ? truncateOneLine(latestMessage) : t("home.homeAiChatPrompt")}」
        </div>
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={input.trim() ? t("home.homeAiChatPlaceholder") : rotatingPlaceholder}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={e => handleChatTextareaKeyDown(e, handleSend, isComposing)}
          rows={2}
          style={{
            flex: 1,
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1.5px solid rgba(60,40,20,0.12)",
            fontSize: "var(--t-font-size-sm)",
            background: "white",
            resize: "none",
            minHeight: 44,
            maxHeight: 88,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          style={{
            padding: "10px 12px",
            minHeight: 44,
            borderRadius: 12,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          {detectMacPlatform() ? t("chat.sendMac") : t("chat.sendWin")}
        </button>
      </div>
    </div>
  );
}
