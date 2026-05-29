'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { BackgroundAudioSession, configureMixAudioSession } from "@/src/lib/backgroundAudioSession";
import { AlarmEngine } from "@/src/lib/alarmEngine";
import { BinauralAudioEngine } from "@/src/lib/binauralAudioEngine";
import { getBeatPreset } from "@/src/lib/binauralBeats";
import {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_BREAK_BEAT_ID,
  POMODORO_WORK_BEAT_ID,
  phaseDurationSec,
  phaseLabel,
  type PomodoroPhase,
  type PomodoroSettings,
} from "@/src/lib/pomodoro";
import {
  ALARM_TRIGGER_EVENT,
  type AlarmTriggerDetail,
} from "@/src/lib/alarmCoordinator";
import {
  fireSwAlarm,
  requestNotificationPermission,
  scheduleSwAlarm,
  stopSwAlarm,
} from "@/src/lib/timerServiceWorker";

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

import type { AmbientSoundId } from "@/src/lib/binauralBeats";

type Props = {
  ambientId: AmbientSoundId;
  masterVolume: number;
  binauralVolume: number;
  ambientVolume: number;
};

export default function PomodoroTimer({
  ambientId,
  masterVolume,
  binauralVolume,
  ambientVolume,
}: Props) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [setNumber, setSetNumber] = useState(1);
  const [completedWorkSets, setCompletedWorkSets] = useState(0);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_POMODORO_SETTINGS.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [linkBinaural, setLinkBinaural] = useState(true);

  const endAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<BinauralAudioEngine | null>(null);
  const bgSessionRef = useRef(new BackgroundAudioSession());
  const alarmRef = useRef<AlarmEngine | null>(null);
  const phaseRef = useRef(phase);
  const settingsRef = useRef(settings);
  const completedRef = useRef(completedWorkSets);
  const setNumberRef = useRef(setNumber);
  const isRunningRef = useRef(isRunning);
  const pendingContinueRef = useRef(false);
  const completingRef = useRef(false);
  const startPomodoroRef = useRef<() => Promise<void>>(async () => {});

  phaseRef.current = phase;
  settingsRef.current = settings;
  completedRef.current = completedWorkSets;
  setNumberRef.current = setNumber;
  isRunningRef.current = isRunning;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopBinaural = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    bgSessionRef.current.stop();
  }, []);

  const startBinauralForPhase = useCallback(
    async (targetPhase: PomodoroPhase) => {
      if (!linkBinaural) return;
      const beatId = targetPhase === "work" ? POMODORO_WORK_BEAT_ID : POMODORO_BREAK_BEAT_ID;
      const preset = getBeatPreset(beatId);
      if (engineRef.current?.isPlaying()) {
        engineRef.current.updatePreset(preset);
        return;
      }
      configureMixAudioSession();
      const engine = new BinauralAudioEngine();
      engineRef.current = engine;
      await engine.start(preset, ambientId, { fadeInSec: 4 });
      engine.setMasterVolume(masterVolume);
      engine.setBinauralVolume(binauralVolume);
      engine.setAmbientVolume(ambientVolume);
      await bgSessionRef.current.start(() => {
        void engine.resumeIfSuspended();
        void engine.resumeAfterInterrupt();
      });
      engine.bindContextStateHandler(
        () => bgSessionRef.current.pauseForCall(),
        () => {
          void engine.resumeAfterInterrupt();
        }
      );
    },
    [linkBinaural, ambientId, masterVolume, binauralVolume, ambientVolume]
  );

  const stopAlarm = useCallback(() => {
    alarmRef.current?.stop();
    alarmRef.current = null;
    setIsAlarmRinging(false);
    stopSwAlarm();
    if (pendingContinueRef.current) {
      pendingContinueRef.current = false;
      void startPomodoroRef.current();
    }
  }, []);

  const startAlarm = useCallback((title: string, body: string, skipSwNotify = false) => {
    if (alarmRef.current?.isActive()) return;
    setIsAlarmRinging(true);
    const alarm = new AlarmEngine();
    alarmRef.current = alarm;
    alarm.start();
    if (!skipSwNotify) {
      fireSwAlarm(title, body, "pomodoro");
    }
  }, []);

  const prepareNextPhase = useCallback((nextPhase: PomodoroPhase, nextSetNumber: number, nextCompleted: number) => {
    const dur = phaseDurationSec(settingsRef.current, nextPhase);
    setPhase(nextPhase);
    setSetNumber(nextSetNumber);
    setCompletedWorkSets(nextCompleted);
    setRemainingSec(dur);
  }, []);

  const handlePhaseComplete = useCallback((skipSwNotify = false) => {
    if (completingRef.current || !isRunningRef.current) return;
    completingRef.current = true;
    clearTick();
    stopBinaural();
    setIsRunning(false);
    stopSwAlarm();

    const currentPhase = phaseRef.current;
    const s = settingsRef.current;
    const completed = completedRef.current;
    const currentSet = setNumberRef.current;

    if (currentPhase === "work") {
      const newCompleted = completed + 1;
      startAlarm("作業終了！", `第${currentSet}セットが完了しました。休憩に入りましょう。`, skipSwNotify);
      if (newCompleted >= s.longBreakInterval) {
        prepareNextPhase("longBreak", currentSet, 0);
      } else {
        prepareNextPhase("shortBreak", currentSet, newCompleted);
      }
    } else {
      startAlarm(
        currentPhase === "longBreak" ? "長い休憩終了！" : "休憩終了！",
        "次の作業セットを始めましょう。",
        skipSwNotify
      );
      if (currentPhase === "longBreak") {
        prepareNextPhase("work", 1, 0);
      } else {
        prepareNextPhase("work", currentSet + 1, completed);
      }
    }

    pendingContinueRef.current = true;
    setTimeout(() => {
      completingRef.current = false;
    }, 1500);
  }, [clearTick, prepareNextPhase, startAlarm, stopBinaural]);

  const startPomodoro = useCallback(async () => {
    await requestNotificationPermission();
    const dur = remainingSec > 0 ? remainingSec : phaseDurationSec(settings, phase);
    endAtRef.current = Date.now() + dur * 1000;
    scheduleSwAlarm(
      endAtRef.current,
      `🍅 ${phaseLabel(phase)}終了`,
      `第${setNumber}セット · ${phaseLabel(phase)}`,
      "pomodoro"
    );
    setIsRunning(true);
    await startBinauralForPhase(phase);

    clearTick();
    tickRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0) {
        handlePhaseComplete();
      }
    }, 250);
  }, [
    settings,
    phase,
    remainingSec,
    setNumber,
    startBinauralForPhase,
    clearTick,
    handlePhaseComplete,
  ]);

  startPomodoroRef.current = startPomodoro;

  const stopPomodoro = useCallback(() => {
    clearTick();
    stopBinaural();
    pendingContinueRef.current = false;
    stopAlarm();
    stopSwAlarm();
    setIsRunning(false);
  }, [clearTick, stopBinaural, stopAlarm]);

  const resetPomodoro = useCallback(() => {
    stopPomodoro();
    setPhase("work");
    setSetNumber(1);
    setCompletedWorkSets(0);
    setRemainingSec(settings.workMinutes * 60);
  }, [stopPomodoro, settings.workMinutes]);

  useEffect(() => {
    if (!isRunning || !engineRef.current) return;
    engineRef.current.setMasterVolume(masterVolume);
    engineRef.current.setBinauralVolume(binauralVolume);
    engineRef.current.setAmbientVolume(ambientVolume);
  }, [masterVolume, binauralVolume, ambientVolume, isRunning]);

  useEffect(() => {
    return () => {
      clearTick();
      stopBinaural();
      stopAlarm();
    };
  }, [clearTick, stopBinaural, stopAlarm]);

  useEffect(() => {
    const onSwAlarm = (event: Event) => {
      const detail = (event as CustomEvent<AlarmTriggerDetail>).detail;
      if (detail.source !== "pomodoro" || !isRunningRef.current) return;
      handlePhaseComplete(true);
    };
    window.addEventListener(ALARM_TRIGGER_EVENT, onSwAlarm);
    return () => window.removeEventListener(ALARM_TRIGGER_EVENT, onSwAlarm);
  }, [handlePhaseComplete]);

  return (
    <div>
      {isAlarmRinging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(196,74,74,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "white", marginBottom: 8 }}>タイマー終了</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", marginBottom: 24, textAlign: "center" }}>
            {phaseLabel(phase)}が終わりました
          </div>
          <button
            type="button"
            onClick={stopAlarm}
            style={{
              padding: "16px 48px",
              borderRadius: 14,
              border: "none",
              background: "white",
              color: "#c44a4a",
              fontSize: 18,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            止める
          </button>
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "16px 14px",
          marginBottom: 16,
          border: "1px solid rgba(60,40,20,0.1)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 4 }}>
          第 {setNumber} セット · {phaseLabel(phase)}
          {phase === "work" && (
            <span> （{completedWorkSets}/{settings.longBreakInterval} 完了→長休憩）</span>
          )}
          {phase !== "work" && completedWorkSets > 0 && phase !== "longBreak" && (
            <span> （{completedWorkSets}/{settings.longBreakInterval} セット完了）</span>
          )}
        </div>
        <div style={{ fontSize: 42, fontWeight: "bold", color: phase === "work" ? "#1a1410" : "#4a6741" }}>
          {formatRemaining(remainingSec)}
        </div>
        <div style={{ fontSize: 11, color: "#4a6741", marginTop: 6 }}>
          {linkBinaural && (
            <>
              🎧 {phase === "work" ? "ベータ波（集中）" : "アルファ波（リラックス）"} 自動切替
            </>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741", marginBottom: 8 }}>カスタム設定</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <SettingInput
          label="作業（分）"
          value={settings.workMinutes}
          disabled={isRunning}
          onChange={v => setSettings(s => ({ ...s, workMinutes: v }))}
        />
        <SettingInput
          label="休憩（分）"
          value={settings.shortBreakMinutes}
          disabled={isRunning}
          onChange={v => setSettings(s => ({ ...s, shortBreakMinutes: v }))}
        />
        <SettingInput
          label="長い休憩（分）"
          value={settings.longBreakMinutes}
          disabled={isRunning}
          onChange={v => setSettings(s => ({ ...s, longBreakMinutes: v }))}
        />
        <SettingInput
          label="長休憩まで（セット）"
          value={settings.longBreakInterval}
          disabled={isRunning}
          min={2}
          max={8}
          onChange={v => setSettings(s => ({ ...s, longBreakInterval: v }))}
        />
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "#3d3228",
          marginBottom: 16,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={linkBinaural}
          onChange={e => setLinkBinaural(e.target.checked)}
          disabled={isRunning}
        />
        バイノーラルビートと連動（作業=ベータ波 / 休憩=アルファ波）
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => (isRunning ? stopPomodoro() : startPomodoro())}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: isRunning ? "#4a6741" : "#c17f4a",
            color: "#f5f0e8",
            fontSize: 15,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {isRunning ? "⏸ 一時停止" : "▶ ポモドーロ開始"}
        </button>
        <button
          type="button"
          onClick={resetPomodoro}
          disabled={isRunning}
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: "1.5px solid rgba(60,40,20,0.12)",
            background: "white",
            color: "#9a8b7a",
            fontSize: 13,
            cursor: isRunning ? "default" : "pointer",
          }}
        >
          リセット
        </button>
      </div>

      <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 12, lineHeight: 1.6 }}>
        4セット完了ごとに長い休憩（{settings.longBreakMinutes}分）が入ります。終了時はアラーム音・バイブレーション・通知が鳴り、「止める」まで繰り返します。
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  disabled,
  min = 1,
  max = 60,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9a8b7a", marginBottom: 4 }}>{label}</div>
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        style={{
          width: "100%",
          background: "#f5f0e8",
          border: "1.5px solid rgba(60,40,20,0.12)",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
