"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { SUPABASE_SETUP_WIZARD_STEPS } from "@/src/lib/supabaseSetupWizardSteps";

type ChatMessage = { role: "user" | "ai"; text: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (url: string, anonKey: string, syncKey: string) => void;
};

const STEPS = SUPABASE_SETUP_WIZARD_STEPS;

const PROJECT_URL_PATH_ERROR = "/rest/v1/などは不要です";
const PROJECT_URL_FORMAT_ERROR = "https://xxxx.supabase.coの形式で入力してください";

function getProjectUrlValidationError(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/\/rest\/v1|\/auth\/v1|\/storage\/v1|\/realtime\/v1/i.test(trimmed)) {
    return PROJECT_URL_PATH_ERROR;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname && parsed.pathname !== "/") {
      return PROJECT_URL_PATH_ERROR;
    }
  } catch {
    return PROJECT_URL_FORMAT_ERROR;
  }
  if (!/^https:\/\/.+\.supabase\.co\/?$/i.test(trimmed)) {
    return PROJECT_URL_FORMAT_ERROR;
  }
  return null;
}

export function SupabaseSetupWizard({ isOpen, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [syncKey, setSyncKey] = useState("");
  const [sqlCopied, setSqlCopied] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const projectUrlError = getProjectUrlValidationError(projectUrl);
  const canComplete = Boolean(projectUrl.trim() && anonKey.trim() && syncKey.trim() && !projectUrlError);

  const resetWizard = useCallback(() => {
    setStepIndex(0);
    setChatMessages([]);
    setChatInput("");
    setIsComposing(false);
    setIsTyping(false);
    setProjectUrl("");
    setAnonKey("");
    setSyncKey("");
    setSqlCopied(false);
    setIsSetupComplete(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetWizard();
  }, [isOpen, resetWizard]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping, stepIndex]);

  const appendChat = useCallback((user: string, ai: string) => {
    setChatMessages(prev => [...prev, { role: "user", text: user }, { role: "ai", text: ai }]);
  }, []);

  const askClaude = useCallback(
    async (question: string) => {
      setChatMessages(prev => [...prev, { role: "user", text: question }]);
      setIsTyping(true);
      try {
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: `あなたはつゆくさアプリのSupabaseクラウド同期セットアップをサポートするAIガイドです。ユーザーの疑問に日本語で簡潔・丁寧に答えてください。2〜4文程度で。技術的な専門用語は避け初心者にも伝わる言葉で。\n現在のステップ: ${step.label}\n手順: ${step.ai}`,
            messages: [{ role: "user", content: question }],
          }),
        });
        const data = (await res.json()) as { content?: string; error?: string };
        const answer =
          data.content ??
          "申し訳ございません。回答を取得できませんでした。もう一度お試しください。";
        setChatMessages(prev => [...prev, { role: "ai", text: answer }]);
      } catch {
        setChatMessages(prev => [
          ...prev,
          { role: "ai", text: "接続エラーが発生しました。しばらくしてからもう一度お試しください。" },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [step.ai, step.label],
  );

  const handleQuickQuestion = useCallback(
    (q: string) => {
      const answer = step.qa[q];
      if (answer) {
        appendChat(q, answer);
        return;
      }
      void askClaude(q);
    },
    [appendChat, askClaude, step.qa],
  );

  const handleSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || isTyping) return;
    setChatInput("");

    const fixed = step.qa[text];
    if (fixed) {
      appendChat(text, fixed);
      return;
    }
    void askClaude(text);
  }, [appendChat, askClaude, chatInput, isTyping, step.qa]);

  const handleChatKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;
    if (e.keyCode === 229) return;
    e.preventDefault();
    handleSend();
  };

  const handleCopySql = async () => {
    if (!step.sql) return;
    try {
      await navigator.clipboard.writeText(step.sql);
      setSqlCopied(true);
      window.setTimeout(() => setSqlCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const goNext = () => {
    if (isLastStep) {
      if (!canComplete) return;
      onComplete(projectUrl.trim(), anonKey.trim(), syncKey.trim());
      setIsSetupComplete(true);
      return;
    }
    setStepIndex(i => i + 1);
    setChatMessages([]);
    setChatInput("");
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    setStepIndex(i => i - 1);
    setChatMessages([]);
    setChatInput("");
  };

  if (!isOpen) return null;

  if (isSetupComplete) {
    return (
      <div className="supabase-wizard-overlay" onClick={onClose}>
        <div className="supabase-wizard-modal" onClick={e => e.stopPropagation()}>
          <div style={completeBodyStyle}>
            <div style={completeEmojiStyle}>🎉</div>
            <div style={completeTitleStyle}>クラウド同期の設定が完了しました！</div>
            <p style={completeTextStyle}>スマホとPCでデータが同期されます。</p>
            <p style={{ ...completeTextStyle, marginBottom: 28 }}>
              Notion・Googleカレンダーなどの連携は、
              <br />
              後ほど設定画面からいつでも設定できます。
            </p>
            <button type="button" onClick={onClose} style={completeBtnStyle}>
              つゆくさをはじめる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supabase-wizard-overlay" onClick={onClose}>
      <div className="supabase-wizard-modal" onClick={e => e.stopPropagation()}>
        <header style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#1a1410" }}>クラウド同期セットアップ</div>
              <div style={{ fontSize: 11, color: "#8b7355" }}>{step.label}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="閉じる">
            ×
          </button>
        </header>

        <div style={progressRowStyle}>
          {STEPS.map((s, i) => (
            <div
              key={s.label}
              title={s.label}
              style={{
                ...dotStyle,
                ...(i < stepIndex ? dotDoneStyle : {}),
                ...(i === stepIndex ? dotCurrentStyle : {}),
              }}
            />
          ))}
        </div>

        <div style={bodyStyle}>
          <div style={guideBubbleStyle}>{step.ai}</div>

          {step.links.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {step.links.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkBtnStyle}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {step.sql && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: "bold", color: "#3d3228" }}>SQL（コピーして貼り付け）</span>
                <button type="button" onClick={() => void handleCopySql()} style={copyBtnStyle}>
                  {sqlCopied ? "コピーしました" : "コピー"}
                </button>
              </div>
              <pre style={sqlBlockStyle}>{step.sql}</pre>
            </div>
          )}

          {chatMessages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    fontSize: 13,
                    lineHeight: 1.65,
                    whiteSpace: "pre-line",
                    background: msg.role === "user" ? "#c17f4a" : "white",
                    color: msg.role === "user" ? "#fff" : "#1a1410",
                    border: msg.role === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none",
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                <div style={typingBubbleStyle}>
                  <span className="supabase-wizard-typing-dot" />
                  <span className="supabase-wizard-typing-dot" />
                  <span className="supabase-wizard-typing-dot" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {step.quickQs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {step.quickQs.map(q => (
                <button
                  key={q}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleQuickQuestion(q)}
                  style={pillStyle}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {step.isInputStep && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Supabase Project URL</label>
              <input
                type="url"
                placeholder="https://xxxx.supabase.co"
                value={projectUrl}
                onChange={e => setProjectUrl(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: projectUrlError ? "#c44a4a" : "rgba(60,40,20,0.12)",
                }}
              />
              {projectUrlError && (
                <div style={{ fontSize: 11, color: "#c44a4a", marginTop: -4, marginBottom: 8, lineHeight: 1.5 }}>
                  {projectUrlError}
                </div>
              )}
              <label style={labelStyle}>Supabase Publishable key</label>
              <input
                type="password"
                placeholder="sb_publishable_..."
                value={anonKey}
                onChange={e => setAnonKey(e.target.value)}
                style={inputStyle}
              />
              <label style={labelStyle}>同期キー</label>
              <input
                type="text"
                placeholder="例: my-tuyukusa-2024"
                value={syncKey}
                onChange={e => setSyncKey(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={e => {
                if (isComposing) return;
                handleChatKey(e);
              }}
              placeholder="質問を入力..."
              disabled={isTyping}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!chatInput.trim() || isTyping}
              style={{
                ...footerPrimaryStyle,
                flex: "0 0 auto",
                padding: "10px 14px",
                opacity: chatInput.trim() && !isTyping ? 1 : 0.5,
              }}
            >
              送信
            </button>
          </div>
        </div>

        <footer style={footerStyle}>
          <button type="button" onClick={goBack} disabled={stepIndex === 0} style={footerSecondaryStyle}>
            戻る
          </button>
          <span style={{ fontSize: 12, color: "#8b7355" }}>
            {stepIndex + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={isLastStep && !canComplete}
            style={{
              ...footerPrimaryStyle,
              opacity: isLastStep && !canComplete ? 0.5 : 1,
            }}
          >
            {isLastStep ? "設定完了" : "次へ"}
          </button>
        </footer>
      </div>
    </div>
  );
}

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 18px 12px",
  borderBottom: "1px solid rgba(60,40,20,0.08)",
  background: "white",
};

const closeBtnStyle: CSSProperties = {
  border: "none",
  background: "none",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  color: "#9a8b7a",
  padding: "0 4px",
};

const progressRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 8,
  padding: "12px 18px",
  background: "white",
  borderBottom: "1px solid rgba(60,40,20,0.06)",
};

const dotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#d4ccc0",
  border: "2px solid transparent",
};

const dotDoneStyle: CSSProperties = {
  background: "#c17f4a",
};

const dotCurrentStyle: CSSProperties = {
  background: "white",
  borderColor: "#c17f4a",
  boxShadow: "0 0 0 2px rgba(193,127,74,0.35)",
};

const bodyStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 18px",
};

const guideBubbleStyle: CSSProperties = {
  background: "#fdf0e4",
  border: "1px solid rgba(193,127,74,0.25)",
  borderRadius: 14,
  padding: "14px 14px",
  fontSize: 13,
  lineHeight: 1.75,
  color: "#3d3228",
  whiteSpace: "pre-line",
  marginBottom: 12,
};

const linkBtnStyle: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 20,
  background: "white",
  border: "1.5px solid rgba(193,127,74,0.35)",
  color: "#8b5a2b",
  fontSize: 12,
  textDecoration: "none",
  fontWeight: "bold",
};

const sqlBlockStyle: CSSProperties = {
  fontSize: 10,
  background: "#1a1410",
  color: "#c5d8be",
  padding: 12,
  borderRadius: 10,
  overflowX: "auto",
  margin: 0,
  lineHeight: 1.5,
};

const copyBtnStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 8,
  border: "none",
  background: "#c17f4a",
  color: "white",
  fontSize: 11,
  fontWeight: "bold",
  cursor: "pointer",
};

const pillStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 20,
  border: "1.5px solid rgba(60,40,20,0.12)",
  background: "#ede5d4",
  color: "#3d3228",
  fontSize: 12,
  cursor: "pointer",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: "bold",
  color: "#3d3228",
  marginBottom: 4,
  marginTop: 8,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(60,40,20,0.12)",
  fontSize: 13,
  marginBottom: 8,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const typingBubbleStyle: CSSProperties = {
  alignSelf: "flex-start",
  display: "flex",
  gap: 4,
  padding: "12px 14px",
  borderRadius: 14,
  background: "white",
  border: "1px solid rgba(60,40,20,0.1)",
};

const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 18px 16px",
  borderTop: "1px solid rgba(60,40,20,0.08)",
  background: "white",
};

const footerSecondaryStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1.5px solid rgba(60,40,20,0.15)",
  background: "white",
  color: "#3d3228",
  fontSize: 13,
  cursor: "pointer",
};

const footerPrimaryStyle: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 13,
  fontWeight: "bold",
  cursor: "pointer",
};

const completeBodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 28px 36px",
  textAlign: "center",
};

const completeEmojiStyle: CSSProperties = {
  fontSize: 48,
  marginBottom: 16,
};

const completeTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: "bold",
  color: "#1a1410",
  marginBottom: 16,
  lineHeight: 1.5,
};

const completeTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#3d3228",
  lineHeight: 1.75,
  margin: "0 0 12px",
};

const completeBtnStyle: CSSProperties = {
  width: "100%",
  maxWidth: 280,
  padding: "14px 20px",
  borderRadius: 12,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 15,
  fontWeight: "bold",
  cursor: "pointer",
};
