import { describe, expect, it, vi } from "vitest";
import { ApiError, createMetroTypingApiClient, MetroTypingApiClient, type FetchLike } from "../src";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("MetroTypingApiClient", () => {
  it("creates a session with JSON headers and body", async () => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      jsonResponse(
        {
          device_id: "device-1",
          nickname: "우진",
          access_token: "token-1",
          token_type: "bearer",
        },
        { status: 201 }
      )
    );
    const client = createMetroTypingApiClient({
      baseUrl: "http://api.test/api/v1/",
      fetch: fetchMock,
    });

    const result = await client.createSession({ device_id: null, nickname: "우진" });

    expect(result.access_token).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/auth/session", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_id: null, nickname: "우진" }),
    });
  });

  it("adds bearer auth for authenticated endpoints", async () => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      jsonResponse({ run_token: "run-token-1", expires_in: 600 }, { status: 201 })
    );
    const client = new MetroTypingApiClient({
      baseUrl: "http://api.test/api/v1",
      accessToken: "access-token-1",
      fetch: fetchMock,
    });

    await client.startRun({ line_id: "tokyo-metro-ginza", mode: "speed_run" });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/v1/runs/start", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer access-token-1",
      },
      body: JSON.stringify({ line_id: "tokyo-metro-ginza", mode: "speed_run" }),
    });
  });

  it("serializes ranking query parameters and omits undefined values", async () => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      jsonResponse({
        line_id: "tokyo-metro-ginza",
        mode: "speed_run",
        period: "all",
        total: 0,
        items: [],
      })
    );
    const client = new MetroTypingApiClient({
      baseUrl: "http://api.test/api/v1",
      fetch: fetchMock,
    });

    await client.getRankings({
      line_id: "tokyo-metro-ginza",
      mode: "speed_run",
      period: undefined,
      limit: 25,
      offset: 0,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/rankings?line_id=tokyo-metro-ginza&mode=speed_run&limit=25&offset=0",
      {
        method: "GET",
        headers: { Accept: "application/json" },
        body: undefined,
      }
    );
  });

  it("throws ApiError for the server error envelope", async () => {
    const fetchMock = vi.fn<FetchLike>(async () =>
      jsonResponse(
        {
          error: {
            code: "line_not_found",
            message: "존재하지 않는 노선입니다.",
            details: [{ loc: ["body", "line_id"] }],
          },
        },
        { status: 404 }
      )
    );
    const client = new MetroTypingApiClient({
      baseUrl: "http://api.test/api/v1",
      fetch: fetchMock,
    });

    await expect(client.startRun({ line_id: "missing", mode: "speed_run" })).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      code: "line_not_found",
      message: "존재하지 않는 노선입니다.",
      details: [{ loc: ["body", "line_id"] }],
    } satisfies Partial<ApiError>);
  });
});
