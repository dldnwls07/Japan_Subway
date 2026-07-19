import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { tokens } from "./tokens";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 시각적 강조 수준. 기본값은 primary. */
  variant?: ButtonVariant;
}

const baseStyle: CSSProperties = {
  fontFamily: tokens.fontFamily.sans,
  fontSize: tokens.fontSize.md,
  padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
  borderRadius: tokens.radius.sm,
  border: "2px solid transparent",
  cursor: "pointer",
  lineHeight: 1.2,
};

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: tokens.color.accent,
    color: tokens.color.surfaceDeep,
    borderColor: tokens.color.accent,
  },
  secondary: {
    background: "transparent",
    color: tokens.color.accent,
    borderColor: tokens.color.accent,
  },
};

const disabledStyle: CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.5,
};

/**
 * 공유 버튼. variant(primary/secondary), disabled를 지원하고 나머지 button 속성은
 * 그대로 전달한다. disabled 상태에서는 브라우저가 클릭을 막으므로 onClick도 호출되지 않는다.
 */
export function Button({
  variant = "primary",
  disabled = false,
  type = "button",
  style,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...variantStyle[variant],
        ...(disabled ? disabledStyle : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
