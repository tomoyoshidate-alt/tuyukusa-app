export type HomeSectionId =
  | "weather"
  | "sunTimes"
  | "notionTodayTasks"
  | "dailyGoal"
  | "deadlineGoal"
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
  notionTodayTasks: boolean;
  dailyGoal: boolean;
  deadlineGoal: boolean;
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
  "notionTodayTasks",
  "dailyGoal",
  "deadlineGoal",
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
  notionTodayTasks: true,
  dailyGoal: true,
  deadlineGoal: true,
  monthlyGoal: false,
  diagnosis: true,
  schedule: true,
  radio: true,
  binaural: true,
  pomodoro: true,
  sectionOrder: DEFAULT_SECTION_ORDER,
};

export const HOME_SECTION_I18N_KEYS: Record<HomeSectionId, string> = {
  weather: "homeSections.weatherChart",
  sunTimes: "homeSections.sunTimes",
  notionTodayTasks: "homeSections.notionTodayTasks",
  dailyGoal: "homeSections.dailyGoal",
  deadlineGoal: "homeSections.deadlineGoal",
  monthlyGoal: "homeSections.monthlyGoal",
  diagnosis: "homeSections.diagnosis",
  schedule: "homeSections.schedule",
  radio: "homeSections.radio",
  binaural: "homeSections.binaural",
  pomodoro: "homeSections.pomodoro",
};

export const HOME_WEATHER_I18N_KEYS = {
  weatherChart: "homeSections.weatherChart",
  humidityChart: "homeSections.humidityChart",
  moonPhase: "homeSections.moonPhase",
} as const;

export const HOME_SECTION_TOGGLE_I18N_KEYS: { key: Exclude<HomeSectionId, "weather">; labelKey: string }[] = [
  { key: "sunTimes", labelKey: "homeSections.sunTimes" },
  { key: "notionTodayTasks", labelKey: "homeSections.notionTodayTasks" },
  { key: "dailyGoal", labelKey: "homeSections.dailyGoal" },
  { key: "deadlineGoal", labelKey: "homeSections.deadlineGoal" },
  { key: "monthlyGoal", labelKey: "homeSections.monthlyGoal" },
  { key: "diagnosis", labelKey: "homeSections.diagnosis" },
  { key: "schedule", labelKey: "homeSections.schedule" },
  { key: "radio", labelKey: "homeSections.radio" },
  { key: "binaural", labelKey: "homeSections.binaural" },
  { key: "pomodoro", labelKey: "homeSections.pomodoro" },
];

export const HOME_WEATHER_TOGGLE_I18N_OPTIONS = [
  { key: "weatherChart" as const, labelKey: "homeSections.weatherChart" },
  { key: "humidityChart" as const, labelKey: "homeSections.humidityChart" },
  { key: "moonPhase" as const, labelKey: "homeSections.moonPhase" },
];

/** @deprecated use HOME_SECTION_I18N_KEYS with i18n */
export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  weather: "天気グラフ",
  sunTimes: "日の出・日の入り",
  notionTodayTasks: "今日のタスク（Notion）",
  dailyGoal: "今日の目標",
  deadlineGoal: "期限付き目標",
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

export const HOME_SECTION_TOGGLE_OPTIONS: { key: Exclude<HomeSectionId, "weather">; label: string }[] = [
  { key: "sunTimes", label: "日の出・日の入り" },
  { key: "notionTodayTasks", label: "今日のタスク（Notion）" },
  { key: "dailyGoal", label: "今日の目標" },
  { key: "deadlineGoal", label: "期限付き目標" },
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
    case "notionTodayTasks":
      return settings.notionTodayTasks;
    case "dailyGoal":
      return settings.dailyGoal;
    case "deadlineGoal":
      return settings.deadlineGoal;
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

type LegacyHomeDisplay = Partial<HomeDisplaySettings> & { weeklyGoal?: boolean };

export function normalizeHomeDisplay(data: unknown): HomeDisplaySettings {
  if (!data || typeof data !== "object") return DEFAULT_HOME_DISPLAY;
  const d = data as LegacyHomeDisplay;
  const deadlineGoal =
    d.deadlineGoal ?? (typeof d.weeklyGoal === "boolean" ? d.weeklyGoal : DEFAULT_HOME_DISPLAY.deadlineGoal);
  const merged: HomeDisplaySettings = { ...DEFAULT_HOME_DISPLAY, ...d, deadlineGoal };
  const validIds = new Set<HomeSectionId>(DEFAULT_SECTION_ORDER);
  const rawOrder = Array.isArray(d.sectionOrder) ? d.sectionOrder : [];
  const order = rawOrder
    .map(id => (String(id) === "weeklyGoal" ? "deadlineGoal" : id))
    .filter((id): id is HomeSectionId => validIds.has(id as HomeSectionId));
  const missing = DEFAULT_SECTION_ORDER.filter(id => !order.includes(id));
  merged.notionTodayTasks = merged.notionTodayTasks ?? true;
  merged.sectionOrder = [...order, ...missing];
  return merged;
}
