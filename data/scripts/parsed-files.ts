// data/parsed/*.json 골든 데이터 파일의 목록·읽기·직렬화 헬퍼.
//
// generate-names.ts는 순수 함수만 두는 모듈이므로(파일 I/O 없음),
// 파일 I/O가 필요한 cli.ts와 테스트들이 이 모듈을 공유한다.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LineData } from "./generate-names";

const scriptDir = dirname(fileURLToPath(import.meta.url));

/** 커밋된 골든 데이터 디렉터리(data/parsed)의 절대 경로. */
export const PARSED_DIR = resolve(scriptDir, "..", "parsed");

/** data/parsed 아래의 모든 노선 JSON 파일 절대 경로를 정렬해 반환한다. */
export function listParsedLineFiles(): string[] {
  return readdirSync(PARSED_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => resolve(PARSED_DIR, name));
}

export function readLineFile(path: string): LineData {
  return JSON.parse(readFileSync(path, "utf8")) as LineData;
}

/** 배열·중첩 객체를 공백 포함 한 줄 JSON으로 직렬화한다: { "k": v, ... } / [a, b] */
function toSingleLineJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(toSingleLineJson).join(", ")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, v]) => `${JSON.stringify(key)}: ${toSingleLineJson(v)}`,
    );
    return `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value);
}

/**
 * 커밋된 골든 데이터 스타일(메타데이터는 키당 한 줄, 역은 1역당 한 줄)로 직렬화한다.
 * JSON.stringify(line, null, 2)를 쓰면 역마다 수십 줄이 되어 diff 리뷰가 어려워지고
 * --write가 기존 파일 전체를 재포맷하는 노이즈를 만들므로, ginza-line.json의
 * 기존 포맷을 바이트 단위로 재현한다 (round-trip 보장은 parsed-files.test.ts가 검증).
 * 알 수 없는 최상위 필드도 원래 키 순서대로 보존한다.
 */
export function formatLineFile(line: LineData): string {
  const metaLines = Object.entries(line)
    .filter(([key]) => key !== "stations")
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  const stationLines = line.stations.map(
    (station, i) => `    ${toSingleLineJson(station)}${i < line.stations.length - 1 ? "," : ""}`,
  );
  return ["{", ...metaLines, '  "stations": [', ...stationLines, "  ]", "}", ""].join("\n");
}

export function writeLineFile(path: string, line: LineData): void {
  writeFileSync(path, formatLineFile(line), "utf8");
}
