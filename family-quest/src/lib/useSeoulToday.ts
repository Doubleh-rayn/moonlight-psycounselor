"use client";

import { useSyncExternalStore } from "react";
import { formatKoreanDate, todayKey } from "@/lib/date";

const subscribe = () => () => {};

/**
 * 오늘 날짜(Asia/Seoul)를 클라이언트에서만 읽는다.
 * 서버 렌더에서는 빈 값을 돌려 Cache Components 의 현재시각 제한과
 * 하이드레이션 불일치를 피한다. 날짜가 바뀌면 다음 렌더에서 반영된다.
 */
export function useSeoulToday(): { key: string; label: string } {
  const key = useSyncExternalStore(subscribe, () => todayKey(), () => "");
  const label = useSyncExternalStore(subscribe, () => formatKoreanDate(), () => "");
  return { key, label };
}
