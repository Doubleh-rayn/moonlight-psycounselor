"use client";

import { Suspense, type ReactNode } from "react";
import { FamilyStoreProvider } from "@/lib/store/FamilyStore";
import { ToastProvider } from "./Toast";
import { PinGateProvider } from "./PinGate";
import { AppGate } from "./AppGate";
import { DemoBanner } from "./DemoBanner";
import { PlanMaintenance } from "./PlanMaintenance";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <FamilyStoreProvider>
        <PinGateProvider>
          <DemoBanner />
          <PlanMaintenance />
          {/* AppGate 가 usePathname 을 쓰므로 동적 경로(/habits/[id]) 프리렌더를 위해 Suspense 가 필요하다 */}
          <Suspense fallback={null}>
            <AppGate>{children}</AppGate>
          </Suspense>
        </PinGateProvider>
      </FamilyStoreProvider>
    </ToastProvider>
  );
}
