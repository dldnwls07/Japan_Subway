import { useEffect, useRef } from "react";
import { useComposedInput } from "@metro-typing/core-engine";

interface TypingInputProps {
  expectedText: string;
  correctLength: number; // 실제로 일치한 접두 길이 — 오타의 꼬리 글자까지 정답으로 칠하지 않기 위해 composedText.length 대신 사용
  isErrorState: boolean;
  disabled: boolean;
  onSettledChange: (value: string) => void;
  onRawKeystroke: () => void;
}

/**
 * mobile-spec.md §2 그대로: 실제 IME 조합은 화면에 보이지 않는 hidden input에 위임하고,
 * 화면에는 커스텀 렌더링(글자별 하이라이트)만 보여준다.
 */
export function TypingInput({
  expectedText,
  correctLength,
  isErrorState,
  disabled,
  onSettledChange,
  onRawKeystroke,
}: TypingInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const { handleCompositionStart, handleCompositionEnd, handleInput, handleKeyDown } = useComposedInput({
    onSettledChange,
    onRawKeystroke,
  });

  useEffect(() => {
    if (!disabled) hiddenInputRef.current?.focus();
  }, [disabled, expectedText]);

  // 역이 바뀌면(expectedText 변경) hidden input 값도 비워 다음 역 입력을 새로 받는다.
  useEffect(() => {
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
  }, [expectedText]);

  return (
    <div>
      <div
        style={{
          fontSize: 28,
          letterSpacing: 2,
          fontFamily: "monospace",
          color: isErrorState ? "#f87171" : "#e5e7eb",
        }}
        aria-live="polite"
      >
        {[...expectedText].map((char, i) => (
          <span key={i} style={{ color: i < correctLength ? "#22d3ee" : undefined }}>
            {char}
          </span>
        ))}
      </div>
      <input
        ref={hiddenInputRef}
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
