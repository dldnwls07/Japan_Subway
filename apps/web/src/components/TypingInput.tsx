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
 * IME 조합은 실제 input에 위임하고, 목표 문구는 글자별 하이라이트로 보여준다.
 */
export function TypingInput({
  expectedText,
  correctLength,
  isErrorState,
  disabled,
  onSettledChange,
  onRawKeystroke,
}: TypingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleCompositionStart, handleCompositionEnd, handleInput, handleKeyDown } = useComposedInput({
    onSettledChange,
    onRawKeystroke,
  });

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, expectedText]);

  // 역이 바뀌면(expectedText 변경) input 값도 비워 다음 역 입력을 새로 받는다.
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
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
        ref={inputRef}
        disabled={disabled}
        aria-label="역 이름 입력"
        placeholder="여기에 역 이름을 입력하세요"
        style={{
          boxSizing: "border-box",
          width: "min(100%, 440px)",
          marginTop: 12,
          padding: "12px 14px",
          border: `2px solid ${isErrorState ? "#f87171" : "#22d3ee"}`,
          borderRadius: 8,
          background: "#1f2937",
          color: "#f9fafb",
          fontSize: 20,
          outline: "none",
        }}
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
