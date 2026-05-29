export type TimeOfDay =
  | "earlyMorning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "lateNight";

const GREETINGS: Record<TimeOfDay, string[]> = {
  earlyMorning: [
    "早起きですね",
    "夜明けの気が満ちています",
    "静かな朝の時間、お疲れさまです",
    "早朝の空気、澄んでいますね",
    "一日のはじまりが近づいています",
  ],
  morning: [
    "おはようございます",
    "今朝の空気はいかがですか",
    "良い朝をお過ごしください",
    "今日もゆっくり整えていきましょう",
    "朝の光がやさしく差しています",
  ],
  midday: [
    "こんにちは",
    "今日の陽気はどうですか",
    "午前中、お疲れさまでした",
    "昼の時間、少し息を整えましょう",
    "今日も自分のペースで",
  ],
  afternoon: [
    "午後もお元気ですか",
    "少し休憩しましょう",
    "ここまでよく頑張りました",
    "午後の時間、体を労わりましょう",
    "今日の調子はいかがですか",
  ],
  evening: [
    "お疲れさまです",
    "今日もよく頑張りました",
    "夕暮れの時間、ゆっくりどうぞ",
    "一日の終わりに、深呼吸を",
    "今日の自分をねぎらいましょう",
  ],
  night: [
    "ゆっくり過ごせていますか",
    "夜の養生を大切に",
    "今日もお疲れさまでした",
    "心と体を休める時間です",
    "穏やかな夜をお過ごしください",
  ],
  lateNight: [
    "夜更かしですね",
    "そろそろ休みましょう",
    "深夜の静けさ、体を休めて",
    "明日のために、少し早めの就寝を",
    "おやすみの準備をしましょう",
  ],
};

export function getTimeOfDay(hour = new Date().getHours()): TimeOfDay {
  if (hour >= 4 && hour < 6) return "earlyMorning";
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 23) return "night";
  return "lateNight";
}

/** Same greeting within the same calendar hour (avoids flicker on re-render). */
export function pickTimeGreeting(date = new Date()): string {
  const band = getTimeOfDay(date.getHours());
  const options = GREETINGS[band];
  const seed = date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate() * 24 + date.getHours();
  return options[seed % options.length];
}
