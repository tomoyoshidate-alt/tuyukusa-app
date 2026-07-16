"use client";

import { useEffect } from "react";
import { registerRhythmPlanAlarmsForToday } from "@/src/lib/rhythmPlan";

/**
 * アプリを開いたときに1日1回、保存済みの生活リズム設計（rhythmPlan）の
 * アラートを本日分として再登録する。通知未許可・プラン未作成なら何もしない。
 */
export default function RhythmPlanDailyAlarms() {
  useEffect(() => {
    void registerRhythmPlanAlarmsForToday();
  }, []);
  return null;
}
