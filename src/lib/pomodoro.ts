export type PomodoroPhase = "work" | "shortBreak" | "longBreak";

export type PomodoroSettings = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

export const POMODORO_WORK_BEAT_ID = "focus-beta" as const;
export const POMODORO_BREAK_BEAT_ID = "calm-alpha" as const;

/**
 * 生活スタイル別の脳波切替。作業フェーズと休憩フェーズで、目的に合った脳波を自動で切り替える。
 * beatId は binauralBeats の BINURAL_BEAT_PRESETS の id と対応。
 */
export type PomodoroPurpose = {
  id: string;
  label: string;
  workBeatId: string;
  breakBeatId: string;
  /** 目安の作業/休憩分数（未指定なら DEFAULT を使用） */
  workMinutes?: number;
  shortBreakMinutes?: number;
};

export const POMODORO_PURPOSES: PomodoroPurpose[] = [
  { id: "focus", label: "集中", workBeatId: "focus-beta", breakBeatId: "calm-alpha" },
  { id: "study", label: "勉強", workBeatId: "study-beta", breakBeatId: "relax-alpha", workMinutes: 25, shortBreakMinutes: 5 },
  { id: "desk", label: "デスクワーク", workBeatId: "desk-beta", breakBeatId: "calm-alpha", workMinutes: 30, shortBreakMinutes: 5 },
  { id: "labor", label: "肉体労働", workBeatId: "labor-beta", breakBeatId: "relax-alpha", workMinutes: 45, shortBreakMinutes: 10 },
  { id: "energy", label: "やる気を出す", workBeatId: "energy-beta", breakBeatId: "calm-alpha" },
  { id: "calm", label: "落ち着いて作業", workBeatId: "relax-alpha", breakBeatId: "meditation-theta" },
];

export const DEFAULT_POMODORO_PURPOSE_ID = "focus";

export function getPomodoroPurpose(id: string): PomodoroPurpose {
  return POMODORO_PURPOSES.find(p => p.id === id) ?? POMODORO_PURPOSES[0];
}

/** 目的とフェーズから、鳴らすべき脳波プリセット id を返す。 */
export function beatIdForPhase(purposeId: string, phase: PomodoroPhase): string {
  const purpose = getPomodoroPurpose(purposeId);
  return phase === "work" ? purpose.workBeatId : purpose.breakBeatId;
}

export function phaseLabel(phase: PomodoroPhase): string {
  if (phase === "work") return "作業";
  if (phase === "shortBreak") return "休憩";
  return "長い休憩";
}

export function phaseDurationSec(settings: PomodoroSettings, phase: PomodoroPhase): number {
  if (phase === "work") return settings.workMinutes * 60;
  if (phase === "shortBreak") return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}
