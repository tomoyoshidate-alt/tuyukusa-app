export type HomeSectionId =
  | "weather"
  | "sunTimes"
  | "dailyGoal"
  | "weeklyGoal"
  | "monthlyGoal"
  | "diagnosis"
  | "schedule"
  | "radio"
  | "binaural"
  | "pomodoro";

export type HomeDisplaySettings = {
  weatherChart: boolean;
  humidityChart: boolean;
  moonPhase: boolean;
  sunTimes: boolean;
  dailyGoal: boolean;
  weeklyGoal: boolean;
  monthlyGoal: boolean;
  diagnosis: boolean;
  schedule: boolean;
  radio: boolean;
  binaural: boolean;
  pomodoro: boolean;
  sectionOrder: HomeSectionId[];
};

export const DEFAULT_SECTION_ORDER: HomeSectionId[] = [
  "weather",
  "sunTimes",
  "dailyGoal",
  "weeklyGoal",
  "monthlyGoal",
  "diagnosis",
  "schedule",
  "radio",
  "binaural",
  "pomodoro",
];

export const DEFAULT_HOME_DISPLAY: HomeDisplaySettings = {
  weatherChart: true,
  humidityChart: true,
  moonPhase: true,
  sunTimes: true,
  dailyGoal: true,
  weeklyGoal: false,
  monthlyGoal: false,
  diagnosis: true,
  schedule: true,
  radio: true,
  binaural: true,
  pomodoro: true,
  sectionOrder: DEFAULT_SECTION_ORDER,
};

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  weather: "天気グラフ",
  sunTimes: "日の出・日の入り",
  dailyGoal: "今日の目標",
  weeklyGoal: "今週の目標",
  monthlyGoal: "今月の目標",
  diagnosis: "AI診断",
  schedule: "スケジュール",
  radio: "つゆくさラジオ",
  binaural: "バイノーラルビート",
  pomodoro: "ポモドーロタイマー",
};

export const HOME_WEATHER_TOGGLE_OPTIONS = [
  { key: "weatherChart" as const, label: "天気・気温グラフ" },
  { key: "humidityChart" as const, label: "湿度グラフ" },
  { key: "moonPhase" as const, label: "月の満ち欠け" },
];

export const HOME_SECTION_TOGGLE_OPTIONS: { key: HomeSectionId; label: string }[] = [
  { key: "sunTimes", label: "日の出・日の入り" },
  { key: "dailyGoal", label: "今日の目標" },
  { key: "weeklyGoal", label: "今週の目標" },
  { key: "monthlyGoal", label: "今月の目標" },
  { key: "diagnosis", label: "AI診断" },
  { key: "schedule", label: "スケジュール" },
  { key: "radio", label: "つゆくさラジオ" },
  { key: "binaural", label: "バイノーラルビート" },
  { key: "pomodoro", label: "ポモドーロタイマー" },
];

export function isSectionVisible(settings: HomeDisplaySettings, section: HomeSectionId): boolean {
  switch (section) {
    case "weather":
      return settings.weatherChart || settings.humidityChart || settings.moonPhase;
    case "sunTimes":
      return settings.sunTimes;
    case "dailyGoal":
      return settings.dailyGoal;
    case "weeklyGoal":
      return settings.weeklyGoal;
    case "monthlyGoal":
      return settings.monthlyGoal;
    case "diagnosis":
      return settings.diagnosis;
    case "schedule":
      return settings.schedule;
    case "radio":
      return settings.radio;
    case "binaural":
      return settings.binaural;
    case "pomodoro":
      return settings.pomodoro;
    default:
      return false;
  }
}

export function normalizeHomeDisplay(data: unknown): HomeDisplaySettings {
  if (!data || typeof data !== "object") return DEFAULT_HOME_DISPLAY;
  const d = data as Partial<HomeDisplaySettings>;
  const merged = { ...DEFAULT_HOME_DISPLAY, ...d };
  const validIds = new Set<HomeSectionId>(DEFAULT_SECTION_ORDER);
  const order = Array.isArray(d.sectionOrder)
    ? d.sectionOrder.filter((id): id is HomeSectionId => validIds.has(id as HomeSectionId))
    : [];
  const missing = DEFAULT_SECTION_ORDER.filter(id => !order.includes(id));
  merged.sectionOrder = [...order, ...missing];
  return merged;
}
