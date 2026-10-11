import { describe, expect, it } from "vitest";
import { formatKoreanDate, seoulDateParts, todayKey } from "./date";

describe("Asia/Seoul 기준 날짜", () => {
  it("UTC 자정 직전은 서울에서는 다음 날이다", () => {
    // 2026-10-10 16:00 UTC = 2026-10-11 01:00 KST
    const t = new Date("2026-10-10T16:00:00Z");
    expect(todayKey(t)).toBe("2026-10-11");
  });

  it("UTC 15시 전은 서울에서도 같은 날이다", () => {
    // 2026-10-10 14:59 UTC = 2026-10-10 23:59 KST
    const t = new Date("2026-10-10T14:59:00Z");
    expect(todayKey(t)).toBe("2026-10-10");
  });

  it("요일을 0(일)~6(토)로 돌려준다", () => {
    // 2026-10-11 은 일요일
    const t = new Date("2026-10-11T03:00:00Z");
    expect(seoulDateParts(t).weekday).toBe(0);
  });

  it("한국어 날짜 문구를 만든다", () => {
    const t = new Date("2026-10-11T03:00:00Z");
    expect(formatKoreanDate(t)).toBe("10월 11일 일요일");
  });
});
