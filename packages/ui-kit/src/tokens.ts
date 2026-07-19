// apps/web의 인라인 스타일에서 반복적으로 쓰이던 색·간격·타이포 값을 한곳에 모은 디자인 토큰.
// 웹·모바일이 공유하는 단일 소스이며, 새 컴포넌트는 하드코딩 대신 이 값을 참조한다.

export const tokens = {
  color: {
    /** 앱 기본 배경 (#111827) */
    background: "#111827",
    /** 카드·입력창 표면 (#1f2937) */
    surface: "#1f2937",
    /** 더 깊은 배경 — 지도 등 (#0b1220) */
    surfaceDeep: "#0b1220",
    /** 주 강조색 — 진행/포커스 (#22d3ee) */
    accent: "#22d3ee",
    /** 노선 브랜드색 — 긴자선 오렌지 (#f39800) */
    line: "#f39800",
    /** 오류/경고 (#f87171) */
    danger: "#f87171",
    /** 본문 텍스트 (#e5e7eb) */
    text: "#e5e7eb",
    /** 강조 텍스트 (#f9fafb) */
    textStrong: "#f9fafb",
    /** 흐린 텍스트·비활성 (#4b5563) */
    muted: "#4b5563",
  },
  /** px 단위 폰트 크기 스케일 (웹 앱에서 실제로 쓰인 값 기준) */
  fontSize: {
    sm: 11,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 34,
  },
  /** px 단위 간격 스케일 */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 8,
    md: 12,
  },
  fontFamily: {
    sans: "sans-serif",
    mono: "monospace",
  },
} as const;

export type FontSize = keyof typeof tokens.fontSize;
export type ColorToken = keyof typeof tokens.color;
