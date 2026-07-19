// @metro-typing/ui-kit — 웹·모바일이 공유하는 프레젠테이션 전용 디자인 시스템.
// React에만 의존하며, apps/web의 인라인 스타일에서 반복되던 버튼/프로그레스 바/타이포
// 패턴을 재사용 가능한 컴포넌트와 토큰으로 추출한 것이다.
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant } from "./Button";

export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps } from "./ProgressBar";

export { Text, Heading } from "./Typography";
export type { TextProps, HeadingProps, HeadingLevel } from "./Typography";

export { tokens } from "./tokens";
export type { FontSize, ColorToken } from "./tokens";
