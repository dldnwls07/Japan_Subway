import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/GameEngine";
import type { Station } from "../src/types";

function makeStations(): Station[] {
  return [
    { stationId: "G01", sequence: 1, coordinates: [139.7, 35.6], names: { kanji: "渋谷", kana: "しぶや", romaji: "shibuya", hangul: "시부야" } },
    { stationId: "G02", sequence: 2, coordinates: [139.71, 35.61], names: { kanji: "表参道", kana: "おもてさんどう", romaji: "omotesando", hangul: "오모테산도" } },
    { stationId: "G03", sequence: 3, coordinates: [139.72, 35.62], names: { kanji: "外苑前", kana: "がいえんまえ", romaji: "gaienmae", hangul: "가이엔마에" } },
  ];
}

describe("GameEngine", () => {
  it("initialize()는 첫 역을 타겟으로 설정하고 phase를 running으로 만든다", () => {
    const engine = new GameEngine();
    engine.initialize(makeStations(), "speed_run");
    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe("running");
    expect(snapshot.targetIndex).toBe(0);
    expect(snapshot.currentStation?.stationId).toBe("G01");
  });

  it("완성된 음절이 정답이면 다음 역으로 targetIndex를 증가시킨다", () => {
    const engine = new GameEngine();
    engine.initialize(makeStations(), "speed_run");
    engine.processSettledInput("시부야");
    const snapshot = engine.getSnapshot();
    expect(snapshot.targetIndex).toBe(1);
    expect(snapshot.currentStation?.stationId).toBe("G02");
    expect(snapshot.composedText).toBe(""); // 다음 역 검증기로 리셋됨
  });

  it("오타는 targetIndex를 바꾸지 않고 isErrorState를 true로 만든다", () => {
    const engine = new GameEngine();
    engine.initialize(makeStations(), "speed_run");
    engine.processSettledInput("시부여");
    const snapshot = engine.getSnapshot();
    expect(snapshot.targetIndex).toBe(0);
    expect(snapshot.isErrorState).toBe(true);
  });

  it("마지막 역까지 완주하면 phase가 finished로 바뀐다", () => {
    const engine = new GameEngine();
    engine.initialize(makeStations(), "speed_run");
    engine.processSettledInput("시부야");
    engine.processSettledInput("오모테산도");
    engine.processSettledInput("가이엔마에");
    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe("finished");
    expect(snapshot.stats.stationsCleared).toBe(3);
  });

  it("terminate() 이후에는 입력을 더 이상 반영하지 않는다", () => {
    const engine = new GameEngine();
    engine.initialize(makeStations(), "speed_run");
    engine.terminate();
    engine.processSettledInput("시부야");
    expect(engine.getSnapshot().targetIndex).toBe(0);
    expect(engine.getSnapshot().phase).toBe("finished");
  });
});
