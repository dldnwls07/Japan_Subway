import { describe, expect, it } from "vitest";
import { InputValidator } from "../src/InputValidator";

describe("InputValidator", () => {
  it("입력이 기대 문자열의 접두사면 progress를 반환한다", () => {
    const v = new InputValidator();
    v.reset("신주쿠");
    const result = v.validateSyllable("신주");
    expect(result).toEqual({ status: "progress", correctLength: 2 });
    expect(v.isErrorState()).toBe(false);
  });

  it("입력이 기대 문자열과 정확히 일치하면 correct를 반환한다", () => {
    const v = new InputValidator();
    v.reset("신주쿠");
    const result = v.validateSyllable("신주쿠");
    expect(result).toEqual({ status: "correct", correctLength: 3 });
  });

  it("접두사가 아니면 error와 함께 마지막 일치 지점을 반환한다", () => {
    const v = new InputValidator();
    v.reset("신주쿠");
    const result = v.validateSyllable("신저");
    expect(result).toEqual({ status: "error", correctLength: 1 });
    expect(v.isErrorState()).toBe(true);
  });

  it("reset() 이후 이전 상태를 초기화한다", () => {
    const v = new InputValidator();
    v.reset("긴자");
    v.validateSyllable("긴재");
    expect(v.isErrorState()).toBe(true);
    v.reset("교바시");
    expect(v.isErrorState()).toBe(false);
    expect(v.getComposedText()).toBe("");
  });

  it("오타의 꼬리 글자가 기대 문자열과 길이가 같아도 correctLength는 실제 일치분만 센다", () => {
    // 회귀 테스트: 브라우저 수동 검증 중 발견한 버그. "오모테산도"(5자)에 "오모테산조"(5자,
    // 마지막 글자만 오타)를 입력하면 composedText.length는 expectedText.length와 같아져
    // UI가 전체를 정답처럼 칠하는 문제가 있었다. correctLength는 실제 일치한 접두 길이(4)여야 한다.
    const v = new InputValidator();
    v.reset("오모테산도");
    v.validateSyllable("오모테산조");
    expect(v.isErrorState()).toBe(true);
    expect(v.getCorrectLength()).toBe(4);
    expect(v.getComposedText().length).toBe(5); // 참고: composedText 자체는 여전히 5자다
  });
});
