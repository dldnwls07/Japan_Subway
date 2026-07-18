// 빌드 타임 전용 (data/scripts/에서만 import). 앱 런타임 번들에는 절대 포함하지 않는다.
// kuroshiro는 package.json에 devDependency로만 선언되어 있다 (7절).
import Kuroshiro from "kuroshiro";
// @ts-expect-error kuroshiro-analyzer-kuromoji에는 타입 선언이 없다.
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let instance: Kuroshiro | null = null;

export async function getKuroshiro(): Promise<Kuroshiro> {
  if (instance) return instance;
  instance = new Kuroshiro();
  await instance.init(new KuromojiAnalyzer());
  return instance;
}

export async function kanjiToKana(kanji: string): Promise<string> {
  const kuroshiro = await getKuroshiro();
  return kuroshiro.convert(kanji, { to: "hiragana" });
}
