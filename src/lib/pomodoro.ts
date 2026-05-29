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
export const POMODORO_BREAK_BEAT_ID = "stress-alpha" as const;

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
