"use client";

import { DevRequestChat } from "@/src/components/DevRequestChat";
import { DevRequestNotifications } from "@/src/components/DevRequestNotifications";

export function DevRequestShell() {
  return (
    <>
      <DevRequestChat />
      <DevRequestNotifications />
    </>
  );
}
