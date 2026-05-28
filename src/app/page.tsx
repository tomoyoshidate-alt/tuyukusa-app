'use client'

import { useState, useEffect, useRef } from "react";

type Message = {
  type: string;
  text: string;
  choices?: string[];
  step?: string;
  showSchedule?: boolean;
  multi?: boolean;
};

type Tab = "home" | "chat" | "history" | "settings";
type MoodKey = "anger" | "anxiety" | "sadness" | "fog" | "manic";
type CountOption = number | "5回以上";

type HealthForm = {
  sleepBed: string;
  sleepWake: string;
  awakenings: CountOption;
  nightToilet: CountOption;
  morningCondition: number;
  bowel: string;
  mood: Record<MoodKey, number>;
  symptoms: string[];
  otherSymptom: string;
  diary: string;
};

const MOCK_SCHEDULE = {
  diagnosis: "水滞",
  wakeTime: "06:00",
  sleepTime: "22:30",
  bathTime: "20:45",
  mealTime1: "09:00",
  mealTime2: "16:00",
  saltMorning: "朝：自然塩3gをお湯に溶かして",
  saltEvening: "就寝前：自然塩3gを白湯で",
  advice: "朝のむくみと頭痛は水滞のサインです。今日は18時以降の糖質を控え、就寝前に塩湯をしっかり飲みましょう。",
  alerts: [
    { time: "06:00", message: "起床の時間です。朝の塩湯3gをどうぞ", type: "wake" },
    { time: "09:00", message: "朝食の時間です。糖質・お米中心で", type: "meal" },
    { time: "16:00", message: "夕食の時間です。塩・タンパク質・海産物中心で", type: "meal" },
    { time: "20:45", message: "入浴の時間です。38〜39度・30分以内で", type: "bath" },
    { time: "22:00", message: "就寝前の塩湯3gを飲んで22:30までに就寝を", type: "sleep" },
  ]
};

const BOWEL_OPTIONS = ["固い", "普通", "柔らかい", "水様", "兎糞"];
const SYMPTOM_OPTIONS = ["頭痛", "疲労", "むくみ", "鼻水", "咳", "その他"];
const MOOD_ITEMS: { key: MoodKey; label: string }[] = [
  { key: "anger", label: "怒り" },
  { key: "anxiety", label: "不安" },
  { key: "sadness", label: "悲しみ" },
  { key: "fog", label: "頭のモヤモヤ" },
  { key: "manic", label: "躁状態" },
];
const COUNT_OPTIONS: CountOption[] = [0, 1, 2, 3, 4, 5, "5回以上"];

const INITIAL_HEALTH: HealthForm = {
  sleepBed: "22:30",
  sleepWake: "06:00",
  awakenings: 0,
  nightToilet: 0,
  morningCondition: 5,
  bowel: "",
  mood: { anger: 1, anxiety: 1, sadness: 1, fog: 1, manic: 1 },
  symptoms: [],
  otherSymptom: "",
  diary: "",
};

const cardStyle = {
  background: "white",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 8,
  border: "1px solid rgba(60,40,20,0.1)",
};
const fieldLabelStyle = {
  fontSize: 12,
  fontWeight: "bold",
  color: "#4a6741",
  marginBottom: 10,
};

type ApiMessage = { role: "user" | "assistant"; content: string };

function toApiMessages(msgs: Message[]): ApiMessage[] {
  return msgs.map(m => ({
    role: m.type === "user" ? "user" : "assistant",
    content: m.text,
  }));
}

async function fetchChatReply(messages: Message[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: toApiMessages(messages) }),
  });
  if (!res.ok) {
    throw new Error("Chat API request failed");
  }
  const data = (await res.json()) as { content: string };
  return data.content;
}

function CountSelector({
  value,
  onChange,
  label,
}: {
  value: CountOption;
  onChange: (v: CountOption) => void;
  label: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COUNT_OPTIONS.map(opt => {
          const selected = value === opt;
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                minWidth: 40,
                padding: "8px 10px",
                borderRadius: 20,
                border: selected ? "1.5px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
                background: selected ? "#fdf0e4" : "#ede5d4",
                color: selected ? "#c17f4a" : "#3d3228",
                fontSize: 12,
                fontWeight: selected ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              {opt === "5回以上" ? opt : `${opt}回`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoodSlider({
  moodKey,
  label,
  value,
  onChange,
}: {
  moodKey: MoodKey;
  label: string;
  value: number;
  onChange: (key: MoodKey, value: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#3d3228" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: "bold", color: "#c17f4a" }}>{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(moodKey, Number(e.target.value))}
        style={{ width: "100%", accentColor: "#c17f4a" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 2 }}>
        <span>弱い</span>
        <span>強い</span>
      </div>
    </div>
  );
}

export default function TuyukusaApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [healthForm, setHealthForm] = useState<HealthForm>(INITIAL_HEALTH);
  const [saveMessage, setSaveMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "chat" && chatMessages.length === 0) {
      setTimeout(() => {
        setChatMessages([{
          type: "ai",
          text: "おはようございます🌿\nつゆくさ生活リズムAIです。\n\n今朝の目覚めはいかがですか？",
          choices: ["😴 だるく目が覚めた", "😐 普通に起きられた", "😊 スッキリ目覚めた"]
        }]);
      }, 300);
    }
  }, [tab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChoice = async (choice: string) => {
    const updatedMessages: Message[] = [...chatMessages, { type: "user", text: choice }];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    try {
      const reply = await fetchChatReply(updatedMessages);
      setChatMessages(prev => [...prev, { type: "ai", text: reply }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { type: "ai", text: "申し訳ございません。接続に問題が発生しました。しばらくしてからもう一度お試しください。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    const updatedMessages: Message[] = [...chatMessages, { type: "user", text }];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    try {
      const reply = await fetchChatReply(updatedMessages);
      setChatMessages(prev => [...prev, { type: "ai", text: reply }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { type: "ai", text: "申し訳ございません。接続に問題が発生しました。しばらくしてからもう一度お試しください。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setHealthForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const handleHealthSave = () => {
    setSaveMessage("体調チェックを保存しました");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f0e8", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      
      {/* ヘッダー */}
      <div style={{ background: "#1a1410", color: "#f5f0e8", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: "bold" }}>🌿 つゆくさ</div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>2025年5月29日</div>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        
        {/* ホーム */}
        {tab === "home" && (
          <div>
            <div style={{ background: "linear-gradient(160deg, #1a1410, #2d2218)", color: "#f5f0e8", padding: "28px 20px" }}>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>おはようございます</div>
              <div style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>田中 様</div>
              <div style={{ display: "inline-block", background: "rgba(193,127,74,0.2)", border: "1px solid rgba(193,127,74,0.3)", borderRadius: 20, padding: "6px 14px", fontSize: 13, color: "#e8a86a", marginBottom: 16 }}>
                今日の診断：{MOCK_SCHEDULE.diagnosis}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, opacity: 0.8, borderLeft: "2px solid #c17f4a", paddingLeft: 12 }}>
                {MOCK_SCHEDULE.advice}
              </div>
            </div>

            <div style={{ padding: "20px 20px 8px", fontSize: 15, fontWeight: "bold", color: "#3d3228" }}>📅 今日のスケジュール</div>
            
            {[
              { time: MOCK_SCHEDULE.wakeTime, label: "起床", sub: MOCK_SCHEDULE.saltMorning },
              { time: MOCK_SCHEDULE.mealTime1, label: "朝食", sub: "糖質・お米中心で気を補う" },
              { time: MOCK_SCHEDULE.mealTime2, label: "夕食", sub: "塩・タンパク質・海産物中心" },
              { time: MOCK_SCHEDULE.bathTime, label: "入浴", sub: "38〜39度・30分以内" },
              { time: MOCK_SCHEDULE.sleepTime, label: "就寝", sub: MOCK_SCHEDULE.saltEvening },
            ].map((item, i) => (
              <div key={i} style={{ margin: "0 20px 8px", background: "white", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(60,40,20,0.1)" }}>
                <div style={{ fontSize: 11, color: "#4a6741", fontWeight: "bold", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#1a1410" }}>{item.time}</div>
                <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.7 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI相談 */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "78%",
                      padding: "10px 14px",
                      borderRadius: 18,
                      fontSize: 13,
                      lineHeight: 1.7,
                      background: msg.type === "user" ? "#1a1410" : "white",
                      color: msg.type === "user" ? "#f5f0e8" : "#1a1410",
                      border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none",
                    }}>
                      {msg.text.split('\n').map((line, j) => <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>)}
                    </div>
                  </div>
                  {msg.choices && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {msg.choices.map((c, j) => (
                        <button key={j} onClick={() => handleChoice(c)} style={{ background: "#ede5d4", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 20, padding: "7px 14px", fontSize: 12, cursor: "pointer", color: "#3d3228" }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div style={{ background: "white", border: "1px solid rgba(60,40,20,0.1)", borderRadius: 18, padding: "12px 14px", width: 60 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: "#c17f4a", borderRadius: "50%", opacity: 0.5 }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: "10px 16px", background: "#f5f0e8", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1, background: "white", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 22, padding: "10px 16px", fontSize: 13, outline: "none" }}
                placeholder="自由に入力できます..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} style={{ width: 42, height: 42, borderRadius: "50%", background: "#1a1410", border: "none", cursor: "pointer", color: "white", fontSize: 18 }}>↑</button>
            </div>
          </div>
        )}

        {/* 設定 */}
        {tab === "settings" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 12 }}>⚙️ 設定</div>
            {[
              { icon: "⏰", label: "起床アラート", val: MOCK_SCHEDULE.wakeTime },
              { icon: "🍚", label: "食事アラート", val: `${MOCK_SCHEDULE.mealTime1} / ${MOCK_SCHEDULE.mealTime2}` },
              { icon: "🛁", label: "入浴アラート", val: MOCK_SCHEDULE.bathTime },
              { icon: "🌙", label: "就寝アラート", val: MOCK_SCHEDULE.sleepTime },
              { icon: "📅", label: "Googleカレンダー連携", val: "未連携" },
              { icon: "💬", label: "LINE通知", val: "未設定" },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(60,40,20,0.1)" }}>
                <div style={{ fontSize: 20 }}>{item.icon}</div>
                <div style={{ flex: 1, fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* 履歴 */}
        {tab === "history" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>🌿 今日の体調チェック</div>
            <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 16 }}>毎朝の記録が、あなたに合った生活リズムの土台になります</div>

            {saveMessage && (
              <div style={{ background: "#e8f0e4", border: "1px solid #c5d8be", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#4a6741", textAlign: "center" }}>
                ✓ {saveMessage}
              </div>
            )}

            {/* 睡眠時間 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>🌙 睡眠時間</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>入眠</div>
                  <input
                    type="time"
                    value={healthForm.sleepBed}
                    onChange={e => setHealthForm(prev => ({ ...prev, sleepBed: e.target.value }))}
                    style={{ width: "100%", background: "#f5f0e8", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#1a1410", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12, color: "#c17f4a", fontSize: 12 }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>起床</div>
                  <input
                    type="time"
                    value={healthForm.sleepWake}
                    onChange={e => setHealthForm(prev => ({ ...prev, sleepWake: e.target.value }))}
                    style={{ width: "100%", background: "#f5f0e8", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#1a1410", outline: "none" }}
                  />
                </div>
              </div>
            </div>

            <CountSelector
              label="中途覚醒の回数"
              value={healthForm.awakenings}
              onChange={v => setHealthForm(prev => ({ ...prev, awakenings: v }))}
            />

            <CountSelector
              label="夜間トイレの回数"
              value={healthForm.nightToilet}
              onChange={v => setHealthForm(prev => ({ ...prev, nightToilet: v }))}
            />

            {/* 朝の体調 */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>☀️ 朝の体調</div>
                <span style={{ fontSize: 16, fontWeight: "bold", color: "#c17f4a" }}>{healthForm.morningCondition}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={healthForm.morningCondition}
                onChange={e => setHealthForm(prev => ({ ...prev, morningCondition: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#c17f4a" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 4 }}>
                <span>悪い</span>
                <span>良い</span>
              </div>
            </div>

            {/* 便通 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>便通</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BOWEL_OPTIONS.map(opt => {
                  const selected = healthForm.bowel === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHealthForm(prev => ({ ...prev, bowel: opt }))}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        border: selected ? "1.5px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
                        background: selected ? "#fdf0e4" : "#ede5d4",
                        color: selected ? "#c17f4a" : "#3d3228",
                        fontSize: 12,
                        fontWeight: selected ? "bold" : "normal",
                        cursor: "pointer",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 気分 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>気分（各10段階）</div>
              {MOOD_ITEMS.map(item => (
                <MoodSlider
                  key={item.key}
                  moodKey={item.key}
                  label={item.label}
                  value={healthForm.mood[item.key]}
                  onChange={(key, val) => setHealthForm(prev => ({
                    ...prev,
                    mood: { ...prev.mood, [key]: val },
                  }))}
                />
              ))}
            </div>

            {/* 主な症状 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>主な症状（複数選択可）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SYMPTOM_OPTIONS.map(symptom => {
                  const selected = healthForm.symptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 20,
                        border: selected ? "1.5px solid #1a1410" : "1.5px solid rgba(60,40,20,0.12)",
                        background: selected ? "#1a1410" : "#ede5d4",
                        color: selected ? "#f5f0e8" : "#3d3228",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
              {healthForm.symptoms.includes("その他") && (
                <input
                  type="text"
                  placeholder="その他の症状を入力..."
                  value={healthForm.otherSymptom}
                  onChange={e => setHealthForm(prev => ({ ...prev, otherSymptom: e.target.value }))}
                  style={{ width: "100%", marginTop: 10, background: "#f5f0e8", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#1a1410", outline: "none" }}
                />
              )}
            </div>

            {/* 一言日記 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>今日の一言日記</div>
              <textarea
                placeholder="今日の体調や気づきを自由に..."
                value={healthForm.diary}
                onChange={e => setHealthForm(prev => ({ ...prev, diary: e.target.value }))}
                rows={4}
                style={{ width: "100%", background: "#f5f0e8", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 10, padding: "12px", fontSize: 13, color: "#1a1410", outline: "none", resize: "vertical", lineHeight: 1.7, fontFamily: "sans-serif", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="button"
              onClick={handleHealthSave}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: "#1a1410",
                color: "#f5f0e8",
                fontSize: 15,
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 24,
              }}
            >
              保存する
            </button>

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 12, paddingTop: 8, borderTop: "1px solid rgba(60,40,20,0.12)" }}>📊 過去の記録</div>
            {[
              { date: "5月29日（木）", diagnosis: "水滞", wake: "06:00", sleep: "22:30" },
              { date: "5月28日（水）", diagnosis: "血熱", wake: "06:30", sleep: "22:00" },
              { date: "5月27日（火）", diagnosis: "腎虚", wake: "06:00", sleep: "22:30" },
            ].map((h, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{h.date}</div>
                <div style={{ display: "inline-block", background: "#fdf0e4", color: "#c17f4a", borderRadius: 12, padding: "3px 10px", fontSize: 11, marginBottom: 6 }}>{h.diagnosis}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.7 }}>
                  <span>⏰ {h.wake}</span>
                  <span>🌙 {h.sleep}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ボトムナビ */}
      <div style={{ background: "#1a1410", display: "flex", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { key: "home", icon: "🏠", label: "ホーム" },
          { key: "chat", icon: "💬", label: "AI相談" },
          { key: "history", icon: "📊", label: "履歴" },
          { key: "settings", icon: "⚙️", label: "設定" },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key as Tab)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 12px", gap: 4, cursor: "pointer", border: "none", background: "none",
            color: tab === item.key ? "#e8a86a" : "rgba(245,240,232,0.45)", fontSize: 10, fontFamily: "sans-serif"
          }}>
            <div style={{ fontSize: 20 }}>{item.icon}</div>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
