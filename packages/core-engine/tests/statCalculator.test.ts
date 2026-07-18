import { describe, expect, it } from "vitest";
import { calculateAccuracy, calculateCpm, calculateWpm } from "../src/statCalculator";

describe("statCalculator", () => {
  it("calculateCpm: 60초에 300타면 CPM 300", () => {
    expect(calculateCpm(300, 60_000)).toBeCloseTo(300);
  });

  it("calculateCpm: 경과 시간이 0이면 0을 반환한다", () => {
    expect(calculateCpm(100, 0)).toBe(0);
  });

  it("calculateAccuracy: 전체 입력이 0이면 정확도 1로 취급한다", () => {
    expect(calculateAccuracy(0, 0)).toBe(1);
  });

  it("calculateAccuracy: 정답/전체 비율을 0~1 사이로 반환한다", () => {
    expect(calculateAccuracy(9, 10)).toBeCloseTo(0.9);
  });

  it("calculateWpm: 완성 음절 수를 음절당 평균값으로 나눠 분당 단어수를 근사한다", () => {
    // 25음절을 1분에 입력 -> 25 / 2.5 = 10 단어/분
    expect(calculateWpm(25, 60_000)).toBeCloseTo(10);
  });
});
