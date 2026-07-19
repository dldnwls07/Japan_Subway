import type { CSSProperties, ReactNode } from "react";
import { type FontSize, tokens } from "./tokens";

type TextElement = "span" | "p" | "div" | "label";

export interface TextProps {
  /** 렌더링할 태그. 기본 span. */
  as?: TextElement;
  /** 토큰 폰트 스케일. 기본 md. */
  size?: FontSize;
  /** 텍스트 색. 기본 본문 색. */
  color?: string;
  /** monospace 폰트 사용 여부(점수판 등). */
  mono?: boolean;
  weight?: CSSProperties["fontWeight"];
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * 인라인/블록 텍스트 프리미티브. size 토큰과 색을 일관되게 적용한다.
 */
export function Text({
  as: Tag = "span",
  size = "md",
  color = tokens.color.text,
  mono = false,
  weight,
  className,
  style,
  children,
}: TextProps) {
  return (
    <Tag
      className={className}
      style={{
        fontSize: tokens.fontSize[size],
        color,
        fontFamily: mono ? tokens.fontFamily.mono : tokens.fontFamily.sans,
        fontWeight: weight,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export type HeadingLevel = 1 | 2 | 3;

export interface HeadingProps {
  /** h1~h3. 기본 2. */
  level?: HeadingLevel;
  /** 폰트 크기 토큰 override. 지정하지 않으면 level에 따라 정해진다. */
  size?: FontSize;
  color?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const levelSize: Record<HeadingLevel, FontSize> = {
  1: "xxl",
  2: "xl",
  3: "lg",
};

/**
 * 시맨틱 제목(h1~h3). level에 맞는 토큰 크기를 기본 적용하되 size로 덮어쓸 수 있다.
 */
export function Heading({
  level = 2,
  size,
  color = tokens.color.textStrong,
  className,
  style,
  children,
}: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={className}
      style={{
        fontSize: tokens.fontSize[size ?? levelSize[level]],
        color,
        fontFamily: tokens.fontFamily.sans,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
