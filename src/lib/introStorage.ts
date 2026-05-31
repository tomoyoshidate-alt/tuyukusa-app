const INTRO_COMPLETED_KEY = "introCompleted";

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
  localStorage.setItem(INTRO_COMPLETED_KEY, "true");
}
