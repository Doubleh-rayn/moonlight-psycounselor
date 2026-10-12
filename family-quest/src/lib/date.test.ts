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

describe("날짜 키 연산", () => {
  it("addDays 는 월·연 경계를 넘는다", async () => {
    const { addDays } = await import("./date");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("주 시작은 월요일, 일요일은 그 주의 끝", async () => {
    const { startOfWeek, endOfWeek, weekdayOf } = await import("./date");
    expect(weekdayOf("2026-10-11")).toBe(0); // 일
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05");
    expect(endOfWeek("2026-10-07")).toBe("2026-10-11");
  });

  it("월 범위", async () => {
    const { startOfMonth, endOfMonth, addMonths, diffDays, eachDay } = await import("./date");
    expect(startOfMonth("2026-02-15")).toBe("2026-02-01");
    expect(endOfMonth("2026-02-15")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-15")).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
    expect(diffDays("2026-10-05", "2026-10-11")).toBe(6);
    expect(eachDay("2026-10-05", "2026-10-07")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });
});
