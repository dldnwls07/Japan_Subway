import { useMemo, useSyncExternalStore } from "react";
import { GameEngine } from "./GameEngine";
import type { GameMode, Station } from "./types";

/** GameEngine을 React 컴포넌트 트리에 바인딩하는 얇은 훅. */
export function useTypingGame(stations: Station[], mode: GameMode) {
  const engine = useMemo(() => new GameEngine(), []);

  const snapshot = useSyncExternalStore(
    (onStoreChange) => engine.subscribe(onStoreChange),
    () => engine.getSnapshot()
  );

  const start = useMemo(() => () => engine.initialize(stations, mode), [engine, stations, mode]);

  return {
    snapshot,
    start,
    processSettledInput: (value: string) => engine.processSettledInput(value),
    recordRawKeystroke: () => engine.recordRawKeystroke(),
    terminate: () => engine.terminate(),
  };
}
