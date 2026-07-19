// 헵번식(전통 헵번) 가나 → 로마자 변환.
// 역명 표기 관례(도쿄메트로 공식 표기)를 따른다: 매크론 없이 장모음 축약,
// ん은 b·m·p 앞에서 m(신바시 shimbashi), 모음·y 앞에서는 n'(shin'okubo).

const ROMAJI_TABLE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "o",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
};

const SMALL_YAYUYO = "ゃゅょ";

/** 가타카나(ァ~ヶ)를 히라가나로 정규화한다. 그 외 문자는 그대로 둔다. */
function toHiragana(input: string): string {
  return [...input]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
    })
    .join("");
}

/** ん 표기: b·m·p 앞 → m, 모음·y 앞 → n'(음절 경계 구분), 그 외 → n. */
function resolveN(nextInitial: string | undefined): string {
  if (nextInitial && "bmp".includes(nextInitial)) return "m";
  if (nextInitial && "aiueoy".includes(nextInitial)) return "n'";
  return "n";
}

/** 촉음(っ): 다음 음절 첫 자음을 겹쳐 적되, ち(ch-) 앞에서는 t로 적는다. */
function geminate(nextSyllable: string): string {
  return nextSyllable.startsWith("ch") ? "t" : nextSyllable[0];
}

/** 장모음 축약: おう·おお·うう의 후행 모음을 절삭한다 (えい·いい는 유지). */
function isCondensedLongVowel(syllable: string, prevOutput: string): boolean {
  if (syllable === "u") return prevOutput.endsWith("o") || prevOutput.endsWith("u");
  if (syllable === "o") return prevOutput.endsWith("o");
  return false;
}

interface RomajiState {
  result: string;
  pendingSokuon: boolean;
  pendingN: boolean;
}

function consumeToken(chars: string[], index: number): { token: string; nextIndex: number } {
  const char = chars[index];
  const nextChar = chars[index + 1];
  if (nextChar && SMALL_YAYUYO.includes(nextChar) && ROMAJI_TABLE[char + nextChar]) {
    return { token: char + nextChar, nextIndex: index + 2 };
  }
  return { token: char, nextIndex: index + 1 };
}

function processSyllable(state: RomajiState, syllable: string): void {
  if (state.pendingN) {
    state.result += resolveN(syllable[0]);
    state.pendingN = false;
  }
  if (state.pendingSokuon) {
    state.result += geminate(syllable);
    state.pendingSokuon = false;
  } else if (isCondensedLongVowel(syllable, state.result)) {
    return;
  }
  state.result += syllable;
}

export function kanaToRomaji(kana: string): string {
  const chars = [...toHiragana(kana)];
  const state: RomajiState = { result: "", pendingSokuon: false, pendingN: false };
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    if (char === "っ") {
      state.pendingSokuon = true;
      i++;
      continue;
    }
    if (char === "ー") {
      i++;
      continue;
    }
    if (char === "ん") {
      state.pendingN = true;
      i++;
      continue;
    }

    const { token, nextIndex } = consumeToken(chars, i);
    const syllable = ROMAJI_TABLE[token] ?? token;
    processSyllable(state, syllable);
    i = nextIndex;
  }

  if (state.pendingN) {
    state.result += "n";
  }
  return state.result;
}
