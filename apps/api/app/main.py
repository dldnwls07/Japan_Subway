from fastapi import FastAPI

# Phase 1+ 대상 (backend-spec.md). 현재는 헬스체크만 있다 — DB/Redis, runs/rankings/auth
# 라우터는 아직 연결되지 않았다. kickoff-prompt.md의 미해결 항목(device_id 인증, 닉네임
# 유니크 정책)이 확정된 뒤 §4의 라우터들을 구현한다.
app = FastAPI(title="metro-typing-api")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "db": "not_connected", "redis": "not_connected", "version": "0.0.1"}
