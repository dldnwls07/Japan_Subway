// 유니코드 한글 완성형 음절(가 ~ 힣, U+AC00~U+D7A3) 조합/분해 유틸리티.
// converter.ts와 tables.ts가 공유하는 순수 함수만 둔다 (외부 의존성 없음).

export const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export const JUNG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
] as const;

export const JONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_END = 0xd7a3;

export function composeSyllable(cho: string, jung: string, jong: string = ""): string {
  const c = CHO.indexOf(cho as (typeof CHO)[number]);
  const j = JUNG.indexOf(jung as (typeof JUNG)[number]);
  const f = JONG.indexOf(jong as (typeof JONG)[number]);
  if (c === -1 || j === -1 || f === -1) {
    throw new Error(`Invalid jamo combination: cho=${cho} jung=${jung} jong=${jong}`);
  }
  return String.fromCodePoint(SYLLABLE_BASE + (c * 21 + j) * 28 + f);
}

export interface DecomposedSyllable {
  cho: string;
  jung: string;
  jong: string;
}

export function decomposeSyllable(syllable: string): DecomposedSyllable | null {
  const code = syllable.codePointAt(0);
  if (code === undefined || code < SYLLABLE_BASE || code > SYLLABLE_END) return null;
  const sIndex = code - SYLLABLE_BASE;
  return {
    cho: CHO[Math.floor(sIndex / (21 * 28))],
    jung: JUNG[Math.floor((sIndex % (21 * 28)) / 28)],
    jong: JONG[sIndex % 28],
  };
}

/**
 * 문자열 끝 음절에 받침(종성)을 결합한다. 촉음(っ)·발음(ん)이 앞 음절의 받침으로
 * 흡수되는 국립국어원 표기 규칙(4.3절 규칙 2)을 구현하기 위한 후처리 함수.
 * 이미 받침이 있는 음절 뒤에는 겹받침을 만들지 않고 그대로 둔다 — 역명 데이터에서
 * 실제로 이런 연쇄가 나오면 정규화 사전(exceptions.json) 예외로 처리한다.
 */
export function attachFinalConsonant(text: string, jong: string): string {
  if (text.length === 0) return text;
  const chars = [...text];
  const decomposed = decomposeSyllable(chars[chars.length - 1]);
  if (!decomposed || decomposed.jong !== "") return text;
  chars[chars.length - 1] = composeSyllable(decomposed.cho, decomposed.jung, jong);
  return chars.join("");
}
