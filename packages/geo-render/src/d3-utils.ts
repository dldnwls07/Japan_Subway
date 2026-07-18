import { geoMercator, type GeoProjection } from "d3-geo";

export interface ProjectableStation {
  coordinates: [number, number]; // [경도, 위도]
}

/**
 * Phase 0 범위: 일본 전역 TopoJSON 없이, 선택한 노선(긴자선)의 역 좌표 바운딩 박스에
 * 딱 맞춰 확대하는 최소 투영만 구현한다(7.2절 "노선 바운딩 박스로 지도 확대"에 대응).
 * 전국 배경 지도(3장 TopoJSON 파이프라인)는 Phase 1에서 실데이터 수집 후 추가한다.
 */
export function createLineProjection(
  stations: ProjectableStation[],
  width: number,
  height: number,
  padding = 40
): GeoProjection {
  if (stations.length === 0) throw new Error("stations must not be empty");
  const featureCollection = {
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: station.coordinates },
    })),
  };
  return geoMercator().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    featureCollection
  );
}

export function projectStation(projection: GeoProjection, station: ProjectableStation): [number, number] {
  const projected = projection(station.coordinates);
  if (!projected) throw new Error(`Failed to project coordinates: ${station.coordinates}`);
  return projected;
}

/** 두 역 사이를 선형 보간(Linear Interpolation)한다 — 열차 이동 애니메이션용 (7.2절 6단계). */
export function interpolatePosition(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [from[0] + (to[0] - from[0]) * clampedT, from[1] + (to[1] - from[1]) * clampedT];
}
