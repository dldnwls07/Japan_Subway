import { useMemo } from "react";
import { createLineProjection, projectStation } from "@metro-typing/geo-render";
import type { Station } from "@metro-typing/core-engine";

interface MapViewProps {
  stations: Station[];
  targetIndex: number;
}

const WIDTH = 720;
const HEIGHT = 420;

export function MapView({ stations, targetIndex }: MapViewProps) {
  const projection = useMemo(() => createLineProjection(stations, WIDTH, HEIGHT), [stations]);
  const points = useMemo(
    () => stations.map((station) => projectStation(projection, station)),
    [projection, stations]
  );

  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const [trainX, trainY] = points[targetIndex] ?? points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label="긴자선 노선도"
      style={{ background: "#0b1220", borderRadius: 12 }}
    >
      <path d={pathD} fill="none" stroke="#f39800" strokeWidth={4} strokeLinecap="round" />
      {points.map(([x, y], i) => {
        const isCleared = i < targetIndex;
        const isCurrent = i === targetIndex;
        return (
          <g key={stations[i].stationId}>
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? 8 : 5}
              fill={isCleared ? "#f39800" : isCurrent ? "#22d3ee" : "#4b5563"}
              stroke="#0b1220"
              strokeWidth={2}
            />
            <text x={x} y={y - 14} fontSize={11} fill="#e5e7eb" textAnchor="middle">
              {stations[i].names.hangul}
            </text>
          </g>
        );
      })}
      <circle
        cx={trainX}
        cy={trainY}
        r={9}
        fill="#22d3ee"
        stroke="#0b1220"
        strokeWidth={2}
        style={{ transition: "cx 0.5s linear, cy 0.5s linear" }}
      />
    </svg>
  );
}
