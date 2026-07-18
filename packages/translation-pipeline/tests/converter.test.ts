import { describe, it, expect } from "vitest";
import goldenSet from "../__fixtures__/nikl-golden-set.json";
import { kanaToHangul } from "../src/converter";

describe("kanaToHangul — 골든 데이터셋 회귀 테스트", () => {
  for (const entry of goldenSet) {
    it(`${entry.kanji} (${entry.kana}) -> ${entry.expected_hangul}`, () => {
      expect(kanaToHangul(entry.kana)).toBe(entry.expected_hangul);
    });
  }
});

describe("kanaToHangul — 규칙 단위 테스트", () => {
  it("어두 파열음은 예사소리로 표기한다 (규칙 1)", () => {
    expect(kanaToHangul("かめ")).toBe("가메"); // 어두 か -> 가
  });

  it("어중 파열음은 거센소리로 표기한다 (규칙 1)", () => {
    expect(kanaToHangul("さかな")).toBe("사카나"); // 어중 か -> 카
  });

  it("촉음은 뒤 자음과 무관하게 항상 ㅅ받침으로 통일한다 (규칙 2, tables.ts 주석 참고)", () => {
    // さっぽろ(삿포로)가 골든 데이터셋에서 이미 이 규칙을 검증한다. 여기서는
    // か행(ㄱ 계열) 뒤에서도 동화 없이 ㅅ받침이 유지되는지 별도로 확인한다.
    expect(kanaToHangul("がっこう")).toBe("갓코");
  });

  it("발음(ん)은 뒤 음소와 무관하게 ㄴ받침으로 통일한다 (규칙 2)", () => {
    expect(kanaToHangul("しんばし")).toBe("신바시");
  });

  it("장모음(おう)은 표기 시 절삭한다 (규칙 3)", () => {
    expect(kanaToHangul("とうきょう")).toBe("도쿄");
  });

  it("장모음(おお)은 표기 시 절삭한다 (규칙 3)", () => {
    expect(kanaToHangul("おおさか")).toBe("오사카");
  });

  it("공항은 의미역을 적용한다 (규칙 4, 정규화 사전)", () => {
    expect(kanaToHangul("はねだくうこう")).toBe("하네다공항");
  });
});
