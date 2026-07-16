"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  INITIAL_LOCAL_TASKS,
  newLocalTask,
  normalizeLocalTasks,
  type LocalTasksStorage,
} from "@/src/lib/localTasks";
import QuickLaunchGuide from "@/src/components/QuickLaunchGuide";

const LOCAL_TASKS_KEY = "tuyukusa-local-tasks";

function getDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function loadTasks(): LocalTasksStorage {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    return raw ? normalizeLocalTasks(JSON.parse(raw)) : { ...INITIAL_LOCAL_TASKS };
  } catch {
    return { ...INITIAL_LOCAL_TASKS };
  }
}

function addTask(text: string): void {
  const storage = loadTasks();
  storage.tasks.push(newLocalTask(text, getDayKey()));
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(storage));
  } catch {
    /* ignore */
  }
}

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript?: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

/**
 * 最速タスク追加ページ。
 * 背面ダブルタップ・ホーム画面ショートカット・PWAショートカットから開いて、
 * すぐに音声（または1行入力）でタスクを追加できる。
 */
export default function QuickAddPage() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [added, setAdded] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const autoStartedRef = useRef(false);

  const handleTranscript = useCallback((transcript: string) => {
    const v = transcript.trim();
    if (!v) return;
    addTask(v);
    setAdded(prev => [v, ...prev]);
  }, []);

  useEffect(() => {
    const SR = typeof window !== "undefined" ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = event => {
      const t = event.results[0]?.[0]?.transcript?.trim();
      if (t) handleTranscript(t);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, [handleTranscript]);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  // 起動直後の自動スタートを試す（マイク許可済みの端末なら即話せる。ブロックされたら手動ボタンで）
  useEffect(() => {
    if (autoStartedRef.current || !supported) return;
    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      const rec = recognitionRef.current;
      if (!rec) return;
      try {
        rec.start();
        setListening(true);
      } catch {
        /* ユーザー操作が必要な端末では大きなボタンから開始 */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [supported]);

  const handleAddText = useCallback(() => {
    const v = text.trim();
    if (!v) return;
    addTask(v);
    setAdded(prev => [v, ...prev]);
    setText("");
  }, [text]);

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f0e8", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px 40px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 13, color: "#6b5c4a", marginBottom: 4 }}>つゆくさ</div>
        <h1 style={{ fontSize: 20, color: "#1a1410", margin: "0 0 16px" }}>声でタスクを追加</h1>

        {supported ? (
          <button
            type="button"
            onClick={startListening}
            style={{
              width: "100%",
              padding: "36px 20px",
              borderRadius: 20,
              border: listening ? "3px solid #c44a4a" : "3px solid #4a6741",
              background: listening ? "rgba(196,74,74,0.10)" : "white",
              cursor: "pointer",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>{listening ? "👂" : "🎤"}</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: listening ? "#c44a4a" : "#4a6741" }}>
              {listening ? "聞いています… 話してください" : "タップして話す"}
            </div>
            <div style={{ fontSize: 12, color: "#8b7355", marginTop: 6 }}>
              例：「牛乳を買う」「17時に電話」
            </div>
          </button>
        ) : (
          <div style={{ fontSize: 13, color: "#8b7355", background: "white", borderRadius: 12, padding: 14, marginBottom: 14, lineHeight: 1.7 }}>
            この端末のブラウザは音声入力に対応していないため、下の入力欄からタスクを追加できます。
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleAddText();
            }}
            placeholder="文字で入力してもOK"
            style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1.5px solid rgba(60,40,20,0.15)", fontSize: 14, background: "white", color: "#3d3228" }}
          />
          <button
            type="button"
            onClick={handleAddText}
            style={{ padding: "12px 18px", borderRadius: 12, border: "none", background: "#4a6741", color: "white", fontSize: 14, fontWeight: "bold", cursor: "pointer", flexShrink: 0 }}
          >
            追加
          </button>
        </div>

        {added.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "#6b5c4a", marginBottom: 8 }}>今日のタスクに追加しました ✓</div>
            {added.map((a, i) => (
              <div key={i} style={{ fontSize: 14, color: "#3d3228", padding: "4px 0", borderBottom: i < added.length - 1 ? "1px dashed rgba(60,40,20,0.08)" : "none" }}>
                ・{a}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <Link
            href="/"
            style={{ flex: 1, textAlign: "center", padding: "12px 16px", borderRadius: 12, border: "1.5px solid rgba(60,40,20,0.15)", background: "white", color: "#3d3228", fontSize: 14, textDecoration: "none" }}
          >
            アプリを開く
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(v => !v)}
          style={{ border: "none", background: "transparent", color: "#4a6741", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0, marginBottom: 12 }}
        >
          {showGuide ? "▲ 設定ガイドを閉じる" : "▼ この画面を背面ダブルタップで開くには（機種別ガイド）"}
        </button>
        {showGuide && <QuickLaunchGuide />}
      </div>
    </div>
  );
}
