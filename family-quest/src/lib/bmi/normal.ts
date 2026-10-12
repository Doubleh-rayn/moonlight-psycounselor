/**
 * 표준정규 누적분포함수 Φ(z).
 * JavaScript 에 내장 함수가 없어 erf 근사식(Abramowitz & Stegun 7.1.26, 최대 오차 1.5e-7)을 쓴다.
 * 백분위수를 소수 첫째 자리까지만 표시하므로 이 정밀도로 충분하다.
 */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Φ(z) = 0.5 × (1 + erf(z / √2)) */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}
