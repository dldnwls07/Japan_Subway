import { useEffect, useRef, type CSSProperties } from "react";
import { useComposedInput } from "@metro-typing/core-engine";

interface TypingInputProps {
  expectedText: string;
  correctLength: number;
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

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, [expectedText]);

  return (
    <div>
      <div style={getExpectedTextStyle(isErrorState)} aria-live="polite">
        {[...expectedText].map((char, i) => (
          <span key={i} style={i < correctLength ? HIGHLIGHT_STYLE : undefined}>
            {char}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        disabled={disabled}
        aria-label="역 이름 입력"
        placeholder="여기에 역 이름을 입력하세요"
        style={getInputFieldStyle(isErrorState)}
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

// Styling Constants & Helpers
const getExpectedTextStyle = (isErrorState: boolean): CSSProperties => ({
  fontSize: 28,
  letterSpacing: 2,
  fontFamily: "monospace",
  color: isErrorState ? "#f87171" : "#e5e7eb",
});

const getInputFieldStyle = (isErrorState: boolean): CSSProperties => ({
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
});

const HIGHLIGHT_STYLE: CSSProperties = {
  color: "#22d3ee",
};
