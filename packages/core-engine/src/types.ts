export interface NameMap {
  kanji: string;
  kana: string;
  romaji: string;
  hangul: string;
}

export interface Station {
  stationId: string;
  coordinates: [number, number]; // [경도, 위도] WGS84
  sequence: number;
  names: NameMap;
}

export type GameMode = "rapid_30s" | "speed_run" | "marathon";

export interface GameStats {
  elapsedMs: number;
  keystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  accuracy: number; // 0.0 ~ 1.0
  wpm: number;
  cpm: number;
  stationsCleared: number;
}

export type ValidationStatus = "progress" | "correct" | "error";

export interface ValidationResult {
  status: ValidationStatus;
  correctLength: number; // expectedText와 일치하는 접두 길이
}

export type GamePhase = "idle" | "running" | "finished";

export interface GameSnapshot {
  phase: GamePhase;
  mode: GameMode;
  targetIndex: number;
  currentStation: Station | null;
  composedText: string;
  correctLength: number; // expectedText와 실제로 일치한 접두 길이 — 글자별 하이라이트에 사용
  isErrorState: boolean;
  stats: GameStats;
}
