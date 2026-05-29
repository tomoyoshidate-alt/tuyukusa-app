"use client";

import type { ReactNode } from "react";
import RadioPersistentIframe from "@/src/components/RadioPersistentIframe";

export default function RadioProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RadioPersistentIframe />
    </>
  );
}
