#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const REPLACEMENTS = [
  ["📍 ", ""],
  ["💬 ", ""],
  ["📅 ", ""],
  ["🔗 ", ""],
  ["🔄 ", ""],
  ["☁️ ", ""],
  ["❤️ ", ""],
  ["📓 ", ""],
  ["🎵 ", ""],
  ["🍅 ", ""],
  ["🖥 ", ""],
  ["🖥️ ", ""],
  ["⚙️ ", ""],
  ["🌿 ", ""],
  ["💡 ", ""],
  ["✓ ", ""],
  ["📊 ", ""],
  ["🌡️ ", ""],
  ["💧 ", ""],
  ["🌙 ", ""],
  ["🌅 ", ""],
  ["⚖️ ", ""],
  ["☀️ ", ""],
  ["🛏 ", ""],
  ["① ", ""],
  ["② ", ""],
  ["③ ", ""],
  ["④ ", ""],
  ["🌿", ""],
  ["完了しました🌿", "完了しました"],
  ["設定が完了しました🌿", "設定が完了しました"],
  ["です🌿", "です"],
  ["ですね。素晴らしい目標です🌿", "ですね。素晴らしい目標です"],
  ["内容です🌿", "内容です"],
  ["さん🌿", "さん"],
  ["お疲れさまでした 🌿", "お疲れさまでした"],
  ["Great job! 🌿", "Great job!"],
  ["Bravo ! 🌿", "Bravo !"],
  ["Bom trabalho! 🌿", "Bom trabalho!"],
  ["辛苦了 🌿", "辛苦了"],
  ["¡Buen trabajo! 🌿", "¡Buen trabajo!"],
  ["Ottimo lavoro! 🌿", "Ottimo lavoro!"],
  ["Tap + to add 🌿", "Tap + to add"],
  ["＋から追加できます 🌿", "＋から追加できます"],
  ['icon: "🏠"', 'icon: ""'],
  ['icon: "💬"', 'icon: ""'],
  ['icon: "🎵"', 'icon: ""'],
  ['icon: "📊"', 'icon: ""'],
  ['icon: "🖥"', 'icon: ""'],
  ['icon: "⚙️"', 'icon: ""'],
  ['icon: "🩺"', 'icon: ""'],
  ['icon: "🌸"', 'icon: ""'],
  ['icon: "🤧"', 'icon: ""'],
  ['icon: "🍶"', 'icon: ""'],
  ['icon: "💊"', 'icon: ""'],
  ['icon: "📱"', 'icon: ""'],
  ['icon: "⚖️"', 'icon: ""'],
  ['{ icon: "🌙",', '{ icon: "",'],
  ['{ icon: "📅",', '{ icon: "",'],
  ['{ icon: "🖥",', '{ icon: "",'],
  ['{ icon: "🏠",', '{ icon: "",'],
  ['{ icon: "💬",', '{ icon: "",'],
  ['{ icon: "❤️",', '{ icon: "",'],
  ['"💬 自由に相談する"', '"自由に相談する"'],
  ['"💬 自分で入力する"', '"自分で入力する"'],
  ['"🛏 22時には眠りたい"', '"22時には眠りたい"'],
  ['"🌅 早起きしたい"', '"早起きしたい"'],
  ['"⚖️ 食事の時間を整えたい"', '"食事の時間を整えたい"'],
  ['"💬 自由に入力する"', '"自由に入力する"'],
  ['ONBOARDING_GOAL_FREE_LABEL = "④ 自由に入力する"', 'ONBOARDING_GOAL_FREE_LABEL = "自由に入力する"'],
  ['"① 睡眠の質を上げたい"', '"睡眠の質を上げたい"'],
  ['"② 集中力を高めたい"', '"集中力を高めたい"'],
  ['"③ 心身を整えたい"', '"心身を整えたい"'],
  ['supabase: "☁️"', 'supabase: ""'],
  ['notion: "📓"', 'notion: ""'],
  ['googleCalendar: "📅"', 'googleCalendar: ""'],
  ['healthkit: "❤️"', 'healthkit: ""'],
  ['sound: "🎵"', 'sound: ""'],
  ['emoji: "🌿"', 'emoji: ""'],
  ['emoji: "🌙"', 'emoji: ""'],
  ['↕️ ', ""],
  ['⚠️ ', ""],
  ['🖼️', ""],
  ['⚙ ', ""],
  ['▶️ ', ""],
  ["◀️ ", ""],
  ["🔀 ", ""],
  ["⏱️ ", ""],
  ['\n\n🌡️ 今日は', '\n\n今日は'],
  ['{enabled && "✓"}', '{enabled && "·"}'],
  ['{fontSizeId === id && <span', '{false && fontSizeId === id && <span'],
  ['{current === locale && <span', '{false && current === locale && <span'],
  ['{inList ? "" : "+ "}', '{inList ? "" : "+ "}'],
  ["📖 ", ""],
  ["📋 ", ""],
  ["✨ ", ""],
  ["🎯 ", ""],
  ['title={`🎯 ', 'title={`'],
  ['title="🗓 ', 'title="'],
  ["🗓 ", ""],
  ["👤 ", ""],
  ["🎨 ", ""],
  ["🔮", ""],
  ["🧒", ""],
  ["👴", ""],
  ["📐", ""],
  ["🌈", ""],
  ["🏮", ""],
  ["🔤 ", ""],
  ["🌐 ", ""],
  ["💾 ", ""],
  ["📻 ", ""],
  ["🎧 ", ""],
  ["🎤 ", ""],
  ["📲 ", ""],
  ["👉 ", ""],
  ["❓ ", ""],
  ["🎛 ", ""],
  ["🕐 ", ""],
  ["⏳ ", ""],
  ["🌇 ", ""],
  ["🍚 ", ""],
  ["🛁 ", ""],
  ["🩺 ", ""],
  ["🌸 ", ""],
  ["🤧 ", ""],
  ["🍶 ", ""],
  ["💊 ", ""],
  ['icon: "📻"', 'icon: ""'],
  ['icon: "🎧"', 'icon: ""'],
  ['icon: "📆"', 'icon: ""'],
  ['icon: "🔒"', 'icon: ""'],
  ['{ icon: "🍚",', '{ icon: "",'],
  ['{ icon: "🛁",', '{ icon: "",'],
  ['{ icon: "📲",', '{ icon: "",'],
  ["⏹ 停止", "停止"],
  ["▶ 再生", "再生"],
  ["⏸ 停止", "停止"],
  ["⏸ 一時停止", "一時停止"],
  ["▶ ポモドーロ開始", "ポモドーロ開始"],
  ["▶ プレイリスト再生", "プレイリスト再生"],
  ['{snapshot.isPlaying ? "⏹ 停止" : "▶ 再生"}', '{snapshot.isPlaying ? "停止" : "再生"}'],
  ['{isPlaying ? "⏹ 停止" : "▶ 再生"}', '{isPlaying ? "停止" : "再生"}'],
  ['{playing ? "⏸" : "▶"}', '{playing ? "停止" : "再生"}'],
  ['{isPlayingThisSource ? "⏸ 停止" : `▶ ${activeTitle} を再生`}', '{isPlayingThisSource ? "停止" : `${activeTitle} を再生`}'],
  ['{listening ? "⏹" : "🎤"}', '{listening ? "停止" : "音声"}'],
  ['{syncing ? t("common.syncing") : "🔄"}', '{syncing ? t("common.syncing") : t("common.sync")}'],
  ['{false && current === locale && <span style={{ color: "var(--t-primary)" }}>✓</span>}', '{current === locale ? <span style={{ color: "var(--t-primary)", fontSize: 11 }}>選択中</span> : null}'],
  ['{false && fontSizeId === id && <span style={{ color: "var(--t-primary)", fontSize: "var(--t-font-size-sm)" }}>✓</span>}', '{fontSizeId === id ? <span style={{ color: "var(--t-primary)", fontSize: "var(--t-font-size-sm)" }}>選択中</span> : null}'],
  ['⏱ ', ""],
  ['{showSql ? "▼" : "▶"}', '{showSql ? "▼" : "▶"}'],
  ['<Bullet>🌀 ', '<Bullet>'],
  ['<Bullet>😌 ', '<Bullet>'],
  ['<Bullet>🧘 ', '<Bullet>'],
  ["🎧 バイノーラルタイマー終了", "バイノーラルタイマー終了"],
  ["🎧 タイマー終了", "タイマー終了"],
];

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  return out;
}

function clearBeatEmojis(content) {
  const start = content.indexOf("export const BINURAL_BEAT_PRESETS");
  const end = content.indexOf("export const AMBIENT_SOUND_PRESETS");
  if (start < 0 || end < 0) return content;
  const head = content.slice(0, start);
  const beats = content.slice(start, end).replace(/emoji: "[^"]*"/g, 'emoji: ""');
  const tail = content.slice(end);
  return head + beats + tail;
}

function clearNonSoundEmojisInTypes(content) {
  const demoStart = content.indexOf("export const DEMO_SOURCE_OPTIONS");
  const visStart = content.indexOf("export const VISUALIZER_EFFECTS");
  if (demoStart < 0 || visStart < 0) return content;
  const head = content.slice(0, visStart);
  const tail = content.slice(visStart).replace(/emoji: "[^"]*"/g, 'emoji: ""');
  return head + tail;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "node_modules" || name === ".git" || name === ".next") continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p);
  }
  return files;
}

function clearThemeEmojis(content) {
  return content.replace(/emoji: "[^"]*"/g, 'emoji: ""');
}

function processFile(file) {
  const rel = path.relative(ROOT, file);
  if (rel.includes("strip-ui-emojis")) return;
  let content = fs.readFileSync(file, "utf8");
  if (rel === "src/lib/binauralBeats.ts") content = clearBeatEmojis(content);
  else if (rel === "src/lib/soundSystem/types.ts") content = clearNonSoundEmojisInTypes(content);
  else if (rel === "src/lib/theme/presets.ts") content = clearThemeEmojis(content);
  else if (rel === "src/lib/chatKnowledge.ts") {
    content = applyReplacements(content);
    content = content.replace(
      '/^(🛏|🌅|⚖️|💬)/.test(trimmed)',
      '/^(自分で入力|自由に)/.test(trimmed)'
    );
  } else if (rel === "src/lib/onboarding.ts") {
    content = applyReplacements(content);
    content = content.replace('choice === "自由に入力する" || choice.includes("自由に入力")) return null;\n  const numbered = choice.match(/^[①②③④]\\s*(.+)$/);\n  if (numbered) return numbered[1].trim() || null;\n', 'choice.includes("自由に入力")) return null;\n');
  } else content = applyReplacements(content);
  fs.writeFileSync(file, content);
}

for (const file of walk(path.join(ROOT, "src"))) processFile(file);
for (const loc of fs.readdirSync(path.join(ROOT, "src/lib/i18n/locales"))) {
  if (loc.endsWith(".ts")) processFile(path.join(ROOT, "src/lib/i18n/locales", loc));
}
console.log("done");
