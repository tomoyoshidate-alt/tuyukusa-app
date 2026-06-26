import { getPresetById } from "@/src/lib/simpleBinauralPresets";

export const CHAT_DAY_START_FREE_LABEL = "自由に入力する";

export const CHAT_DAY_START_QUESTION =
  "まずは、今日これからどんな1日にしたいですか？ 気分に合わせて整えていきましょう。";

export const CHAT_DAY_START_CHOICES = [
  "しっかりゆっくり眠りたい",
  "集中して仕事をしたい",
  "やることが多いのでタイムマネジメントしたい",
  "食事のリズムを整えたい",
  "体調悪く養生相談をして回復したい",
] as const;

export type ChatDayStartChoice = (typeof CHAT_DAY_START_CHOICES)[number];

const PRESET_BY_CHOICE: Record<ChatDayStartChoice, string | "meal_time_split"> = {
  "しっかりゆっくり眠りたい": "sleep",
  "集中して仕事をしたい": "focus",
  "やることが多いのでタイムマネジメントしたい": "energy",
  "食事のリズムを整えたい": "meal_time_split",
  "体調悪く養生相談をして回復したい": "recover",
};

/** ④ 食事：4:00〜15:59 → appetite / 16:00〜3:59 → suppress */
export function resolveMealPresetId(now = new Date()): string {
  const hour = now.getHours();
  if (hour >= 4 && hour <= 15) return "appetite";
  return "suppress";
}

export function resolvePresetIdForChoice(choice: string): string | null {
  const key = choice as ChatDayStartChoice;
  const mapped = PRESET_BY_CHOICE[key];
  if (!mapped) return null;
  if (mapped === "meal_time_split") return resolveMealPresetId();
  return mapped;
}

export function isChatDayStartChoice(choice: string): boolean {
  return (CHAT_DAY_START_CHOICES as readonly string[]).includes(choice);
}

export function getChatDayStartChoiceLabels(): string[] {
  return [...CHAT_DAY_START_CHOICES, CHAT_DAY_START_FREE_LABEL];
}

export function buildDayStartAssistantMessage(choice: string, presetId: string): string {
  const presetName = getPresetById(presetId).name;
  const binauralNote =
    `\n\nバイノーラルは補助的に、脳波の状態へやさしく働きかける音です。お試しになる場合は「▶ ${presetName}を再生」からどうぞ。`;

  switch (choice) {
    case "しっかりゆっくり眠りたい":
      return (
        "昨夜は何時ごろ寝て、何時に起きましたか？寝つきはいかがでしたか？\n\n" +
        "今夜に向けて、無理のない睡眠リズムを一緒に整えていきましょう。" +
        binauralNote
      );
    case "集中して仕事をしたい":
      return (
        "今日取り組みたいメインのタスクは何ですか？集中したい時間帯はいつ頃ですか？\n\n" +
        "短い集中のブロックを組み立てながら、整えていきましょう。" +
        binauralNote
      );
    case "やることが多いのでタイムマネジメントしたい":
      return (
        "今日やることを洗い出してみましょう。締切と、優先度の高い順を一緒に整理していきます。\n\n" +
        "動きやすいリズムづくりの補助として、バイノーラルもお使いいただけます。" +
        binauralNote
      );
    case "食事のリズムを整えたい":
      return (
        "整える土台は、食事時刻の規則性です。音はその補助になります。\n\n" +
        "前回の食事は何時ごろでしたか？今、空腹感はありますか？夜遅い食事をとることが多いですか？" +
        binauralNote
      );
    case "体調悪く養生相談をして回復したい":
      return (
        "無理せず休む前提で、一緒に整えていきましょう。\n\n" +
        "いつごろから、どのような症状がありますか？（例：疲れが取れない、胃のむかつき、頭が重い など）" +
        binauralNote
      );
    default:
      return `「${choice}」ですね。詳しく教えてください。${binauralNote}`;
  }
}
