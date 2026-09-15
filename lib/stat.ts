/* 成果の値（"80%削減" / "約3.7倍に向上" / "月120時間→10時間"）を
   〈数字の本体〉と〈動詞〉に割って、数字だけを大きく組めるようにする。
   誌面で数字を主役にするための、表示専用のパーサ。 */

const VERB = /(?:に|へ|まで)?(削減|短縮|向上|改善|増加|減少|低減|節約|抑制|軽減|アップ|ダウン|高速化|効率化|達成|実現|増加|増|減|化)$/;

export type Stat = {
  head: string;  // 数字の本体（例: 80% / 約3.7倍 / 月120時間→10時間）
  verb: string;  // 動詞（例: 削減 / 向上）。無ければ空
  wide: boolean; // 長くて大きく組めない値か（→ 小さめに組む）
};

export function parseStat(value: string): Stat {
  const v = (value || "").trim();
  const m = v.match(VERB);
  const head = (m ? v.slice(0, v.length - m[0].length) : v).trim() || v;
  return { head, verb: m ? m[1] : "", wide: [...head].length > 7 };
}

/** 数字を含む値か（含まないものは“定性的な成果”として小さく扱う）。 */
export function hasDigit(value: string): boolean {
  return /[\d０-９]/.test(value || "");
}

/** 桁数に応じた見出しサイズ（誌面で高さを揃えるため段階を決め打ちする）。 */
export function statSize(head: string, scale: "xl" | "lg" | "md" = "lg"): string {
  const n = [...head].length;
  const table = {
    xl: n <= 4 ? "text-[52px]" : n <= 7 ? "text-[38px]" : "text-[24px]",
    lg: n <= 4 ? "text-[34px]" : n <= 7 ? "text-[26px]" : "text-[17px]",
    md: n <= 4 ? "text-[22px]" : n <= 7 ? "text-[18px]" : "text-[14px]",
  };
  return table[scale];
}
