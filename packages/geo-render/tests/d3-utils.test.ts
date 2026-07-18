import { describe, expect, it } from "vitest";
import { createLineProjection, interpolatePosition, projectStation } from "../src/d3-utils";

describe("createLineProjection / projectStation", () => {
  const stations = [{ coordinates: [139.7, 35.6] as [number, number] }, { coordinates: [139.8, 35.7] as [number, number] }];

  it("바운딩 박스 내 모든 역이 지정한 viewport 범위 안에 투영된다", () => {
    const projection = createLineProjection(stations, 800, 600, 40);
    for (const station of stations) {
      const [x, y] = projectStation(projection, station);
      const EPSILON = 1e-6;
      expect(x).toBeGreaterThanOrEqual(40 - EPSILON);
      expect(x).toBeLessThanOrEqual(760 + EPSILON);
      expect(y).toBeGreaterThanOrEqual(40 - EPSILON);
      expect(y).toBeLessThanOrEqual(560 + EPSILON);
    }
  });

  it("역이 하나뿐이면 에러 없이 투영을 생성한다", () => {
    const projection = createLineProjection([stations[0]], 800, 600);
    expect(() => projectStation(projection, stations[0])).not.toThrow();
  });
});

describe("interpolatePosition", () => {
  it("t=0이면 시작점을 반환한다", () => {
    expect(interpolatePosition([0, 0], [10, 10], 0)).toEqual([0, 0]);
  });

  it("t=1이면 끝점을 반환한다", () => {
    expect(interpolatePosition([0, 0], [10, 10], 1)).toEqual([10, 10]);
  });

  it("t=0.5이면 중간점을 반환한다", () => {
    expect(interpolatePosition([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });

  it("범위를 벗어난 t는 0~1로 클램프한다", () => {
    expect(interpolatePosition([0, 0], [10, 10], 2)).toEqual([10, 10]);
    expect(interpolatePosition([0, 0], [10, 10], -1)).toEqual([0, 0]);
  });
});
