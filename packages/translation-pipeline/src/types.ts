export interface StationNameConversion {
  stationId: string;
  kanji: string;
  kana: string; // kuroshiro 1단계 산출물
  romaji: string;
  hangul: string; // 2단계 자체 변환기 산출물
  isException: boolean; // 정규화 사전에서 온 예외 표기 여부
}

export interface NormalizationRule {
  pattern: string; // 정확히 일치할 부분 문자열 또는 정규식 소스
  type: "exact" | "regex";
  replacement: string;
  reason: string;
}

export type SokuonAssimilationRule = readonly [consonantGroup: readonly string[], mapping: string];
