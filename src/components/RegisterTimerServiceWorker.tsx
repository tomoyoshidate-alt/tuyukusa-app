"use client";

import { useEffect } from "react";
import { registerTimerServiceWorker } from "@/src/lib/timerServiceWorker";

export default function RegisterTimerServiceWorker() {
  useEffect(() => {
    void registerTimerServiceWorker();
  }, []);

  return null;
}
