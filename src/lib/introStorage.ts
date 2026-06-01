const INTRO_COMPLETED_KEY = "introCompleted";
export const INTRO_DRAFT_KEY = "tuyukusa-intro-draft";

export type IntroDraft = {
  featureInterests: string[];
  featureOther?: string;
  nickname?: string;
  skipNickname?: boolean;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  birthDate?: string;
  gender?: string;
};

export function isIntroCompleted(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(INTRO_COMPLETED_KEY) === "true") return true;
  try {
    const raw = localStorage.getItem("tuyukusa-user-profile");
    if (raw) {
      const profile = JSON.parse(raw) as { onboardingComplete?: boolean };
      if (profile.onboardingComplete === true) {
        markIntroCompleted();
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function markIntroCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTRO_COMPLETED_KEY, "true");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearIntroCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INTRO_COMPLETED_KEY);
}

function normalizeIntroDraft(data: unknown): IntroDraft | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<IntroDraft>;
  return {
    featureInterests: Array.isArray(d.featureInterests)
      ? d.featureInterests.filter((x): x is string => typeof x === "string")
      : [],
    featureOther: typeof d.featureOther === "string" ? d.featureOther : undefined,
    nickname: typeof d.nickname === "string" ? d.nickname : undefined,
    skipNickname: d.skipNickname === true,
    birthYear: typeof d.birthYear === "number" ? d.birthYear : undefined,
    birthMonth: typeof d.birthMonth === "number" ? d.birthMonth : undefined,
    birthDay: typeof d.birthDay === "number" ? d.birthDay : undefined,
    birthDate: typeof d.birthDate === "string" ? d.birthDate : undefined,
    gender: typeof d.gender === "string" ? d.gender : undefined,
  };
}

export function loadIntroDraft(): IntroDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INTRO_DRAFT_KEY);
    return raw ? normalizeIntroDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveIntroDraft(draft: IntroDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTRO_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearIntroDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INTRO_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function formatIntroBirthDate(year: number, month: number, day: number): string {
  return `${year}年${month}月${day}日`;
}

export function introDraftToFlowData(draft: IntroDraft | null): {
  birthDate?: string;
  gender?: string;
  name?: string;
  nickname?: string;
} {
  if (!draft) return {};
  const out: { birthDate?: string; gender?: string; name?: string; nickname?: string } = {};
  if (draft.birthDate?.trim()) out.birthDate = draft.birthDate.trim();
  else if (draft.birthYear && draft.birthMonth && draft.birthDay) {
    out.birthDate = formatIntroBirthDate(draft.birthYear, draft.birthMonth, draft.birthDay);
  }
  if (draft.gender?.trim()) out.gender = draft.gender.trim();
  if (!draft.skipNickname && draft.nickname?.trim()) {
    out.nickname = draft.nickname.trim();
    out.name = draft.nickname.trim();
  }
  return out;
}
