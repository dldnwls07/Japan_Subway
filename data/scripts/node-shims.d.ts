// 최소 Node.js 앰비언트 선언.
// 이 모노레포에는 아직 @types/node가 없으므로(Phase 1에서 추가 예정),
// cli.ts가 사용하는 Node API 표면만 여기서 선언해 tsc --noEmit를 통과시킨다.

interface ImportMeta {
  readonly url: string;
}

declare const process: {
  argv: string[];
  exitCode?: number;
  exit(code?: number): never;
};

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module "node:fs" {
  export function readdirSync(path: string): string[];
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string, encoding: "utf8"): void;
}
