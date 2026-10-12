"use client";

import { useEffect } from "react";

/** 서비스 워커 등록 (프로덕션에서만). 오프라인 캐시는 하지 않는다 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
