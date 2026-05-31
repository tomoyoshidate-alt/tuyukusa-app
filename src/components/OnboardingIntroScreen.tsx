"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  onComplete: () => void;
};

const PAGE_COUNT = 3;

export function OnboardingIntroScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    if (page < PAGE_COUNT - 1) {
      setPage(p => p + 1);
    } else {
      onComplete();
    }
  }, [onComplete, page]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0 && page < PAGE_COUNT - 1) setPage(p => p + 1);
    if (dx > 0 && page > 0) setPage(p => p - 1);
  }, [page]);

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 14,
    padding: "16px 14px",
    border: "1px solid rgba(60,40,20,0.1)",
    marginBottom: 10,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 22000,
        background: "#f5f0e8",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px 20px",
        overflow: "hidden",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
        {page === 0 && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: "bold", color: "#1a1410", textAlign: "center", margin: "0 0 16px" }}>
              {t("intro.page1Title")}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#3d3228", margin: "0 0 20px", whiteSpace: "pre-line" }}>
              {t("intro.page1Description")}
            </p>
            <p style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741", margin: "0 0 12px" }}>
              {t("intro.page1Subtext")}
            </p>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card1Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228" }}>{t("intro.card1Body")}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card2Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228" }}>{t("intro.card2Body")}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card3Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228" }}>{t("intro.card3Body")}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, color: "#6b5c4a", margin: "8px 0 0", textAlign: "center" }}>
              {t("intro.page1Closing")}
            </p>
          </div>
        )}

        {page === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: "bold", color: "#1a1410", textAlign: "center", margin: "0 0 24px" }}>
              {t("intro.page2Title")}
            </h2>
            {[
              t("intro.step1"),
              t("intro.step2"),
              t("intro.step3"),
              t("intro.step4"),
            ].map((step, i, arr) => (
              <div key={i}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#4a6741",
                      color: "#f5f0e8",
                      fontSize: 13,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: "#1a1410", paddingTop: 3, flex: 1 }}>{step}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 6px 0", color: "#8b7355", fontSize: 18 }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {page === 2 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>🌿</div>
            <p style={{ fontSize: 18, fontWeight: "bold", lineHeight: 1.75, color: "#1a1410", margin: 0, maxWidth: 280 }}>
              {t("intro.page3Message")}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
        {Array.from({ length: PAGE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Page ${i + 1}`}
            onClick={() => setPage(i)}
            style={{
              width: i === page ? 20 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              padding: 0,
              background: i === page ? "#4a6741" : "rgba(60,40,20,0.2)",
              cursor: "pointer",
              transition: "width 0.2s ease, background 0.2s ease",
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={goNext}
        style={{
          padding: page === 2 ? "16px 24px" : "14px 20px",
          borderRadius: 12,
          border: "none",
          background: "#1a1410",
          color: "#f5f0e8",
          fontSize: page === 2 ? 17 : 15,
          fontWeight: "bold",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {page === 2 ? t("intro.start") : t("intro.next")}
      </button>
    </div>
  );
}
