# Agent Handoff Memory

Last updated: 2026-07-19

This file records the work completed during the parallel-agent implementation session so future agents such as Claude, Gemini, and Codex can recover context without reading the full conversation.

## Session summary

The user requested running three agents in parallel. Three independent workstreams were used:

1. Data pipeline: `data/`
2. Shared UI kit: `packages/ui-kit/`
3. FastAPI backend: `apps/api/`

The UI kit and API agents completed. The data pipeline agent failed because the session hit an API limit, so Codex finished that work directly and then ran integration verification.

No commit was created.

## Implemented changes

### `data/`

- Added a station-name generation/validation pipeline under `data/scripts/`.
- `generate-names.ts` exposes pure functions to enrich station data from kana and validate committed golden data.
- `cli.ts` implements dry-run validation and explicit `--write` regeneration.
- `validate-golden.test.ts` validates committed parsed station data.
- `name-overrides.ts` records curated station-name overrides.
- Added `data/package.json`, `data/tsconfig.json`, and `data/vitest.config.ts`.
- Added `data` to `pnpm-workspace.yaml`.

Important decision:

- The raw `kanaToRomaji()` converter does not infer official/curated word boundaries or hyphenation. For example, it generates values like `aoyamaitchome`, while committed data uses official/curated forms like `aoyama-itchome`.
- Do not “fix” this by blindly overwriting committed golden data. The current design explicitly stores these official/curated differences in `data/scripts/name-overrides.ts`.
- The golden validator compares committed data against generated values after applying overrides.

Useful commands:

```bash
pnpm --filter @metro-typing/data test
pnpm --filter @metro-typing/data typecheck
pnpm --filter @metro-typing/data validate:names
pnpm --filter @metro-typing/data generate:names
```

Expected current result:

- Data tests: 10 passed
- Golden validation: pass
- `generate:names`: reports `불일치 0건`

### `packages/ui-kit/`

- Added shared UI primitives:
  - `Button`
  - `ProgressBar`
  - `Text`
  - `Heading`
  - `tokens`
- Added package-local TypeScript/Vitest config and tests.
- Exported the new primitives from `packages/ui-kit/src/index.ts`.

Useful commands:

```bash
pnpm --filter @metro-typing/ui-kit test
pnpm --filter @metro-typing/ui-kit typecheck
```

Expected current result:

- UI kit tests: 19 passed
- Typecheck: pass

### `apps/api/`

- Added FastAPI app structure:
  - config/deps
  - schemas
  - in-memory store abstraction
  - routers for health, auth, runs, rankings
  - anti-cheat service
- Added tests for:
  - health
  - auth/session
  - run start/complete
  - anti-cheat
  - rankings and personal bests
- Kept unresolved product/security choices explicit rather than pretending they are decided:
  - nickname uniqueness
  - JWT vs cookie/session policy
  - durable device identity
  - production DB/Redis persistence

Useful commands:

```bash
cd apps/api && uv run pytest
cd apps/api && uv run ruff check app tests
cd apps/api && uv run mypy app tests
```

Expected current result:

- Pytest: 23 passed, with one FastAPI/Starlette deprecation warning from `fastapi.testclient`
- Ruff: pass
- Mypy: pass

## Integration verification already run

These passed after the work was integrated:

```bash
pnpm test
pnpm typecheck
```

Observed current results:

- `pnpm test`: turbo reported 8 successful tasks
- `pnpm typecheck`: turbo reported 9 successful tasks

API verification also passed:

```bash
cd apps/api && uv run pytest
cd apps/api && uv run ruff check app tests
cd apps/api && uv run mypy app tests
```

## Environment notes

- The sandbox initially blocked `uv` because it tried to access `~/.cache/uv`. The command prefix `["uv", "run"]` was approved during the session.
- `pnpm --filter @metro-typing/data add -D vite-node@2.1.9` was attempted but stopped because pnpm wanted network registry access and the sandbox had restricted network.
- Instead of adding a new direct dependency, `data/package.json` currently calls the already-installed workspace `vite-node` binary by path:

```json
"generate:names": "node ../node_modules/.pnpm/node_modules/vite-node/vite-node.mjs scripts/cli.ts"
```

If dependencies are reinstalled or cleaned later, prefer making `vite-node` a proper devDependency of `@metro-typing/data` instead of relying on that path.

## Current working-tree expectation

The session intentionally left changes uncommitted.

Expected modified/added areas:

- `apps/api/`
- `data/`
- `packages/ui-kit/`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`

Future agents should not assume these changes have been committed unless `git log` shows a commit after this handoff.
