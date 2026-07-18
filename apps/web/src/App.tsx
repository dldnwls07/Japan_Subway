import { useMemo } from "react";
import { useTypingGame, type Station } from "@metro-typing/core-engine";
import ginzaLine from "../../../data/parsed/ginza-line.json";
import { MapView } from "./components/MapView";
import { TypingInput } from "./components/TypingInput";
import { ScoreBoard } from "./components/ScoreBoard";

export default function App() {
  const stations = useMemo<Station[]>(
    () =>
      ginzaLine.stations.map((s) => ({
        stationId: s.stationId,
        sequence: s.sequence,
        coordinates: s.coordinates as [number, number],
        names: s.names,
      })),
    []
  );

  const { snapshot, start, processSettledInput, recordRawKeystroke } = useTypingGame(stations, "speed_run");

  return (
    <div style={{ padding: 24, background: "#111827", minHeight: "100vh" }}>
      <h1 style={{ color: "#e5e7eb", fontFamily: "sans-serif" }}>
        일본 지하철역 타자 게임 — Phase 0 (도쿄메트로 {ginzaLine.lineNameKo})
      </h1>

      {snapshot.phase === "idle" && (
        <button onClick={start} style={{ fontSize: 18, padding: "8px 16px" }}>
          시작
        </button>
      )}

      {snapshot.phase !== "idle" && (
        <>
          <MapView stations={stations} targetIndex={snapshot.targetIndex} />
          <div style={{ marginTop: 16 }}>
            <ScoreBoard stats={snapshot.stats} totalStations={stations.length} />
          </div>
          <div style={{ marginTop: 16 }}>
            {snapshot.phase === "running" && snapshot.currentStation && (
              <TypingInput
                expectedText={snapshot.currentStation.names.hangul}
                correctLength={snapshot.correctLength}
                isErrorState={snapshot.isErrorState}
                disabled={false}
                onSettledChange={processSettledInput}
                onRawKeystroke={recordRawKeystroke}
              />
            )}
            {snapshot.phase === "finished" && (
              <div style={{ color: "#e5e7eb", fontFamily: "sans-serif", fontSize: 20 }}>
                완주! {stations.length}개 역 완료.
                <button onClick={start} style={{ marginLeft: 16, fontSize: 16, padding: "6px 12px" }}>
                  다시 시작
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
