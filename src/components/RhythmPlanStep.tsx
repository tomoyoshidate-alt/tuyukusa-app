"use client";

import { useMemo, useState } from "react";
import type { OnboardingFlowData } from "@/src/lib/onboarding";
import {
  buildPlanSummary,
  computeAllAlarmItems,
  DEFAULT_CHECKLIST,
  DEFAULT_ROUTINES,
  extractTime,
  minutesToTimeString,
  recommendSaltSchedule,
  registerRhythmPlanAlarms,
  saveRhythmPlan,
  STATION_MODES,
  timeStringToMinutes,
  type RhythmPlan,
  type RoutineItem,
} from "@/src/lib/rhythmPlan";

type Props = {
  flowData: OnboardingFlowData;
  /** 設計完了後にプランのサマリー文を返す */
  onComplete: (summary: string) => void;
};

/** <input type="time"> 用に "8:05" → "08:05" */
function toInputTime(time: string | undefined): string {
  if (!time) return "";
  const m = timeStringToMinutes(time);
  if (m === null) return "";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(60,40,20,0.12)",
  borderRadius: 16,
  padding: "16px 16px 18px",
  marginTop: 4,
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b5c4a", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid rgba(60,40,20,0.15)",
  fontSize: 14,
  color: "#3d3228",
  background: "#faf7f1",
  boxSizing: "border-box",
};
const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#4a6741",
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: 14,
};
const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 16,
  border: "1.5px solid rgba(60,40,20,0.15)",
  background: "#f7f3ec",
  fontSize: 13,
  color: "#3d3228",
};

export default function RhythmPlanStep({ flowData, onComplete }: Props) {
  const wakeTime = extractTime(flowData.wake ?? flowData.weekdayWake);
  const bedTime = extractTime(flowData.bedtime ?? flowData.weekdayBedtime);
  const salt = useMemo(
    () => recommendSaltSchedule(flowData.psychResult, wakeTime, bedTime),
    [flowData.psychResult, wakeTime, bedTime],
  );

  const [stage, setStage] = useState(0);
  const [goalLabel, setGoalLabel] = useState("");
  const [targetTime, setTargetTime] = useState("08:12");
  const [stationMinutes, setStationMinutes] = useState(10);
  const [stationMode, setStationMode] = useState<string>("徒歩");
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [routines, setRoutines] = useState<RoutineItem[]>(DEFAULT_ROUTINES.map(r => ({ ...r })));
  const [newRoutine, setNewRoutine] = useState("");
  const [newRoutineMin, setNewRoutineMin] = useState(5);
  const [checklist, setChecklist] = useState<string[]>([...DEFAULT_CHECKLIST]);
  const [newItem, setNewItem] = useState("");
  const [checklistTime, setChecklistTime] = useState(() => {
    const bed = timeStringToMinutes(bedTime ?? "23:00") ?? 23 * 60;
    return toInputTime(minutesToTimeString(bed - 90));
  });
  const [saltMorningOn, setSaltMorningOn] = useState(!!salt.morning);
  const [saltMorningTime, setSaltMorningTime] = useState(toInputTime(salt.morning ?? "7:10"));
  const [saltNightOn, setSaltNightOn] = useState(!!salt.night);
  const [saltNightTime, setSaltNightTime] = useState(toInputTime(salt.night ?? "22:30"));
  const [binauralOn, setBinauralOn] = useState(true);
  const [binauralTime, setBinauralTime] = useState(() => {
    const bed = timeStringToMinutes(bedTime ?? "23:00") ?? 23 * 60;
    return toInputTime(minutesToTimeString(bed - 30));
  });
  const [registering, setRegistering] = useState(false);
  const [registerNote, setRegisterNote] = useState("");

  const buildPlan = (): RhythmPlan => ({
    goalLabel: goalLabel.trim() || `${targetTime}の電車に乗る`,
    targetTime,
    stationMinutes,
    stationMode,
    bufferMinutes,
    routines,
    checklist,
    checklistTime,
    saltMorningTime: saltMorningOn && saltMorningTime ? saltMorningTime : undefined,
    saltNightTime: saltNightOn && saltNightTime ? saltNightTime : undefined,
    binauralTime: binauralOn && binauralTime ? binauralTime : undefined,
    updatedAt: Date.now(),
  });

  const plan = buildPlan();
  const preview = computeAllAlarmItems(plan);

  const handleFinish = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const finalPlan = buildPlan();
      saveRhythmPlan(finalPlan);
      const count = await registerRhythmPlanAlarms(finalPlan);
      const summary =
        buildPlanSummary(finalPlan) +
        (count > 0
          ? `\n\n本日分のアラートを${count}件セットしました。`
          : "\n\n※通知が許可されていないため、アラートは端末の通知を許可すると届くようになります。");
      onComplete(summary);
    } finally {
      setRegistering(false);
    }
  };

  const stageTitle = ["① 目標を決める", "② 出発前にいつもすること", "③ 前の夜に用意するもの", "④ 養生と眠りの設定", "⑤ プランの確認"][stage];

  return (
    <div style={cardStyle}>
      {stage === 0 && (
        <div style={{ fontSize: 13, color: "#4a6741", lineHeight: 1.7, marginBottom: 12 }}>
          ここからは、ひとつの目標に間に合うための「生活リズムの設計」を一緒につくります。
          目標の時刻から逆算して、必要な時刻にアラートでお知らせします。
        </div>
      )}
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 8 }}>{stageTitle}（{stage + 1} / 5）</div>

      {stage === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={labelStyle}>達成したい目標（例：8:12の電車に乗る、9:00に保育園に着く）</div>
            <input
              style={inputStyle}
              value={goalLabel}
              onChange={e => setGoalLabel(e.target.value)}
              placeholder="8:12の電車に乗る"
            />
          </div>
          <div>
            <div style={labelStyle}>その時刻（電車の発車時刻・到着したい時刻）</div>
            <input type="time" style={inputStyle} value={targetTime} onChange={e => setTargetTime(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>駅（目的地）までの行き方と所要時間</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...inputStyle, width: "50%" }} value={stationMode} onChange={e => setStationMode(e.target.value)}>
                {STATION_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "50%" }}>
                <input
                  type="number"
                  min={1}
                  max={120}
                  style={inputStyle}
                  value={stationMinutes}
                  onChange={e => setStationMinutes(Math.max(1, parseInt(e.target.value || "1", 10)))}
                />
                <span style={{ fontSize: 13, color: "#6b5c4a", flexShrink: 0 }}>分</span>
              </div>
            </div>
          </div>
          <div>
            <div style={labelStyle}>余裕（5分前行動がおすすめです）</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBufferMinutes(n)}
                  style={{
                    ...chipStyle,
                    cursor: "pointer",
                    borderColor: bufferMinutes === n ? "#4a6741" : "rgba(60,40,20,0.15)",
                    background: bufferMinutes === n ? "rgba(74,103,65,0.12)" : "#f7f3ec",
                  }}
                >
                  {n}分前
                </button>
              ))}
            </div>
          </div>
          <button type="button" style={primaryButtonStyle} onClick={() => setStage(1)}>次へ</button>
        </div>
      )}

      {stage === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#4a6741", lineHeight: 1.6 }}>
            出発前にいつもすることと、かかる時間を教えてください。合計から逆算して「始める時刻」をお知らせします。
          </div>
          {routines.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 14, color: "#3d3228" }}>{r.label}</span>
              <input
                type="number"
                min={1}
                max={90}
                value={r.minutes}
                onChange={e => {
                  const v = Math.max(1, parseInt(e.target.value || "1", 10));
                  setRoutines(prev => prev.map((x, j) => (j === i ? { ...x, minutes: v } : x)));
                }}
                style={{ ...inputStyle, width: 64, padding: "6px 8px", textAlign: "center" }}
              />
              <span style={{ fontSize: 12, color: "#6b5c4a" }}>分</span>
              <button
                type="button"
                aria-label={`${r.label}を削除`}
                onClick={() => setRoutines(prev => prev.filter((_, j) => j !== i))}
                style={{ border: "none", background: "transparent", color: "#c44a4a", cursor: "pointer", fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={newRoutine}
              onChange={e => setNewRoutine(e.target.value)}
              placeholder="追加する（例：お弁当づくり）"
            />
            <input
              type="number"
              min={1}
              max={90}
              value={newRoutineMin}
              onChange={e => setNewRoutineMin(Math.max(1, parseInt(e.target.value || "1", 10)))}
              style={{ ...inputStyle, width: 64, textAlign: "center" }}
            />
            <button
              type="button"
              onClick={() => {
                const label = newRoutine.trim();
                if (!label) return;
                setRoutines(prev => [...prev, { id: `r-${Date.now()}`, label, minutes: newRoutineMin }]);
                setNewRoutine("");
              }}
              style={{ ...chipStyle, cursor: "pointer", flexShrink: 0 }}
            >
              ＋追加
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#6b5c4a" }}>
            合計 {routines.reduce((sum, r) => sum + r.minutes, 0)}分
          </div>
          <button type="button" style={primaryButtonStyle} onClick={() => setStage(2)}>次へ</button>
        </div>
      )}

      {stage === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#4a6741", lineHeight: 1.6 }}>
            忘れ物をなくすコツは「前の夜に玄関へ」。持ち物をテンプレとして保存し、毎晩この時刻にお知らせします。
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {checklist.map((c, i) => (
              <span key={`${c}-${i}`} style={chipStyle}>
                {c}
                <button
                  type="button"
                  aria-label={`${c}を削除`}
                  onClick={() => setChecklist(prev => prev.filter((_, j) => j !== i))}
                  style={{ border: "none", background: "transparent", color: "#c44a4a", cursor: "pointer", fontSize: 12, padding: 0 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="追加する（例：書類、薬）"
            />
            <button
              type="button"
              onClick={() => {
                const v = newItem.trim();
                if (!v) return;
                setChecklist(prev => [...prev, v]);
                setNewItem("");
              }}
              style={{ ...chipStyle, cursor: "pointer", flexShrink: 0 }}
            >
              ＋追加
            </button>
          </div>
          <div>
            <div style={labelStyle}>前の夜、何時にお知らせしますか？</div>
            <input type="time" style={inputStyle} value={checklistTime} onChange={e => setChecklistTime(e.target.value)} />
          </div>
          <button type="button" style={primaryButtonStyle} onClick={() => setStage(3)}>次へ</button>
        </div>
      )}

      {stage === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#4a6741", lineHeight: 1.6 }}>{salt.note}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#3d3228" }}>
            <input type="checkbox" checked={saltMorningOn} onChange={e => setSaltMorningOn(e.target.checked)} />
            🧂 塩湯（起床後）
            <input
              type="time"
              style={{ ...inputStyle, width: 120, padding: "6px 8px" }}
              value={saltMorningTime}
              onChange={e => setSaltMorningTime(e.target.value)}
              disabled={!saltMorningOn}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#3d3228" }}>
            <input type="checkbox" checked={saltNightOn} onChange={e => setSaltNightOn(e.target.checked)} />
            🧂 塩湯（就寝前）
            <input
              type="time"
              style={{ ...inputStyle, width: 120, padding: "6px 8px" }}
              value={saltNightTime}
              onChange={e => setSaltNightTime(e.target.value)}
              disabled={!saltNightOn}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#3d3228" }}>
            <input type="checkbox" checked={binauralOn} onChange={e => setBinauralOn(e.target.checked)} />
            🌙 就寝前バイノーラル
            <input
              type="time"
              style={{ ...inputStyle, width: 120, padding: "6px 8px" }}
              value={binauralTime}
              onChange={e => setBinauralTime(e.target.value)}
              disabled={!binauralOn}
            />
          </label>
          <div style={{ fontSize: 12, color: "#6b5c4a", lineHeight: 1.6 }}>
            バイノーラルの時刻になったら、アプリの「バイノーラル」タブで「ねむり」プリセットを流すのがおすすめです。
          </div>
          <button type="button" style={primaryButtonStyle} onClick={() => setStage(4)}>プランを確認する</button>
        </div>
      )}

      {stage === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#1a1410", marginBottom: 4 }}>
            {plan.goalLabel}（{plan.targetTime}）のための一日
          </div>
          {preview.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 0", borderBottom: "1px dashed rgba(60,40,20,0.08)" }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741", width: 48, flexShrink: 0 }}>{item.time}</span>
              <span style={{ fontSize: 13, color: "#3d3228" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#6b5c4a", marginTop: 6, lineHeight: 1.6 }}>
            「アラートを設定」を押すと通知の許可を確認し、本日分のアラートをセットします。以後はアプリを開いた日に自動でセットされます。
          </div>
          {registerNote && <div style={{ fontSize: 12, color: "#c44a4a" }}>{registerNote}</div>}
          <button type="button" style={primaryButtonStyle} disabled={registering} onClick={() => void handleFinish().catch(() => setRegisterNote("アラートの設定に失敗しました。もう一度お試しください。"))}>
            {registering ? "設定中…" : "この設計でアラートを設定する"}
          </button>
          <button
            type="button"
            onClick={() => setStage(0)}
            style={{ border: "none", background: "transparent", color: "#6b5c4a", fontSize: 13, cursor: "pointer", marginTop: 4 }}
          >
            ← 最初から直す
          </button>
        </div>
      )}

      {stage > 0 && stage < 4 && (
        <button
          type="button"
          onClick={() => setStage(stage - 1)}
          style={{ border: "none", background: "transparent", color: "#6b5c4a", fontSize: 13, cursor: "pointer", marginTop: 10 }}
        >
          ← 戻る
        </button>
      )}
    </div>
  );
}
