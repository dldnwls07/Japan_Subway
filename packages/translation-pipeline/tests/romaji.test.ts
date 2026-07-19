import { describe, it, expect } from "vitest";
import { kanaToRomaji } from "../src/romaji";

// 기대값 출처: data/parsed/ginza-line.json의 기존 romaji 표기(헵번식)와
// 도쿄메트로 공식 로마자 표기 관례. 역명 파이프라인 자동 생성의 기준이 된다.
describe("kanaToRomaji — 헵번식 기본 변환", () => {
  it("기본 오십음을 변환한다", () => {
    expect(kanaToRomaji("しぶや")).toBe("shibuya");
  });

  it("ち·つ·ふ·じ는 헵번식 표기를 따른다", () => {
    expect(kanaToRomaji("ちかてつ")).toBe("chikatetsu");
    expect(kanaToRomaji("ふじ")).toBe("fuji");
  });

  it("요음(拗音)을 한 음절로 변환한다", () => {
    expect(kanaToRomaji("しんじゅく")).toBe("shinjuku");
  });

  it("가타카나도 동일하게 변환한다", () => {
    expect(kanaToRomaji("ギンザ")).toBe("ginza");
  });
});

describe("kanaToRomaji — 장모음 축약", () => {
  it("おう 계열 장모음은 축약한다 (매크론 없이)", () => {
    expect(kanaToRomaji("とうきょう")).toBe("tokyo");
    expect(kanaToRomaji("きょうばし")).toBe("kyobashi");
  });

  it("おお·うう 장모음도 축약하되 えい는 유지한다", () => {
    expect(kanaToRomaji("おおさか")).toBe("osaka");
    expect(kanaToRomaji("めいじじんぐうまえ")).toBe("meijijingumae");
  });
});

describe("kanaToRomaji — 촉음(っ)", () => {
  it("다음 자음을 겹쳐 적는다", () => {
    expect(kanaToRomaji("さっぽろ")).toBe("sapporo");
  });

  it("ち 앞에서는 t로 적는다 (헵번식)", () => {
    expect(kanaToRomaji("いっちょうめ")).toBe("itchome");
  });
});

describe("kanaToRomaji — 장음 기호(ー)", () => {
  it("가타카나 장음 기호는 앞 모음의 장음으로 보고 축약한다 (매크론 없이)", () => {
    expect(kanaToRomaji("スカイツリー")).toBe("sukaitsuri");
    expect(kanaToRomaji("ターミナル")).toBe("taminaru");
  });
});

describe("kanaToRomaji — 발음(ん)", () => {
  it("b·m·p 앞에서는 m으로 적는다 (전통 헵번식 — 신바시=shimbashi)", () => {
    expect(kanaToRomaji("しんばし")).toBe("shimbashi");
    expect(kanaToRomaji("にほんばし")).toBe("nihombashi");
  });

  it("모음·y 앞에서는 구분을 위해 아포스트로피를 붙인다", () => {
    expect(kanaToRomaji("しんおおくぼ")).toBe("shin'okubo");
  });

  it("그 외 자음 앞·어말에서는 n으로 적는다", () => {
    expect(kanaToRomaji("かんだ")).toBe("kanda");
    expect(kanaToRomaji("うえの")).toBe("ueno");
  });
});
