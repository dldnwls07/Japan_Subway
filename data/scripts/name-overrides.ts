import type { StationNameOverrides } from "./generate-names";

// kanaToRomaji/kanaToHangul은 음절 단위 자동 변환을 담당한다.
// 실제 역명 데이터는 공식·관용 로마자 표기의 word boundary를 보존해야 하므로,
// 자동 변환만으로 복원할 수 없는 curated 표기는 stationId별 override로 명시한다.
const GINZA_LINE_OVERRIDES: StationNameOverrides = {
  G03: { romaji: "gaienmae" },
  G04: { romaji: "aoyama-itchome" },
  G05: { romaji: "akasaka-mitsuke" },
  G06: { romaji: "tameike-sanno" },
  G15: { romaji: "ueno-hirokoji" },
};

const OVERRIDES_BY_LINE: Record<string, StationNameOverrides> = {
  "tokyo-metro-ginza": GINZA_LINE_OVERRIDES,
};

export function getNameOverrides(lineId: string): StationNameOverrides {
  return OVERRIDES_BY_LINE[lineId] ?? {};
}
