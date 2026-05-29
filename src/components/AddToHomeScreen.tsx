"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && !!(navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    try {
      if (localStorage.getItem("tuyukusa-a2hs-dismissed") === "1") setDismissed(true);
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem("tuyukusa-a2hs-dismissed", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIos()) {
      setShowIosGuide(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowIosGuide(true);
  }, [deferredPrompt]);

  if (installed || dismissed) return null;

  return (
    <>
      <div
        style={{
          margin: "12px 16px 0",
          background: "linear-gradient(135deg, #fdf0e4, #e8f0e4)",
          borderRadius: 12,
          padding: "12px 14px",
          border: "1px solid rgba(193,127,74,0.25)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>
          📲 ホーム画面に追加
        </div>
        <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 10, lineHeight: 1.5 }}>
          アプリのように素早く起動できます。オフラインでも基本画面を表示します。
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleInstall}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 10,
              border: "none",
              background: "#1a1410",
              color: "#f5f0e8",
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ホーム画面に追加
          </button>
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#9a8b7a",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            後で
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(26,20,16,0.65)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowIosGuide(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 430,
              background: "#f5f0e8",
              borderRadius: "20px 20px 0 0",
              padding: "20px 16px 28px",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 12 }}>
              ホーム画面に追加する方法
            </div>
            {isIos() ? (
              <ol style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
                <li>Safari 下部の <strong>共有</strong> ボタン（□↑）をタップ</li>
                <li><strong>ホーム画面に追加</strong> を選択</li>
                <li><strong>追加</strong> をタップ</li>
              </ol>
            ) : (
              <ol style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
                <li>Chrome メニュー（⋮）を開く</li>
                <li><strong>アプリをインストール</strong> または <strong>ホーム画面に追加</strong> を選択</li>
                <li>表示名を確認して追加</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: "#1a1410",
                color: "#f5f0e8",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
