import { INITIAL_MAP, MEDIAL_MAP, SOKUON_ASSIMILATION, SOKUON_DEFAULT_JONG } from "./tables";
import { attachFinalConsonant, composeSyllable, decomposeSyllable, JUNG } from "./hangul";
import exceptionRules from "../dict/exceptions.json";
import type { NormalizationRule } from "./types";

const rules = exceptionRules as NormalizationRule[];

function consumeHangulSyllable(
  chars: string[],
  index: number,
  table: Record<string, string>
): { syllable: string; nextIndex: number } {
  const char = chars[index];
  const nextChar = chars[index + 1];
  const combined = nextChar ? char + nextChar : "";
  if (combined && table[combined]) {
    return { syllable: table[combined], nextIndex: index + 2 };
  }
  return { syllable: table[char] ?? char, nextIndex: index + 1 };
}

export function kanaToHangul(kana: string): string {
  const normalized = applyNormalizationDict(kana);
  const chars = [...normalized];
  let result = "";
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];
    const nextChar = chars[i + 1];

    if (char === "っ" || char === "ッ") {
      result = attachFinalConsonant(result, resolveSokuonJong(nextChar));
      i++;
      continue;
    }
    if (char === "ん" || char === "ン") {
      result = attachFinalConsonant(result, "ㄴ");
      i++;
      continue;
    }

    const table = i === 0 ? INITIAL_MAP : MEDIAL_MAP;
    const { syllable, nextIndex } = consumeHangulSyllable(chars, i, table);
    result += syllable;
    i = nextIndex;
  }

  return applyLongVowelTruncation(result);
}

function resolveSokuonJong(nextChar?: string): string {
  if (!nextChar) return SOKUON_DEFAULT_JONG;
  const found = SOKUON_ASSIMILATION.find(([group]) => group.includes(nextChar));
  return found ? found[1] : SOKUON_DEFAULT_JONG;
}

/** exceptions.json 규칙을 순서대로 적용한다 (exact 먼저, 이후 regex). */
export function applyNormalizationDict(input: string): string {
  let result = input;
  for (const rule of rules) {
    if (rule.type === "exact") {
      result = result.split(rule.pattern).join(rule.replacement);
    } else {
      result = result.replace(new RegExp(rule.pattern, "g"), rule.replacement);
    }
  }
  return result;
}

const BARE_U = composeSyllable("ㅇ", "ㅜ"); // "우" — う단 장음(くう 등) 후행 절삭 대상
const BARE_O = composeSyllable("ㅇ", "ㅗ"); // "오" — お단 장음(おお 등) 후행 절삭 대상
const LONG_VOWEL_JUNG: readonly string[] = ["ㅗ", "ㅛ", "ㅜ", "ㅠ"]; // お단(ㅗ,ㅛ)·う단(ㅜ,ㅠ) 중성

/**
 * 장모음 생략 후처리 (4.3절 규칙 3): おう/おお/くう 계열의 두 번째 음절을 절삭한다.
 * 예: 도우쿄우(とうきょう) -> 도쿄, 오오사카(おおさか) -> 오사카.
 * 받침이 있는 음절(촉음 결합 등) 뒤에서는 장음 패턴으로 보지 않는다.
 */
function applyLongVowelTruncation(hangul: string): string {
  const chars = [...hangul];
  const output: string[] = [];
  for (const char of chars) {
    const prev = output[output.length - 1];
    if (prev && (char === BARE_U || char === BARE_O) && hasLongVowelJung(prev)) {
      continue;
    }
    output.push(char);
  }
  return output.join("");
}

function hasLongVowelJung(syllable: string): boolean {
  const decomposed = decomposeSyllable(syllable);
  if (!decomposed || decomposed.jong !== "") return false;
  return LONG_VOWEL_JUNG.includes(decomposed.jung as (typeof JUNG)[number]);
}
