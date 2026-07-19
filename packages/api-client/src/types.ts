// 백엔드(apps/api) FastAPI 앱의 실제 Pydantic 스키마(app/schemas.py)를 그대로 옮긴 wire 타입.
// api-spec.md는 "코드의 Pydantic 스키마가 문서보다 우선"이라고 명시하므로 이 파일은
// app/schemas.py를 기준으로 한다. 필드 이름은 서버와 동일한 snake_case를 유지해
// 별도 변환 계층 없이 계약을 투명하게 드러낸다. UUID는 JSON 직렬화 후 문자열이다.

export type Mode = "rapid_30s" | "speed_run" | "marathon";
export type Period = "all" | "daily" | "weekly";

// --- auth: POST /api/v1/auth/session ----------------------------------------
export interface CreateSessionRequest {
  /** null/생략 시 서버가 새 device를 발급한다 (현재 서버는 항상 새 device를 만든다). */
  device_id?: string | null;
  /** 1~20자. */
  nickname: string;
}

export interface CreateSessionResponse {
  device_id: string;
  nickname: string;
  access_token: string;
  token_type: "bearer";
}

// --- runs: POST /api/v1/runs/start · /api/v1/runs/complete -------------------
export interface StartRunRequest {
  line_id: string;
  mode: Mode;
}

export interface StartRunResponse {
  run_token: string;
  /** run_token 유효시간(초). 기본 600. */
  expires_in: number;
}

export interface CompleteRunRequest {
  run_token: string;
  /** 0보다 큰 정수(ms). */
  duration_ms: number;
  /** 0 이상 정수 — 물리 keydown 수. */
  keystrokes: number;
  /** 0.0 ~ 1.0 (퍼센트가 아니라 비율). */
  accuracy: number;
}

export interface CompleteRunResponse {
  run_id: string;
  /** 서버 판정 wpm = cpm / 5 (5타 ≈ 1단어 근사). 클라이언트 음절 기반 wpm과 다를 수 있다. */
  wpm: number;
  cpm: number;
  /** 해당 라인·모드 리더보드에서 이 기기의 현재 순위(1부터). */
  rank: number;
  /** 안티치트 리뷰 대상으로 플래그되면 false. */
  verified: boolean;
}

// --- rankings: GET /api/v1/rankings · /api/v1/rankings/me --------------------
export interface RankingsQuery {
  line_id: string;
  mode: Mode;
  /** 기본 "all". daily/weekly 윈도잉은 아직 서버에서 no-op 스텁이다. */
  period?: Period;
  /** 1~100, 기본 50. */
  limit?: number;
  /** 0 이상, 기본 0. */
  offset?: number;
}

export interface LeaderboardItem {
  rank: number;
  nickname: string;
  wpm: number;
  accuracy: number;
  /** ISO 8601 datetime 문자열. */
  created_at: string;
}

export interface LeaderboardResponse {
  line_id: string;
  mode: Mode;
  period: Period;
  total: number;
  items: LeaderboardItem[];
}

export interface PersonalBest {
  line_id: string;
  mode: Mode;
  wpm: number;
  rank: number;
}

export interface RankingsMeResponse {
  device_id: string;
  personal_bests: PersonalBest[];
}

// --- health: GET /api/v1/health ----------------------------------------------
export interface HealthResponse {
  status: string;
  db: string;
  redis: string;
  version: string;
}

// --- 공통 에러 봉투 -----------------------------------------------------------
/** HTTPException 계열 오류 응답 본문: {"error": {"code", "message"}}. */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
