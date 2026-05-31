"use client";

import { useTranslation } from "react-i18next";

type Props = {
  latestMessage: string;
  onOpenChat: () => void;
  onSubmit?: (text: string) => void;
};

function truncateOneLine(text: string, max = 48): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max)}…`;
}

export function HomeAiChatTeaser({ latestMessage, onOpenChat, onSubmit }: Props) {
  const { t } = useTranslation();

  return (
    <div style={{ margin: "12px 16px 0", background: "var(--t-card-bg)", border: "1px solid var(--t-border)", borderRadius: "var(--t-radius-md)", padding: "14px 16px" }}>
      <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-text)", marginBottom: 8 }}>
        🌿 {t("home.homeAiChatTitle")}
      </div>
      <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
        「{latestMessage ? truncateOneLine(latestMessage) : t("home.homeAiChatPrompt")}」
      </div>
      <input
        type="text"
        readOnly
        onFocus={onOpenChat}
        onClick={onOpenChat}
        onKeyDown={e => {
          if (e.key !== "Enter") return;
          const value = (e.currentTarget as HTMLInputElement).value.trim();
          if (value) onSubmit?.(value);
          else onOpenChat();
        }}
        placeholder={t("home.homeAiChatPlaceholder")}
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid rgba(60,40,20,0.12)", fontSize: "var(--t-font-size-sm)", background: "white", cursor: "pointer" }}
      />
    </div>
  );
}
