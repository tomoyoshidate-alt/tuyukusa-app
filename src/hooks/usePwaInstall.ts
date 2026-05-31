"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isBeforeInstallPromptEvent,
  isStandaloneMode,
  type BeforeInstallPromptEvent,
} from "@/src/lib/pwaInstall";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (isBeforeInstallPromptEvent(e)) setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    deferredPrompt,
    installed,
    canPromptInstall: !!deferredPrompt && !installed,
    promptInstall,
  };
}
