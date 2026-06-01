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

  const draftState = useMemo(
    () => ({
      selectedInterests,
      featureOther,
      nickname,
      skipNickname,
      birthYear,
      birthMonth,
      birthDay,
      gender,
    }),
    [selectedInterests, featureOther, nickname, skipNickname, birthYear, birthMonth, birthDay, gender],
  );

  const persistDraft = useCallback(() => {
    saveIntroDraft(buildDraftFromState(draftState));
  }, [draftState]);

  const persistAndGoTo = useCallback(
    (nextPage: number, patch?: Partial<typeof draftState>) => {
      const merged = { ...draftState, ...patch };
      saveIntroDraft(buildDraftFromState(merged));
      setPage(nextPage);
    },
    [draftState],
  );

  const handleStart = useCallback(() => {
    try {
      persistDraft();
    } catch {
      /* ignore draft save errors */
    }
    setPendingComplete(true);
  }, [persistDraft]);

  const handleInterestSelect = useCallback(
    (label: string) => {
      const nextInterests = selectedInterests.includes(label)
        ? selectedInterests
        : [...selectedInterests, label];
      setSelectedInterests(nextInterests);
      saveIntroDraft(buildDraftFromState({ ...draftState, selectedInterests: nextInterests }));
      setPage(2);
    },
    [draftState, selectedInterests],
  );

  const handleFeatureOtherSubmit = useCallback(() => {
    persistAndGoTo(2);
  }, [persistAndGoTo]);

  const goToFinalPage = useCallback(() => {
    persistAndGoTo(3);
  }, [persistAndGoTo]);

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
        if (page === 2) persistDraft();
        setPage(p => p + 1);
      }
      if (dx > 0 && page > 0) setPage(p => p - 1);
    },
    [page, persistDraft],
  );

  const featureCardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: "20px 18px",
    border: "1px solid rgba(60,40,20,0.1)",
    height: "100%",
  };

  const interestButtonStyle: React.CSSProperties = {
    minWidth: 168,
    maxWidth: 240,
    padding: "16px 20px",
    borderRadius: 14,
    border: "1.5px solid rgba(60,40,20,0.12)",
    background: "white",
    color: "#1a1410",
    fontSize: 14,
    lineHeight: 1.6,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(60,40,20,0.06)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
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

  const primaryButtonStyle: React.CSSProperties = {
    padding: "14px 24px",
    borderRadius: 12,
    border: "none",
    background: "#1a1410",
    color: "#f5f0e8",
    fontSize: 15,
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
    maxWidth: 320,
  };

  const startButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    padding: "16px 28px",
    fontSize: 17,
    maxWidth: 360,
  };

  return (
    <div className="fixed inset-0 z-[22000] flex min-h-screen flex-col overflow-hidden bg-[#f5f0e8] px-5 py-6">
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto w-full max-w-2xl py-4">
          {page === 0 && (
            <div className="flex flex-col items-center">
              <h1 className="mb-6 text-center text-[22px] font-bold leading-snug text-[#1a1410]">
                {t("intro.page1Title")}
              </h1>
              <p className="mb-8 whitespace-pre-line text-center text-sm leading-relaxed text-[#3d3228]">
                {t("intro.page1Description")}
              </p>
              <p className="mb-8 text-center text-[15px] font-bold text-[#4a6741]">
                {t("intro.page1Subtext")}
              </p>

              <div className="mb-8 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
                <div style={featureCardStyle}>
                  <div className="mb-3 text-[15px] font-bold text-[#1a1410]">{t("intro.card1Title")}</div>
                  <div className="whitespace-pre-line text-[13px] leading-relaxed text-[#3d3228]">{t("intro.card1Body")}</div>
                </div>
                <div style={featureCardStyle}>
                  <div className="mb-3 text-[15px] font-bold text-[#1a1410]">{t("intro.card2Title")}</div>
                  <div className="whitespace-pre-line text-[13px] leading-relaxed text-[#3d3228]">{t("intro.card2Body")}</div>
                </div>
                <div style={featureCardStyle}>
                  <div className="mb-3 text-[15px] font-bold text-[#1a1410]">{t("intro.card3Title")}</div>
                  <div className="whitespace-pre-line text-[13px] leading-relaxed text-[#3d3228]">{t("intro.card3Body")}</div>
                </div>
              </div>

              <p className="mb-10 text-center text-[13px] leading-relaxed text-[#6b5c4a]">
                {t("intro.page1Closing")}
              </p>

              <button type="button" onClick={() => setPage(1)} style={primaryButtonStyle}>
                {t("intro.next")}
              </button>
            </div>
          )}

          {page === 1 && (
            <div className="flex flex-col items-center">
              <h2 className="mb-3 text-center text-xl font-bold leading-snug text-[#1a1410]">
                {t("intro.page2Title")}
              </h2>
              <p className="mb-10 text-center text-[13px] leading-relaxed text-[#6b5c4a]">
                {t("intro.page2Subtext")}
              </p>

              <div className="mb-10 flex flex-wrap justify-center gap-3">
                {INTEREST_KEYS.map(key => {
                  const label = t(`intro.${key}`);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleInterestSelect(label)}
                      style={interestButtonStyle}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="w-full max-w-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={featureOther}
                    onChange={e => setFeatureOther(e.target.value)}
                    placeholder={t("intro.otherPlaceholder")}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleFeatureOtherSubmit();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1.5px solid rgba(60,40,20,0.12)",
                      background: "white",
                      fontSize: 14,
                      color: "#1a1410",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleFeatureOtherSubmit}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "none",
                      background: "#1a1410",
                      color: "#f5f0e8",
                      fontSize: 13,
                      fontWeight: "bold",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {t("intro.next")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {page === 2 && (
            <div className="flex flex-col">
              <h2 className="mb-3 text-center text-xl font-bold leading-snug text-[#1a1410]">
                {t("intro.page3Title")}
              </h2>
              <p className="mb-8 text-center text-[13px] leading-relaxed text-[#6b5c4a]">
                {t("intro.page3Subtext")}
              </p>

              <div className="mb-6">
                <div className="mb-2 text-sm font-bold text-[#1a1410]">{t("intro.nicknameLabel")}</div>
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

              <div className="mb-6">
                <div className="mb-2 text-sm font-bold text-[#1a1410]">{t("intro.birthdateLabel")}</div>
                <div className="flex gap-2">
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

              <div className="mb-10">
                <div className="mb-1 text-sm font-bold text-[#1a1410]">{t("intro.genderLabel")}</div>
                <p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-[#6b5c4a]">
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

              <div className="flex justify-center">
                <button type="button" onClick={goToFinalPage} style={primaryButtonStyle}>
                  {t("intro.next")}
                </button>
              </div>
            </div>
          )}

          {page === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 text-[72px]">🌿</div>
              <p className="mb-12 max-w-xs text-lg font-bold leading-relaxed text-[#1a1410]">
                {t("intro.page4Message")}
              </p>
              <button
                type="button"
                onClick={() => handleStart()}
                onTouchEnd={e => e.stopPropagation()}
                style={startButtonStyle}
              >
                {t("intro.start")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-center gap-2 pb-2 pt-4">
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
    </div>
  );
}
