// 모노레포 루트 ESLint flat config (ESLint 10).
//
// - 각 패키지의 `lint` 스크립트는 `eslint .`로 실행되며, ESLint 10은 린트 대상 파일
//   위치에서 위로 올라가며 이 파일을 찾는다 (flat config 기본 동작).
// - type-checked 프리셋은 의도적으로 쓰지 않는다 — 속도와 노이즈 관리 (Phase 1 결정).
//   타입 기반 검증은 `pnpm typecheck`(tsc --noEmit)가 담당한다.
// - @eslint/js는 설치되어 있지 않다(ESLint 10은 이를 번들하지 않음). core 규칙은
//   eslint 본체에 내장되어 있으므로, 고신호 core 규칙 소수만 이름으로 직접 켠다.
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig(
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/.turbo/**",
    ".pnpm-store/**",
    // 심링크된 외부 도구 저장소 — 린트 대상 아님.
    "omo/**",
    // Python 앱(ruff 사용) / 스텁 / 게임 외 도구 — 이번 lint 범위에서 제외.
    "apps/api/**",
    "apps/mobile/**",
    "packages/lsp-tools-mcp/**",
    // 데이터 산출물(JSON 등) — 코드가 아니다.
    "data/parsed/**",
    "data/raw/**",
  ]),

  // TypeScript recommended (non-type-checked) — 파서/플러그인 셋업 포함.
  tseslint.configs.recommended,

  // 소수의 고신호 core 규칙. 스타일 규칙은 넣지 않는다.
  {
    name: "metro-typing/core-essentials",
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-debugger": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  // React 훅 규칙 — JSX 컴포넌트 파일과 훅 파일에만 적용.
  // packages/core-engine의 useTypingGame.ts / useComposedInput.ts처럼
  // .ts 확장자인 React 훅도 use<대문자> 패턴으로 잡는다.
  {
    ...reactHooks.configs.flat.recommended,
    name: "metro-typing/react-hooks",
    files: ["**/*.tsx", "**/*.jsx", "**/use[A-Z]*.ts", "**/hooks/**/*.ts"],
  },

  // 테스트 파일 완화: 테스트 더블/경계값 구성에 쓰이는 관용 표현을 허용한다.
  {
    name: "metro-typing/tests-overrides",
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  }
);
