import type { CSSProperties } from "react";
import { tokens } from "./tokens";

export interface ProgressBarProps {
  /** 현재 값. max와 함께 채움 비율을 결정한다. */
  value: number;
  /** 최댓값. 기본 1이라 0..1 비율을 그대로 넘길 수 있다. */
  max?: number;
  /** 스크린리더용 라벨. */
  label?: string;
  /** 채움 색. 기본은 강조색. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

function clamp(value: number, min: number, upper: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), upper);
}

/**
 * 0..max 값을 가로 막대로 표시한다. 범위를 벗어난 값은 잘라내고(clamp),
 * max가 0 이하이면 0으로 처리해 0 나눗셈을 피한다. role="progressbar"와
 * aria-valuenow/min/max를 노출해 접근성을 확보한다.
 */
export function ProgressBar({
  value,
  max = 1,
  label,
  color = tokens.color.accent,
  className,
  style,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 0;
  const clamped = safeMax === 0 ? 0 : clamp(value, 0, safeMax);
  const ratio = safeMax === 0 ? 0 : clamped / safeMax;
  const percent = `${ratio * 100}%`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      className={className}
      style={{
        width: "100%",
        height: tokens.space.sm,
        background: tokens.color.muted,
        borderRadius: tokens.radius.sm,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        data-testid="progress-fill"
        style={{
          width: percent,
          height: "100%",
          background: color,
          borderRadius: "inherit",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
