import { InputValidator } from "./InputValidator";
import { calculateAccuracy, calculateCpm, calculateWpm } from "./statCalculator";
import type { GameMode, GameSnapshot, Station } from "./types";

const RAPID_MODE_DURATION_MS = 30_000;

/**
 * 중심 컨트롤러(5.2절 GameEngine). MapRenderer/InputValidator를 직접 소유하지 않고
 * — 구독(subscribe) 패턴으로 상태 변화를 알려 UI 레이어(useTypingGame 훅, MapRenderer)가
 * 반응하게 한다. React 의존성이 없는 순수 TypeScript 클래스라 단위 테스트가 쉽다.
 */
export class GameEngine {
  private stations: Station[] = [];
  private mode: GameMode = "speed_run";
  private targetIndex = 0;
  private validator = new InputValidator();
  private phase: GameSnapshot["phase"] = "idle";
  private startedAt = 0;
  private finishedAt = 0;
  private rawKeystrokes = 0;
  private correctSyllables = 0;
  private errorSyllables = 0;
  private stationsCleared = 0;
  private listeners = new Set<() => void>();
  // useSyncExternalStore는 getSnapshot()이 상태 변화가 없으면 "동일 참조"를 반환하길
  // 요구한다 — 매번 새 객체를 만들면 리렌더가 무한 반복된다(개발 중 실제로 겪은 버그).
  // 그래서 상태가 실제로 바뀌는 지점(emit 직전)에만 스냅샷을 재계산해 캐시한다.
  private cachedSnapshot: GameSnapshot = this.computeSnapshot();

  initialize(stations: Station[], mode: GameMode): void {
    if (stations.length === 0) throw new Error("stations must not be empty");
    this.stations = [...stations].sort((a, b) => a.sequence - b.sequence);
    this.mode = mode;
    this.targetIndex = 0;
    this.rawKeystrokes = 0;
    this.correctSyllables = 0;
    this.errorSyllables = 0;
    this.stationsCleared = 0;
    this.phase = "running";
    this.startedAt = Date.now();
    this.finishedAt = 0;
    this.validator.reset(this.stations[0].names.hangul);
    this.emit();
  }

  /** UI가 물리 keydown마다 호출 — 정오답 판정과 무관하게 CPM 분모로만 쓰인다 (5.4절). */
  recordRawKeystroke(): void {
    if (this.phase !== "running") return;
    this.rawKeystrokes++;
  }

  /** compositionend/input(웹) 또는 텍스트 diff(RN)로 확정된 전체 입력값을 전달한다. */
  processSettledInput(value: string): void {
    if (this.phase !== "running") return;
    if (this.mode === "rapid_30s" && Date.now() - this.startedAt >= RAPID_MODE_DURATION_MS) {
      this.terminate();
      return;
    }

    const result = this.validator.validateSyllable(value);
    if (result.status === "error") {
      this.errorSyllables++;
      this.emit();
      return;
    }
    if (result.status === "correct") {
      this.correctSyllables += this.stations[this.targetIndex].names.hangul.length;
      this.stationsCleared++;
      this.advanceToNextStation();
      return;
    }
    this.emit();
  }

  private advanceToNextStation(): void {
    const isLastStation = this.targetIndex >= this.stations.length - 1;
    if (isLastStation) {
      this.terminate();
      return;
    }
    this.targetIndex++;
    this.validator.reset(this.stations[this.targetIndex].names.hangul);
    this.emit();
  }

  terminate(): void {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.finishedAt = Date.now();
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.cachedSnapshot = this.computeSnapshot();
    for (const listener of this.listeners) listener();
  }

  getSnapshot(): GameSnapshot {
    return this.cachedSnapshot;
  }

  private computeSnapshot(): GameSnapshot {
    const elapsedMs = this.getElapsedMs();
    const totalSyllables = this.correctSyllables + this.errorSyllables;
    return {
      phase: this.phase,
      mode: this.mode,
      targetIndex: this.targetIndex,
      currentStation: this.stations[this.targetIndex] ?? null,
      composedText: this.validator.getComposedText(),
      correctLength: this.validator.getCorrectLength(),
      isErrorState: this.validator.isErrorState(),
      stats: {
        elapsedMs,
        keystrokes: this.rawKeystrokes,
        correctKeystrokes: this.rawKeystrokes, // v0: 별도 오타 키 추적 전까지 raw와 동일하게 취급
        errorKeystrokes: 0,
        accuracy: calculateAccuracy(this.correctSyllables, totalSyllables),
        wpm: calculateWpm(this.correctSyllables, elapsedMs),
        cpm: calculateCpm(this.rawKeystrokes, elapsedMs),
        stationsCleared: this.stationsCleared,
      },
    };
  }

  private getElapsedMs(): number {
    if (this.phase === "idle") return 0;
    const end = this.phase === "finished" ? this.finishedAt : Date.now();
    return end - this.startedAt;
  }
}
