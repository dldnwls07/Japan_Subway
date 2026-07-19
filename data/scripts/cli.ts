// 역명 파이프라인 CLI.
//
// 사용법:
//   pnpm --filter @metro-typing/data generate:names [파일...] [--write]
//
// 기본 동작(dry-run): kana에서 romaji/hangul을 생성해 파일에 커밋된 값과 비교하고
// 불일치 리포트를 출력한다. 커밋된 JSON은 절대 건드리지 않는다.
//
// --write: 생성값으로 파일을 실제로 덮어쓴다(명시적으로 요청했을 때만).
//
// 인자로 파일을 주지 않으면 data/parsed/ 아래 기본 대상을 검사한다.

import { resolve } from "node:path";
import {
  enrichLine,
  formatValidationReport,
  validateLine,
  type LineData,
} from "./generate-names";
import { getNameOverrides } from "./name-overrides";
import { readLineFile, writeLineFile, PARSED_DIR } from "./parsed-files";

const DEFAULT_TARGETS = ["ginza-line.json"];

function main(): void {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const fileArgs = args.filter((a) => !a.startsWith("--"));
  const targets = fileArgs.length > 0 ? fileArgs : DEFAULT_TARGETS.map((f) => resolve(PARSED_DIR, f));

  let totalMismatches = 0;
  for (const target of targets) {
    const path = resolve(target);
    const line = readLineFile(path);

    if (write) {
      writeLineFile(path, enrichLine(line, getNameOverrides(line.lineId)));
      console.log(`[${line.lineId}] --write: ${path} 갱신 완료 (romaji/hangul 재생성)`);
      continue;
    }

    const mismatches = validateLine(line, getNameOverrides(line.lineId));
    totalMismatches += mismatches.length;
    console.log(formatValidationReport(line.lineId, mismatches));
  }

  if (!write && totalMismatches > 0) {
    // dry-run에서 불일치가 있으면 CI가 감지할 수 있도록 비정상 종료한다.
    process.exitCode = 1;
  }
}

main();
