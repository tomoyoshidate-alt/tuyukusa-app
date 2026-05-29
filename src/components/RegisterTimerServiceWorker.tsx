"use client";

import { useEffect } from "react";
import { initAlarmCoordinator } from "@/src/lib/alarmCoordinator";
import { registerTimerServiceWorker } from "@/src/lib/timerServiceWorker";

export default function RegisterTimerServiceWorker() {
  useEffect(() => {
    void registerTimerServiceWorker().then(() => initAlarmCoordinator());
  }, []);

  return null;
}
