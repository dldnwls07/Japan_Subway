# 번역 엔진 상세 명세 (일본어 → 한글 변환 파이프라인)

> 상위 문서: 개발계획서 4장(역 이름 번역 및 다국어 처리 계획)의 구현 상세.
> 위치: `packages/translation-pipeline/`
> 주의: 4.2절에서 확인했듯 `kanabarum`은 실재하지 않는 패키지이므로 사용하지 않는다. 아래는 자체 변환기(In-house Converter) 설계다.

## 1. 파이프라인 개요

```
한자(Kanji) --[kuroshiro, 빌드타임]--> 가나(Kana) --[자체 변환기]--> 한글(Hangul)
                                              │
                                     정규화 사전(예외 처리)
```

전체 변환은 **빌드 타임에 1회 실행**되어 `data/parsed/stations.json`에 `hangul` 필드로 결과가 저장된다. 런타임에는 변환 로직 자체가 실행되지 않는다(3장 정적 데이터 전략과 일치).

## 2. 타입 정의

```typescript
// packages/translation-pipeline/src/types.ts
export interface StationNameConversion {
  stationId: string;
  kanji: string;
  kana: string;       // kuroshiro 1단계 산출물
  romaji: string;
  hangul: string;      // 2단계 자체 변환기 산출물
  isException: boolean; // 정규화 사전에서 온 예외 표기 여부
}

export interface NormalizationRule {
  pattern: string;                 // 정확히 일치할 부분 문자열 또는 정규식 소스
  type: "exact" | "regex";
  replacement: string;
  reason: string;                  // 예: "공항은 의미역 적용(교통시설)"
}
```

## 3. 정규화 사전 (`packages/translation-pipeline/dict/exceptions.json`)

4.3절 규칙 4(의미역/음역 혼합 규정)를 데이터로 표현한다. 알고리즘 실행 **전** 전처리 단계에서 적용된다.

```json
[
  { "pattern": "空港", "type": "exact", "replacement": "공항", "reason": "의미역 적용 (교통시설)" },
  { "pattern": "前$", "type": "regex", "replacement": "마에", "reason": "음역 원칙 (역 앞)" },
  { "pattern": "入口$", "type": "regex", "replacement": "이리구치", "reason": "음역 원칙 (입구)" },
  { "pattern": "ターミナル", "type": "exact", "replacement": "터미널", "reason": "의미역 적용" }
]
```

## 4. 자체 가나→한글 변환기

```typescript
// packages/translation-pipeline/src/converter.ts
import { INITIAL_MAP, MEDIAL_MAP, SOKUON_ASSIMILATION } from "./tables";

export function kanaToHangul(kana: string): string {
  const normalized = applyNormalizationDict(kana);
  const chars = [...normalized];
  let result = "";

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const nextChar = chars[i + 1];
    const isWordInitial = i === 0;

    if (char === "っ" || char === "ッ") {
      result += resolveSokuon(nextChar); // 규칙 2: 촉음 동화 처리
      continue;
    }
    if (char === "ん" || char === "ン") {
      result += "ㄴ받침"; // 규칙 2: 발음(ン)은 뒤 음소 무관 'ㄴ' 받침 통일 (후처리에서 실제 받침 결합)
      continue;
    }

    const table = isWordInitial ? INITIAL_MAP : MEDIAL_MAP; // 규칙 1: 어두/어중 구분
    result += table[char] ?? char;
  }

  return applyLongVowelTruncation(result); // 규칙 3
}

function resolveSokuon(nextChar?: string): string {
  if (!nextChar) return "ㅅ받침";
  const [consonantGroup, mapping] = SOKUON_ASSIMILATION.find(([group]) => group.includes(nextChar)) ?? [
    null,
    "ㅅ받침",
  ];
  return mapping; // ㄱ,ㄲ,ㅋ 앞 -> ㄱ받침 / ㅁ,ㅂ,ㅃ,ㅍ 앞 -> ㅂ받침 / 그 외 -> ㅅ받침
}

function applyNormalizationDict(input: string): string {
  // exceptions.json 규칙을 순서대로 적용 (exact 우선, 이후 regex)
  // 구현 생략 — dict/exceptions.json 로드 후 순차 치환
  return input;
}

function applyLongVowelTruncation(hangul: string): string {
  // 예: '도우쿄우' -> '도쿄' 패턴의 이중모음 후처리 절삭
  // 구현 생략 — 정규식 기반 패턴 매칭
  return hangul;
}
```

> `INITIAL_MAP`/`MEDIAL_MAP`/`SOKUON_ASSIMILATION` 테이블은 국립국어원 '일본어의 가나와 한글 대조표'를 그대로 데이터화한다. 이 세 테이블의 정확한 값 입력이 전체 변환 품질을 좌우하는 가장 중요한 작업이므로, 국어학 관련 자료를 대조하며 별도 스프레드시트로 먼저 정리한 뒤 JSON/TS로 옮기는 방식을 권장한다.

## 5. 국립국어원 골든 데이터셋 (QA용, 4.4절)

```json
// packages/translation-pipeline/__fixtures__/nikl-golden-set.json
[
  { "kanji": "新宿", "kana": "しんじゅく", "expected_hangul": "신주쿠", "source": "국립국어원 외래어 표기 용례집" },
  { "kanji": "札幌", "kana": "さっぽろ", "expected_hangul": "삿포로", "source": "국립국어원 외래어 표기 용례집" },
  { "kanji": "東京", "kana": "とうきょう", "expected_hangul": "도쿄", "source": "국립국어원 고시 (장모음 생략 원칙)" },
  { "kanji": "羽田空港", "kana": "はねだくうこう", "expected_hangul": "하네다공항", "source": "정규화 사전 (의미역 적용)" }
]
```

이 파일은 실제 착수 시 최소 200~300개 항목(주요 도시 역명 중심)으로 확장해야 한다. 국립국어원 웹사이트의 외래어 표기 용례 검색 기능을 통해 공식 표기가 확인된 역명·지명만 포함한다.

## 6. 회귀 테스트 (Vitest)

```typescript
// packages/translation-pipeline/tests/converter.test.ts
import { describe, it, expect } from "vitest";
import goldenSet from "../__fixtures__/nikl-golden-set.json";
import { kanaToHangul } from "../src/converter";

describe("kanaToHangul — 국립국어원 골든 데이터셋 회귀 테스트", () => {
  for (const entry of goldenSet) {
    it(`${entry.kanji} (${entry.kana}) -> ${entry.expected_hangul}`, () => {
      expect(kanaToHangul(entry.kana)).toBe(entry.expected_hangul);
    });
  }
});

describe("kanaToHangul — 규칙 단위 테스트", () => {
  it("어두 파열음은 예사소리로 표기한다 (규칙 1)", () => {
    expect(kanaToHangul("かめ")).toMatch(/^가/); // 어두 か -> 가
  });
  it("촉음 뒤 ㄱ계열 자음이면 ㄱ받침으로 동화된다 (규칙 2)", () => {
    expect(kanaToHangul("がっこう")).toContain("각"); // 학교(がっこう)류 패턴 검증용 예시
  });
});
```

CI(`.github/workflows/*.yml`)에서 이 테스트가 실패하면 병합을 차단한다(2.2절 GitHub Flow 정책과 동일).

## 7. kuroshiro 연동 골격 (1단계, 빌드 타임 전용)

```typescript
// packages/translation-pipeline/src/kuroshiro-wrapper.ts
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let instance: Kuroshiro | null = null;

export async function getKuroshiro(): Promise<Kuroshiro> {
  if (instance) return instance;
  instance = new Kuroshiro();
  await instance.init(new KuromojiAnalyzer());
  return instance;
}

export async function kanjiToKana(kanji: string): Promise<string> {
  const kuroshiro = await getKuroshiro();
  return kuroshiro.convert(kanji, { to: "hiragana" });
}
```

> 4.2절 리스크 대응: 이 파일은 **빌드 스크립트(`data/scripts/`)에서만 import**하고 앱 런타임 번들에는 절대 포함시키지 않는다(번들 크기 및 유지보수 중단 리스크 격리). package.json에서 kuroshiro는 `devDependencies`로 분리한다.

## 8. 작업 순서 제안

1. `INITIAL_MAP`/`MEDIAL_MAP`/`SOKUON_ASSIMILATION` 테이블 초안 작성 (스프레드시트 → TS)
2. 골든 데이터셋 30개 내외로 우선 작성, 회귀 테스트 통과할 때까지 변환기 반복 수정
3. Phase 0(도쿄메트로 긴자선, 19개 역) 전체를 골든 데이터셋에 편입해 100% 일치 확인
4. Phase 1 범위(도쿄메트로+도영지하철, 약 285개 역)로 확장, 자동 변환 후 원어민 표본 검수(4.4절 3항)
