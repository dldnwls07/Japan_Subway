// 역명 데이터 파이프라인: kana에서 romaji/hangul을 자동 생성하고,
// 손으로 작성한 골든 데이터(data/parsed/*.json)와 비교·검증한다.
//
// 이 모듈은 순수 함수만 노출한다(파일 I/O·process 접근 없음).
// 실제 실행(파일 읽기/쓰기, --write 플래그)은 cli.ts가 담당한다.
//
// 4.2절 리스크 대응: 이 파이프라인은 빌드 타임 전용이며 앱 런타임 번들에 포함하지 않는다.

import { kanaToRomaji, kanaToHangul } from "@metro-typing/translation-pipeline";

export interface StationNames {
  kanji: string;
  kana: string;
  romaji: string;
  hangul: string;
}

export interface StationData {
  stationId: string;
  sequence: number;
  operatorCode: string;
  lineCode: string;
  coordinates: [number, number];
  names: StationNames;
}

export interface LineData {
  lineId: string;
  lineNameKo: string;
  note?: string;
  stations: StationData[];
}

/** kana에서 생성되는 필드. kanji/kana는 소스이므로 검증·생성 대상이 아니다. */
export type GeneratedField = "romaji" | "hangul";
export type StationNameOverrides = Record<string, Partial<Pick<StationNames, GeneratedField>>>;

export interface Mismatch {
  stationId: string;
  kanji: string;
  kana: string;
  field: GeneratedField;
  /** 현재 파일에 커밋된(손으로 작성한) 값 */
  expected: string;
  /** 변환기가 새로 생성한 값 */
  generated: string;
}

/** kana로부터 romaji/hangul을 채운 새 names를 만든다. */
function generateNames(names: StationNames, override: Partial<Pick<StationNames, GeneratedField>> = {}): StationNames {
  return {
    kanji: names.kanji,
    kana: names.kana,
    romaji: override.romaji ?? kanaToRomaji(names.kana),
    hangul: override.hangul ?? kanaToHangul(names.kana),
  };
}

/**
 * 한 역의 names.romaji / names.hangul을 kana에서 생성해 채운다.
 * kanji·kana 및 역의 다른 필드는 그대로 둔다. 원본 객체는 변형하지 않는다.
 */
export function enrichStation(
  station: StationData,
  overrides: StationNameOverrides = {},
): StationData {
  return {
    ...station,
    names: generateNames(station.names, overrides[station.stationId]),
  };
}

/** 라인의 모든 역을 enrich한다. 라인 메타데이터(lineId 등)는 보존한다. */
export function enrichLine(line: LineData, overrides: StationNameOverrides = {}): LineData {
  return {
    ...line,
    stations: line.stations.map((station) => enrichStation(station, overrides)),
  };
}

/**
 * 검증 모드: 새로 생성한 romaji/hangul을 현재 커밋된 값과 비교해 불일치를 반환한다.
 * 골든 데이터에 대한 변환기 회귀 검사 역할을 겸한다.
 */
export function validateStation(
  station: StationData,
  overrides: StationNameOverrides = {},
): Mismatch[] {
  const generated = generateNames(station.names, overrides[station.stationId]);
  const fields: GeneratedField[] = ["romaji", "hangul"];
  const mismatches: Mismatch[] = [];
  for (const field of fields) {
    if (station.names[field] !== generated[field]) {
      mismatches.push({
        stationId: station.stationId,
        kanji: station.names.kanji,
        kana: station.names.kana,
        field,
        expected: station.names[field],
        generated: generated[field],
      });
    }
  }
  return mismatches;
}

/** 라인 전체의 불일치를 모은다. */
export function validateLine(line: LineData, overrides: StationNameOverrides = {}): Mismatch[] {
  return line.stations.flatMap((station) => validateStation(station, overrides));
}

/** 검증 결과를 사람이 읽을 수 있는 리포트 문자열로 만든다. */
export function formatValidationReport(lineId: string, mismatches: Mismatch[]): string {
  const header = `[${lineId}] 검증: 불일치 ${mismatches.length}건`;
  if (mismatches.length === 0) {
    return `${header} — OK (생성값이 커밋된 골든 데이터와 100% 일치)`;
  }
  const lines = mismatches.map(
    (m) =>
      `  - ${m.stationId} ${m.kanji}(${m.kana}) [${m.field}] ` +
      `커밋="${m.expected}" 생성="${m.generated}"`,
  );
  return [header, ...lines].join("\n");
}
