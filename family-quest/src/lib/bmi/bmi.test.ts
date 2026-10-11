import { describe, expect, it } from "vitest";
import {
  BMI_TABLE,
  ageInMonths,
  ageInMonthsFromYearMonth,
  ageMonthsFromYears,
  assessChildBmi,
  calcBmi,
  classify,
  formatPercentile,
  isTableLoaded,
  lookupLms,
  normalCdf,
  percentileFromZ,
  zScore,
  type BmiTable,
} from "./index";

describe("데이터 파일", () => {
  it("성별당 24~227개월 204행, 누락 없음", () => {
    for (const sex of ["1", "2"] as const) {
      const rows = BMI_TABLE.data[sex];
      expect(Object.keys(rows)).toHaveLength(204);
      for (let m = 24; m <= 227; m++) expect(rows[String(m)]).toBeDefined();
    }
    expect(isTableLoaded()).toBe(true);
  });

  it("범위 밖 월령은 undefined", () => {
    expect(lookupLms("male", 23)).toBeUndefined();
    expect(lookupLms("male", 228)).toBeUndefined();
    expect(lookupLms("female", 24)).toBeDefined();
  });
});

describe("3.1 만 나이(개월)", () => {
  it("지침서 6쪽 예시: 2010-11-10 출생, 2017-12-12 측정 → 85개월", () => {
    expect(
      ageInMonths({ year: 2010, month: 11, day: 10 }, { year: 2017, month: 12, day: 12 }),
    ).toBe(85);
  });

  it("소수점은 버린다 (생일 직전은 한 달 전)", () => {
    // 2010-11-10 → 2017-11-09: 84 + (−1/30.4) = 83.97 → 83
    expect(
      ageInMonths({ year: 2010, month: 11, day: 10 }, { year: 2017, month: 11, day: 9 }),
    ).toBe(83);
  });

  it("측정일이 생년월일보다 앞서면 null", () => {
    expect(
      ageInMonths({ year: 2020, month: 1, day: 1 }, { year: 2019, month: 12, day: 31 }),
    ).toBeNull();
  });

  it("생년월만 알면 월 차이만 쓴다", () => {
    expect(ageInMonthsFromYearMonth({ year: 2015, month: 3 }, { year: 2026, month: 10, day: 11 })).toBe(139);
  });

  it("나이(세)만 알면 시작 월령: 3세 → 36", () => {
    expect(ageMonthsFromYears(3)).toBe(36);
  });
});

describe("3.2 BMI", () => {
  it("지침서 11쪽 예시: 52.5kg, 154.0cm → 22.1", () => {
    expect(calcBmi(52.5, 154)).toBe(22.1);
  });

  it("0 이하 입력은 null", () => {
    expect(calcBmi(0, 154)).toBeNull();
    expect(calcBmi(52.5, -1)).toBeNull();
  });
});

describe("3.3 Z점수와 백분위수", () => {
  it("Φ(0) = 0.5, Φ(1.96) ≈ 0.975", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("L = 0 이면 로그식을 쓴다", () => {
    expect(zScore(20, { L: 0, M: 20, S: 0.1 })).toBe(0);
    expect(zScore(22, { L: 0, M: 20, S: 0.1 })).toBeCloseTo(Math.log(1.1) / 0.1, 10);
  });

  it("극단값 표시", () => {
    expect(formatPercentile(3.2, 99.93)).toBe("99.9 초과");
    expect(formatPercentile(-3.2, 0.07)).toBe("0.1 미만");
    expect(formatPercentile(0.7167, 76.32)).toBe("76.3");
  });
});

describe("5. 명세 테스트 케이스", () => {
  const cases = [
    { sex: "male", months: 147, bmi: 22.1, L: 0.0981, M: 19.9291, S: 0.145, z: 0.7167, p: 76.3, category: "none", caution: false },
    { sex: "female", months: 100, bmi: 16.0, L: -0.6657, M: 16.7802, S: 0.1212, z: -0.3991, p: 34.5, category: "none", caution: false },
    { sex: "male", months: 200, bmi: 25.2, L: 0.2013, M: 21.8205, S: 0.1221, z: 1.1966, p: 88.4, category: "overweight", caution: true },
  ] as const;

  for (const c of cases) {
    it(`${c.sex} ${c.months}개월 BMI ${c.bmi} → Z ${c.z}, ${c.p}백분위, ${c.category}`, () => {
      const row = lookupLms(c.sex, c.months)!;
      expect(row.L).toBe(c.L);
      expect(row.M).toBe(c.M);
      expect(row.S).toBe(c.S);
      const z = zScore(c.bmi, row);
      expect(z).toBeCloseTo(c.z, 4);
      expect(percentileFromZ(z)).toBeCloseTo(c.p, 1);
      expect(classify(percentileFromZ(z), c.bmi)).toEqual({ category: c.category, caution: c.caution });
    });
  }

  it("종합 함수: 남 147개월 52.5kg 154cm → 76.3백분위, 해당 없음", () => {
    const r = assessChildBmi({ sex: "male", ageMonths: 147, weightKg: 52.5, heightCm: 154 });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.bmi).toBe(22.1);
    expect(r.percentileLabel).toBe("76.3");
    expect(r.verdict).toEqual({ category: "none", caution: false });
    expect(r.reference.p85).toBe(23.1);
    expect(r.whoRange).toBe(false);
  });
});

describe("3.4 판정 경계", () => {
  it("95 이상 비만, 85 이상 95 미만 과체중, 85 미만 해당 없음", () => {
    expect(classify(95, 20).category).toBe("obese");
    expect(classify(94.96, 20).category).toBe("obese"); // 표시값 95.0 과 일치
    expect(classify(94.94, 20).category).toBe("overweight");
    expect(classify(85, 20).category).toBe("overweight");
    expect(classify(84.9, 20).category).toBe("none");
  });

  it("주의 표시: 95 미만 + BMI 25 이상. 비만이면 플래그 없음", () => {
    expect(classify(60, 25).caution).toBe(true);
    expect(classify(90, 24.9).caution).toBe(false);
    expect(classify(97, 30).caution).toBe(false);
  });
});

describe("4. 예외 처리", () => {
  it("24개월 미만은 판정하지 않는다", () => {
    expect(assessChildBmi({ sex: "female", ageMonths: 23, weightKg: 12, heightCm: 85 }).status).toBe("under_24m");
  });

  it("228개월 이상은 범위 밖", () => {
    const r = assessChildBmi({ sex: "male", ageMonths: 228, weightKg: 70, heightCm: 175 });
    expect(r.status).toBe("over_range");
    if (r.status === "over_range") expect(r.bmi).toBe(22.9);
  });

  it("입력값 이상", () => {
    expect(assessChildBmi({ sex: "male", ageMonths: 100, weightKg: 0, heightCm: 130 })).toEqual({
      status: "invalid_input",
      reason: "weight_height",
    });
    expect(assessChildBmi({ sex: "male", ageMonths: -1, weightKg: 30, heightCm: 130 })).toEqual({
      status: "invalid_input",
      reason: "age",
    });
  });

  it("Z 가 ±3 을 넘는 극단값", () => {
    const hi = assessChildBmi({ sex: "male", ageMonths: 147, weightKg: 120, heightCm: 150 });
    expect(hi.status === "ok" && hi.percentileLabel).toBe("99.9 초과");
    const lo = assessChildBmi({ sex: "male", ageMonths: 147, weightKg: 20, heightCm: 160 });
    expect(lo.status === "ok" && lo.percentileLabel).toBe("0.1 미만");
  });

  it("35/36개월 경계는 WHO 구간 플래그로 표시한다", () => {
    const a = assessChildBmi({ sex: "female", ageMonths: 35, weightKg: 14, heightCm: 95 });
    const b = assessChildBmi({ sex: "female", ageMonths: 36, weightKg: 14, heightCm: 95 });
    expect(a.status === "ok" && a.whoRange).toBe(true);
    expect(b.status === "ok" && b.whoRange).toBe(false);
  });

  it("표가 비어 있으면 검사를 건너뛴다 (PLAN.md 8.3)", () => {
    const empty: BmiTable = { source: "", data: { "1": {}, "2": {} } };
    expect(assessChildBmi({ sex: "male", ageMonths: 100, weightKg: 30, heightCm: 130 }, empty).status).toBe(
      "table_missing",
    );
  });
});
