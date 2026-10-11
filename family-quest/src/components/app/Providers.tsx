"use client";

import type { ReactNode } from "react";
import { FamilyStoreProvider } from "@/lib/store/FamilyStore";
import { ToastProvider } from "./Toast";
import { PinGateProvider } from "./PinGate";
import { AppGate } from "./AppGate";
import { DemoBanner } from "./DemoBanner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <FamilyStoreProvider>
        <PinGateProvider>
          <DemoBanner />
          <AppGate>{children}</AppGate>
        </PinGateProvider>
      </FamilyStoreProvider>
    </ToastProvider>
  );
}
