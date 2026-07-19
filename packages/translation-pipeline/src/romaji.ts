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

export function kanaToRomaji(kana: string): string {
  const chars = [...toHiragana(kana)];
  let result = "";
  let pendingSokuon = false;
  let pendingN = false;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === "っ") {
      pendingSokuon = true;
      continue;
    }
    // 가타카나 장음 기호: 앞 모음의 장음이므로 おう·おお와 동일하게 축약(생략)한다.
    if (char === "ー") {
      continue;
    }
    if (char === "ん") {
      pendingN = true;
      continue;
    }

    // 요음은 2글자 조합이므로 다음 글자가 小書き(ゃゅょ)면 합쳐 소비한다.
    const nextChar = chars[i + 1];
    let token = char;
    if (nextChar && SMALL_YAYUYO.includes(nextChar) && ROMAJI_TABLE[char + nextChar]) {
      token = char + nextChar;
      i++;
    }
    const syllable = ROMAJI_TABLE[token] ?? token;

    if (pendingN) {
      result += resolveN(syllable[0]);
      pendingN = false;
    }
    if (pendingSokuon) {
      result += geminate(syllable);
      pendingSokuon = false;
    } else if (isCondensedLongVowel(syllable, result)) {
      continue;
    }
    result += syllable;
  }

  if (pendingN) result += "n";
  return result;
}
