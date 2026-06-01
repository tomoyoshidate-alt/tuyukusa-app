"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatIntroBirthDate,
  loadIntroDraft,
  saveIntroDraft,
  type IntroDraft,
} from "@/src/lib/introStorage";

type Props = {
  onComplete: () => void;
};

const PAGE_COUNT = 4;
const INTEREST_KEYS = ["interestRhythm", "interestHealth", "interestSound"] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildDraftFromState(state: {
  selectedInterests: string[];
  featureOther: string;
  nickname: string;
  skipNickname: boolean;
  birthYear: number | "";
  birthMonth: number | "";
  birthDay: number | "";
  gender: string;
}): IntroDraft {
  const draft: IntroDraft = {
    featureInterests: [...state.selectedInterests],
    featureOther: state.featureOther.trim() || undefined,
    skipNickname: state.skipNickname,
    gender: state.gender || undefined,
  };
  if (!state.skipNickname && state.nickname.trim()) {
    draft.nickname = state.nickname.trim();
  }
  if (state.birthYear && state.birthMonth && state.birthDay) {
    draft.birthYear = state.birthYear;
    draft.birthMonth = state.birthMonth;
    draft.birthDay = state.birthDay;
    draft.birthDate = formatIntroBirthDate(state.birthYear, state.birthMonth, state.birthDay);
  }
  return draft;
}

export function OnboardingIntroScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [featureOther, setFeatureOther] = useState("");
  const [nickname, setNickname] = useState("");
  const [skipNickname, setSkipNickname] = useState(false);
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [birthMonth, setBirthMonth] = useState<number | "">("");
  const [birthDay, setBirthDay] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [pendingComplete, setPendingComplete] = useState(false);

  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!pendingComplete) return;
    try {
      localStorage.setItem("introCompleted", "true");
    } catch {
      /* ignore quota / private mode */
    }
    onComplete();
  }, [pendingComplete, onComplete]);

  useEffect(() => {
    const saved = loadIntroDraft();
    if (!saved) return;
    setSelectedInterests(saved.featureInterests ?? []);
    setFeatureOther(saved.featureOther ?? "");
    setNickname(saved.nickname ?? "");
    setSkipNickname(saved.skipNickname ?? false);
    setBirthYear(saved.birthYear ?? "");
    setBirthMonth(saved.birthMonth ?? "");
    setBirthDay(saved.birthDay ?? "");
    setGender(saved.gender ?? "");
  }, []);

  const yearOptions = useMemo(
    () => Array.from({ length: 100 }, (_, i) => currentYear - i),
    [currentYear],
  );
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const dayOptions = useMemo(() => {
    if (!birthYear || !birthMonth) return Array.from({ length: 31 }, (_, i) => i + 1);
    return Array.from({ length: daysInMonth(birthYear, birthMonth) }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay && birthDay > daysInMonth(birthYear, birthMonth)) {
      setBirthDay(daysInMonth(birthYear, birthMonth));
    }
  }, [birthYear, birthMonth, birthDay]);

  const persistDraft = useCallback(() => {
    saveIntroDraft(
      buildDraftFromState({
        selectedInterests,
        featureOther,
        nickname,
        skipNickname,
        birthYear,
        birthMonth,
        birthDay,
        gender,
      }),
    );
  }, [selectedInterests, featureOther, nickname, skipNickname, birthYear, birthMonth, birthDay, gender]);

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label],
    );
  };

  const handleStart = useCallback(() => {
    try {
      persistDraft();
    } catch {
      /* ignore draft save errors */
    }
    setPendingComplete(true);
  }, [persistDraft]);

  const goNext = useCallback(() => {
    if (page === 1 || page === 2 || page === 3) persistDraft();
    if (page < PAGE_COUNT - 1) {
      setPage(p => p + 1);
    }
  }, [page, persistDraft]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
      const dx = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 48) return;
      if (dx < 0 && page < PAGE_COUNT - 1) {
        if (page === 1 || page === 2 || page === 3) persistDraft();
        setPage(p => p + 1);
      }
      if (dx > 0 && page > 0) setPage(p => p - 1);
    },
    [page, persistDraft],
  );

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 14,
    padding: "16px 14px",
    border: "1px solid rgba(60,40,20,0.1)",
    marginBottom: 10,
  };

  const choiceButtonStyle = (selected: boolean): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 12,
    border: selected ? "2px solid #4a6741" : "1.5px solid rgba(60,40,20,0.12)",
    background: selected ? "#edf3ea" : "white",
    color: "#1a1410",
    fontSize: 14,
    lineHeight: 1.6,
    cursor: "pointer",
    marginBottom: 8,
  });

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 10,
    border: "1.5px solid rgba(60,40,20,0.12)",
    background: "white",
    fontSize: 14,
    color: "#1a1410",
  };

  const isLastPage = page === PAGE_COUNT - 1;

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
    >
      <div
        style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {page === 0 && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: "#1a1410", textAlign: "center", margin: "0 0 16px", lineHeight: 1.5 }}>
              {t("intro.page1Title")}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "#3d3228", margin: "0 0 20px", whiteSpace: "pre-line" }}>
              {t("intro.page1Description")}
            </p>
            <p style={{ fontSize: 15, fontWeight: "bold", color: "#4a6741", margin: "0 0 12px" }}>
              {t("intro.page1Subtext")}
            </p>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card1Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228", whiteSpace: "pre-line" }}>{t("intro.card1Body")}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card2Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228", whiteSpace: "pre-line" }}>{t("intro.card2Body")}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.card3Title")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.75, color: "#3d3228", whiteSpace: "pre-line" }}>{t("intro.card3Body")}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, color: "#6b5c4a", margin: "8px 0 0", textAlign: "center" }}>
              {t("intro.page1Closing")}
            </p>
          </div>
        )}

        {page === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: "bold", color: "#1a1410", margin: "0 0 8px", lineHeight: 1.5 }}>
              {t("intro.page2Title")}
            </h2>
            <p style={{ fontSize: 13, color: "#6b5c4a", margin: "0 0 16px", lineHeight: 1.6 }}>
              {t("intro.page2Subtext")}
            </p>
            {INTEREST_KEYS.map(key => {
              const label = t(`intro.${key}`);
              const selected = selectedInterests.includes(label);
              return (
                <button key={key} type="button" onClick={() => toggleInterest(label)} style={choiceButtonStyle(selected)}>
                  {label}
                </button>
              );
            })}
            <input
              type="text"
              value={featureOther}
              onChange={e => setFeatureOther(e.target.value)}
              placeholder={t("intro.otherPlaceholder")}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  goNext();
                }
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1.5px solid rgba(60,40,20,0.12)",
                background: "white",
                fontSize: 14,
                color: "#1a1410",
                marginTop: 4,
              }}
            />
          </div>
        )}

        {page === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: "bold", color: "#1a1410", margin: "0 0 8px", lineHeight: 1.5 }}>
              {t("intro.page3Title")}
            </h2>
            <p style={{ fontSize: 13, color: "#6b5c4a", margin: "0 0 20px", lineHeight: 1.6 }}>
              {t("intro.page3Subtext")}
            </p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.nicknameLabel")}</div>
              <input
                type="text"
                value={nickname}
                disabled={skipNickname}
                onChange={e => {
                  setSkipNickname(false);
                  setNickname(e.target.value);
                }}
                placeholder={t("intro.nicknamePlaceholder")}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(60,40,20,0.12)",
                  background: skipNickname ? "#f0ebe3" : "white",
                  fontSize: 14,
                  color: "#1a1410",
                  marginBottom: 8,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setSkipNickname(true);
                  setNickname("");
                }}
                style={choiceButtonStyle(skipNickname)}
              >
                {t("intro.skipNickname")}
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#1a1410", marginBottom: 8 }}>{t("intro.birthdateLabel")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={birthYear} onChange={e => setBirthYear(e.target.value ? Number(e.target.value) : "")} style={selectStyle}>
                  <option value="">{t("intro.year")}</option>
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
                <select value={birthMonth} onChange={e => setBirthMonth(e.target.value ? Number(e.target.value) : "")} style={selectStyle}>
                  <option value="">{t("intro.month")}</option>
                  {monthOptions.map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
                <select value={birthDay} onChange={e => setBirthDay(e.target.value ? Number(e.target.value) : "")} style={selectStyle}>
                  <option value="">{t("intro.day")}</option>
                  {dayOptions.map(d => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#1a1410", marginBottom: 4 }}>{t("intro.genderLabel")}</div>
              <p style={{ fontSize: 12, color: "#6b5c4a", margin: "0 0 10px", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {t("intro.genderHint")}
              </p>
              {[t("intro.genderMale"), t("intro.genderFemale"), t("intro.genderOther")].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  style={choiceButtonStyle(gender === option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {page === 3 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>🌿</div>
            <p style={{ fontSize: 18, fontWeight: "bold", lineHeight: 1.75, color: "#1a1410", margin: 0, maxWidth: 300 }}>
              {t("intro.page4Message")}
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

      {!isLastPage ? (
        <button
          type="button"
          onClick={goNext}
          style={{
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 15,
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {t("intro.next")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleStart()}
          onTouchEnd={e => e.stopPropagation()}
          style={{
            padding: "16px 24px",
            borderRadius: 12,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 17,
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {t("intro.start")}
        </button>
      )}
    </div>
  );
}
