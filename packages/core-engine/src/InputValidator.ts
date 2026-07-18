import type { ValidationResult } from "./types";

/**
 * 완성된 음절 단위로만 채점하는 상태 기계(5.4절). keydown이 아니라
 * compositionend/input(웹) 또는 텍스트 diff(RN)로 확정된 전체 입력값을
 * validateSyllable()에 넘겨준다 — 조합 중간 상태는 이 클래스에 도달하지 않는다
 * (호출 시점 자체를 useComposedInput 훅이 걸러준다).
 */
export class InputValidator {
  private expectedText = "";
  private composedText = "";
  private isErrorStateFlag = false;
  private correctLength = 0;

  reset(expectedText: string): void {
    this.expectedText = expectedText;
    this.composedText = "";
    this.isErrorStateFlag = false;
    this.correctLength = 0;
  }

  getExpectedText(): string {
    return this.expectedText;
  }

  getComposedText(): string {
    return this.composedText;
  }

  isErrorState(): boolean {
    return this.isErrorStateFlag;
  }

  /**
   * 오답일 때 composedText는 틀린 꼬리 글자까지 포함한 전체 입력값이므로
   * (예: 기대 "오모테산도"에 "오모테산조"를 입력하면 composedText.length는 5로 정답과 같아진다),
   * UI가 글자별로 정답 하이라이트를 칠하려면 실제로 일치한 접두 길이(correctLength)가 필요하다.
   */
  getCorrectLength(): number {
    return this.correctLength;
  }

  getCompletionRate(): number {
    if (this.expectedText.length === 0) return 0;
    return this.composedText.length / this.expectedText.length;
  }

  /** value: hidden input의 현재 전체 값(확정된 상태). */
  validateSyllable(value: string): ValidationResult {
    this.composedText = value;

    let matched = 0;
    while (
      matched < value.length &&
      matched < this.expectedText.length &&
      value[matched] === this.expectedText[matched]
    ) {
      matched++;
    }

    this.correctLength = matched;

    if (matched < value.length) {
      // 입력값이 기대 문자열의 접두사가 아니다 — 오타.
      this.isErrorStateFlag = true;
      return { status: "error", correctLength: matched };
    }

    this.isErrorStateFlag = false;
    if (matched === this.expectedText.length) {
      return { status: "correct", correctLength: matched };
    }
    return { status: "progress", correctLength: matched };
  }
}
