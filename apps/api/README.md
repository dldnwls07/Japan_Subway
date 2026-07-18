# apps/api

Phase 1+ 대상 (Python FastAPI 랭킹/스코어 백엔드, `backend-spec.md`·`api-spec.md` 참고).
Phase 0 범위(번역 엔진 + 긴자선 게임 루프)에는 백엔드가 필요하지 않아, 지금은
`devops-deployment.md` 폴더 구조를 맞추는 자리 표시자 + 헬스체크 엔드포인트만 있다.

착수 전 확정해야 할 것 (kickoff-prompt.md 미해결 항목):

- `device_id` 기반 인증에서 계정 공유·탈취로 인한 리더보드 오염 방지책
- 닉네임 유니크 정책, 소셜 로그인 도입 여부·시점

## 로컬 실행

```bash
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
# http://localhost:8000/api/v1/health
```
