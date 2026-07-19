// @metro-typing/api-client — FastAPI 백엔드(apps/api)와 통신하는 타입 안전 클라이언트.
export type {
  CompleteRunRequest,
  CompleteRunResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  ErrorEnvelope,
  HealthResponse,
  LeaderboardItem,
  LeaderboardResponse,
  Mode,
  Period,
  PersonalBest,
  RankingsMeResponse,
  RankingsQuery,
  StartRunRequest,
  StartRunResponse,
} from "./types";

import type {
  CompleteRunRequest,
  CompleteRunResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  ErrorEnvelope,
  HealthResponse,
  LeaderboardResponse,
  RankingsMeResponse,
  RankingsQuery,
  StartRunRequest,
  StartRunResponse,
} from "./types";

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface MetroTypingApiClientOptions {
  /** Base API URL including version path, e.g. http://localhost:8000/api/v1. */
  baseUrl?: string;
  accessToken?: string;
  fetch?: FetchLike;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly body: unknown;

  constructor(status: number, code: string, message: string, body: unknown, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.details = details;
  }
}

export class MetroTypingApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private accessToken: string | undefined;

  constructor(options: MetroTypingApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetch ?? fetch.bind(globalThis);
  }

  setAccessToken(accessToken: string | undefined): void {
    this.accessToken = accessToken;
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  createSession(payload: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.request<CreateSessionResponse>("/auth/session", {
      method: "POST",
      body: payload,
    });
  }

  startRun(payload: StartRunRequest): Promise<StartRunResponse> {
    return this.request<StartRunResponse>("/runs/start", {
      method: "POST",
      body: payload,
      auth: true,
    });
  }

  completeRun(payload: CompleteRunRequest): Promise<CompleteRunResponse> {
    return this.request<CompleteRunResponse>("/runs/complete", {
      method: "POST",
      body: payload,
      auth: true,
    });
  }

  getRankings(query: RankingsQuery): Promise<LeaderboardResponse> {
    return this.request<LeaderboardResponse>("/rankings", {
      query: {
        line_id: query.line_id,
        mode: query.mode,
        period: query.period,
        limit: query.limit,
        offset: query.offset,
      },
    });
  }

  getMyRankings(): Promise<RankingsMeResponse> {
    return this.request<RankingsMeResponse>("/rankings/me", { auth: true });
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
      auth?: boolean;
    } = {}
  ): Promise<T> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { Accept: "application/json" };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options.auth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await this.fetchImpl(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const body = await readJson(response);
    if (!response.ok) {
      const error = parseErrorEnvelope(body);
      throw new ApiError(response.status, error.code, error.message, body, error.details);
    }

    return body as T;
  }

  private url(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

export function createMetroTypingApiClient(options?: MetroTypingApiClientOptions): MetroTypingApiClient {
  return new MetroTypingApiClient(options);
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseErrorEnvelope(body: unknown): ErrorEnvelope["error"] {
  if (isRecord(body) && isRecord(body.error)) {
    const code = typeof body.error.code === "string" ? body.error.code : "http_error";
    const message = typeof body.error.message === "string" ? body.error.message : "요청에 실패했습니다.";
    return { code, message, details: body.error.details };
  }

  return {
    code: "http_error",
    message: "요청에 실패했습니다.",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
