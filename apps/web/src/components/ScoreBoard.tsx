import type { GameStats } from "@metro-typing/core-engine";

interface ScoreBoardProps {
  stats: GameStats;
  totalStations: number;
}

export function ScoreBoard({ stats, totalStations }: ScoreBoardProps) {
  return (
    <div style={{ display: "flex", gap: 24, fontFamily: "monospace", color: "#e5e7eb" }}>
      <span>통과: {stats.stationsCleared}/{totalStations}</span>
      <span>WPM: {stats.wpm.toFixed(1)}</span>
      <span>CPM: {stats.cpm.toFixed(1)}</span>
      <span>정확도: {(stats.accuracy * 100).toFixed(1)}%</span>
      <span>경과: {(stats.elapsedMs / 1000).toFixed(1)}s</span>
    </div>
  );
}
