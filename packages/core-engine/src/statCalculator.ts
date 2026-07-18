/**
 * 8절(CPM 계산 공식): CPM = 유효 키 입력 수 ÷ 경과 시간(분).
 * WPM은 한글 타자 관행에 맞춰 "타수/5"가 아니라 완성 음절 수 기준으로 근사한다
 * (2음절 내외 평균 한국어 단어 길이 관행치인 2.5음절/word를 사용).
 */
const KOREAN_SYLLABLES_PER_WORD = 2.5;

export function calculateCpm(correctKeystrokes: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const elapsedMinutes = elapsedMs / 60_000;
  return correctKeystrokes / elapsedMinutes;
}

export function calculateWpm(correctSyllables: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const elapsedMinutes = elapsedMs / 60_000;
  return correctSyllables / KOREAN_SYLLABLES_PER_WORD / elapsedMinutes;
}

export function calculateAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 1;
  return Math.max(0, Math.min(1, correctKeystrokes / totalKeystrokes));
}
