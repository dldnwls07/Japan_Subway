import { describe, it, expect } from "vitest";
import {
  enrichStation,
  enrichLine,
  validateStation,
  validateLine,
  formatValidationReport,
  type LineData,
} from "./generate-names";

// 소규모 인메모리 픽스처. 긴자선 실데이터와 독립적으로 순수 함수 동작을 검증한다.
const fixture: LineData = {
  lineId: "test-line",
  lineNameKo: "테스트선",
  stations: [
    {
      stationId: "T01",
      sequence: 1,
      operatorCode: "TokyoMetro",
      lineCode: "T",
      coordinates: [139.7, 35.6],
      // 올바른 골든 표기: ぎんざ -> ginza / 긴자
      names: { kanji: "銀座", kana: "ぎんざ", romaji: "ginza", hangul: "긴자" },
    },
    {
      stationId: "T02",
      sequence: 2,
      operatorCode: "TokyoMetro",
      lineCode: "T",
      // 의도적으로 틀린 romaji/hangul을 넣어 검증 모드가 불일치를 잡는지 확인한다.
      coordinates: [139.71, 35.61],
      names: { kanji: "新橋", kana: "しんばし", romaji: "WRONG", hangul: "엉터리" },
    },
  ],
};

describe("enrichStation", () => {
  it("kana에서 romaji/hangul을 생성한다", () => {
    const out = enrichStation(fixture.stations[0]);
    expect(out.names.romaji).toBe("ginza");
    expect(out.names.hangul).toBe("긴자");
  });

  it("kanji/kana는 건드리지 않는다", () => {
    const out = enrichStation(fixture.stations[1]);
    expect(out.names.kanji).toBe("新橋");
    expect(out.names.kana).toBe("しんばし");
    // 기존의 틀린 값은 새로 생성된 값으로 대체된다.
    expect(out.names.romaji).toBe("shimbashi");
    expect(out.names.hangul).toBe("신바시");
  });

  it("원본 station 객체를 변형하지 않는다 (순수 함수)", () => {
    const original = fixture.stations[1];
    const snapshot = JSON.stringify(original);
    enrichStation(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe("enrichLine", () => {
  it("모든 역을 enrich하고 라인 메타데이터는 보존한다", () => {
    const out = enrichLine(fixture);
    expect(out.lineId).toBe("test-line");
    expect(out.lineNameKo).toBe("테스트선");
    expect(out.stations).toHaveLength(2);
    expect(out.stations[1].names.romaji).toBe("shimbashi");
    expect(out.stations[1].names.hangul).toBe("신바시");
  });
});

describe("validateStation", () => {
  it("일치하는 역은 불일치를 반환하지 않는다", () => {
    expect(validateStation(fixture.stations[0])).toEqual([]);
  });

  it("romaji/hangul 불일치를 각각 잡아낸다", () => {
    const mismatches = validateStation(fixture.stations[1]);
    expect(mismatches).toHaveLength(2);
    const byField = Object.fromEntries(mismatches.map((m) => [m.field, m]));
    expect(byField.romaji).toMatchObject({
      stationId: "T02",
      expected: "WRONG",
      generated: "shimbashi",
    });
    expect(byField.hangul).toMatchObject({
      stationId: "T02",
      expected: "엉터리",
      generated: "신바시",
    });
  });
});

describe("validateLine", () => {
  it("라인 전체의 불일치를 모은다", () => {
    const mismatches = validateLine(fixture);
    expect(mismatches).toHaveLength(2);
    expect(mismatches.every((m) => m.stationId === "T02")).toBe(true);
  });
});

describe("formatValidationReport", () => {
  it("불일치가 없으면 통과 메시지를 낸다", () => {
    const report = formatValidationReport("test-line", []);
    expect(report).toContain("0");
    expect(report.toLowerCase()).toContain("ok");
  });

  it("불일치가 있으면 각 항목을 나열한다", () => {
    const report = formatValidationReport("test-line", validateLine(fixture));
    expect(report).toContain("T02");
    expect(report).toContain("shimbashi");
    expect(report).toContain("신바시");
  });
});
