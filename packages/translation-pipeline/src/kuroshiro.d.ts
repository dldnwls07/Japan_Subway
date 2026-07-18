// kuroshiro는 npm에 타입 선언이 없다(관리 중단 상태, translation-engine-spec.md §7 참고).
// 이 패키지에서 실제로 쓰는 최소 표면만 선언한다.
declare module "kuroshiro" {
  export default class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(text: string, options?: { to?: "hiragana" | "katakana" | "romaji" }): Promise<string>;
  }
}
