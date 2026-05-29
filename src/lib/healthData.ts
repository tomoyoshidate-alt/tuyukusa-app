export type HealthData = {
  sleepHours?: number;
  sleepMinutes?: number;
  steps?: number;
  heartRate?: number;
  updatedAt: string;
  source: "shortcuts" | "manual";
};

export const INITIAL_HEALTH_DATA: HealthData = {
  updatedAt: "",
  source: "manual",
};

export function normalizeHealthData(data: unknown): HealthData {
  if (!data || typeof data !== "object") return INITIAL_HEALTH_DATA;
  const d = data as Partial<HealthData>;
  return {
    sleepHours: typeof d.sleepHours === "number" ? d.sleepHours : undefined,
    sleepMinutes: typeof d.sleepMinutes === "number" ? d.sleepMinutes : undefined,
    steps: typeof d.steps === "number" ? d.steps : undefined,
    heartRate: typeof d.heartRate === "number" ? d.heartRate : undefined,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : "",
    source: d.source === "shortcuts" ? "shortcuts" : "manual",
  };
}

export function mergeHealthImport(prev: HealthData, patch: Partial<HealthData>): HealthData {
  return normalizeHealthData({
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
    source: "shortcuts",
  });
}

export function parseHealthFromSearchParams(params: URLSearchParams): Partial<HealthData> | null {
  if (params.get("healthImport") !== "1") return null;
  const patch: Partial<HealthData> = {};
  const sleepHours = params.get("sleepHours");
  const sleepMinutes = params.get("sleepMinutes");
  const steps = params.get("steps");
  const heartRate = params.get("heartRate");
  if (sleepHours) patch.sleepHours = Number(sleepHours);
  if (sleepMinutes) patch.sleepMinutes = Number(sleepMinutes);
  if (steps) patch.steps = Number(steps);
  if (heartRate) patch.heartRate = Number(heartRate);
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

export function buildHealthContext(data: HealthData): string {
  if (!data.updatedAt) return "";
  const parts: string[] = ["【iOSヘルスケア連携データ】"];
  if (data.sleepHours != null) parts.push(`睡眠時間: ${data.sleepHours}時間`);
  if (data.sleepMinutes != null) parts.push(`睡眠時間（分）: ${data.sleepMinutes}分`);
  if (data.steps != null) parts.push(`歩数: ${data.steps.toLocaleString()}歩`);
  if (data.heartRate != null) parts.push(`心拍数: ${data.heartRate}bpm`);
  parts.push(`最終更新: ${new Date(data.updatedAt).toLocaleString("ja-JP")}`);
  return parts.join("\n");
}

export function formatHealthSummary(data: HealthData): string {
  if (!data.updatedAt) return "未連携";
  const items: string[] = [];
  if (data.sleepHours != null) items.push(`睡眠 ${data.sleepHours}h`);
  if (data.steps != null) items.push(`歩数 ${data.steps.toLocaleString()}`);
  if (data.heartRate != null) items.push(`心拍 ${data.heartRate}`);
  return items.length ? items.join(" · ") : "データ受信済み";
}

/** iOSショートカット起動用（ショートカット名はユーザーが作成） */
export const HEALTH_SHORTCUT_URL = "shortcuts://run-shortcut?name=つゆくさ%20ヘルス送信";

/** ショートカットから開くインポートURLのテンプレート（例） */
export function buildHealthImportUrl(baseUrl: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/?healthImport=1&sleepHours=[睡眠時間]&steps=[歩数]&heartRate=[心拍数]`;
}
