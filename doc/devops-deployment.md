# DevOps / 배포 명세

> 상위 문서: 개발계획서 2.2절(형상 관리), 9장(배포 계획), 14.4절(백엔드 배포)의 구현 상세.

## 1. 로컬 개발 — 전체 스택 한 번에 띄우기

```yaml
# docker-compose.yml (레포 루트)
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: metrotyping
      POSTGRES_PASSWORD: metrotyping
      POSTGRES_DB: metrotyping
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U metrotyping"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    env_file: ./apps/api/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    ports: ["8000:8000"]
    volumes: ["./apps/api:/app"]

volumes:
  pgdata:
```

```bash
docker compose up -d          # DB + Redis + API 기동
pnpm install                  # JS 워크스페이스 의존성
pnpm --filter web dev         # 웹 개발 서버
pnpm --filter mobile start    # Expo 개발 서버
```

## 2. GitHub Actions — 워크스페이스별 CI 분리

모노레포이므로 변경된 경로(`paths:`)에 따라 필요한 파이프라인만 실행해 CI 시간을 절약한다.

```yaml
# .github/workflows/web-mobile-ci.yml
name: Web & Mobile CI
on:
  pull_request:
    paths: ["apps/web/**", "apps/mobile/**", "packages/**"]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test
```

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI
on:
  pull_request:
    paths: ["apps/api/**"]
  push:
    branches: [main]
    paths: ["apps/api/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: cd apps/api && uv sync
      - run: cd apps/api && uv run ruff check .
      - run: cd apps/api && uv run mypy .
      - run: cd apps/api && uv run pytest --cov=app
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379/0

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master
      - run: cd apps/api && flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

브랜치 전략은 2.2절 GitHub Flow를 그대로 따른다: `main` 병합 = 자동 배포 트리거.

## 3. Dockerfile (FastAPI)

```dockerfile
# apps/api/Dockerfile
FROM python:3.12-slim AS base
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

## 4. 배포 대상: Fly.io 예시 (14.4절 — Railway/Render도 동등한 대안)

```toml
# apps/api/fly.toml
app = "metrotyping-api"
primary_region = "nrt"   # 도쿄 리전 — 일본 사용자 지연시간 최소화

[build]

[env]
  PORT = "8000"
  ENV = "production"

[[services]]
  internal_port = 8000
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0   # 저트래픽 구간엔 완전히 내려 비용 절감 (12장 예산과 연계)

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[[services.http_checks]]
  path = "/api/v1/health"
  interval = "30s"
  timeout = "5s"
```

```bash
flyctl launch --no-deploy         # 최초 1회
flyctl secrets set DATABASE_URL=... JWT_SECRET=... REDIS_URL=...
flyctl deploy
```

## 5. 웹/모바일 배포 (9장 내용의 실행 스크립트화)

```yaml
# .github/workflows/mobile-release.yml (발췌)
name: Mobile Release
on:
  push:
    tags: ["mobile-v*"]

jobs:
  eas-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: cd apps/mobile && eas build --platform all --non-interactive --auto-submit
```

```yaml
# .github/workflows/web-deploy.yml (발췌 — Vercel 예시)
name: Web Deploy
on:
  push:
    branches: [main]
    paths: ["apps/web/**", "packages/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile && pnpm --filter web build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web
          vercel-args: "--prod"
```

## 6. 환경 구성 요약

| 환경 | 웹 | 백엔드 | DB/Redis |
|---|---|---|---|
| 로컬 | Vite dev server | uvicorn --reload | docker-compose |
| 프리뷰(PR) | Vercel Preview 자동 생성 | (선택) PR별 임시 배포 안 함 — 로컬 검증으로 대체 | - |
| 프로덕션 | Vercel/Cloudflare Pages | Fly.io (nrt 리전) | Supabase/Neon Postgres, Upstash Redis |

## 7. 시크릿 관리

- GitHub Actions: `Settings > Secrets and variables > Actions`에 `FLY_API_TOKEN`, `EXPO_TOKEN`, `VERCEL_TOKEN`, `DATABASE_URL`, `JWT_SECRET` 등록.
- 로컬: `.env`는 `.gitignore`에 반드시 포함, `.env.example`만 커밋(backend-spec.md 2절 참고).
- 절대 `apps/api/app/config.py`나 코드에 시크릿을 하드코딩하지 않는다 — `pydantic-settings`로 환경변수만 읽는다.
