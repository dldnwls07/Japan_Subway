import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateLine, type LineData } from "./generate-names";
import { getNameOverrides } from "./name-overrides";

const TARGETS = ["ginza-line.json"];
const __dirname = dirname(fileURLToPath(import.meta.url));

function readLine(fileName: string): LineData {
  const path = resolve(__dirname, "..", "parsed", fileName);
  return JSON.parse(readFileSync(path, "utf8")) as LineData;
}

describe("committed station name data", () => {
  it.each(TARGETS)("%s matches generated romaji/hangul from kana", (fileName) => {
    const line = readLine(fileName);
    expect(validateLine(line, getNameOverrides(line.lineId))).toEqual([]);
  });
});
