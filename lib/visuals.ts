import type { CaseStudy } from "./types";

/* 課題ごとの12色。事例カバー（グラデーション）や課題アイコンの色に使う＝“にぎやか”に。 */
export const CHALLENGE_STYLE: Record<string, { c1: string; c2: string; solid: string }> = {
  cost:           { c1: "#10b981", c2: "#059669", solid: "#059669" }, // 緑
  labor:          { c1: "#3b82f6", c2: "#2563eb", solid: "#2563eb" }, // 青
  efficiency:     { c1: "#6366f1", c2: "#4f46e5", solid: "#4f46e5" }, // インディゴ
  quality:        { c1: "#fb7185", c2: "#e11d48", solid: "#e11d48" }, // 赤
  leadtime:       { c1: "#fb923c", c2: "#ea580c", solid: "#ea580c" }, // オレンジ
  standardize:    { c1: "#a78bfa", c2: "#7c3aed", solid: "#7c3aed" }, // 紫
  data:           { c1: "#22d3ee", c2: "#0891b2", solid: "#0891b2" }, // シアン
  sales:          { c1: "#fbbf24", c2: "#d97706", solid: "#d97706" }, // アンバー
  cs:             { c1: "#f472b6", c2: "#db2777", solid: "#db2777" }, // ピンク
  hr:             { c1: "#2dd4bf", c2: "#0d9488", solid: "#0d9488" }, // ティール
  security:       { c1: "#94a3b8", c2: "#475569", solid: "#475569" }, // スレート
  sustainability: { c1: "#a3e635", c2: "#65a30d", solid: "#65a30d" }, // ライム
};

const FALLBACK = { c1: "#818cf8", c2: "#4f46e5", solid: "#4f46e5" };

export function challengeStyle(slug: string) {
  return CHALLENGE_STYLE[slug] ?? FALLBACK;
}

export function challengeGradient(slug: string): string {
  const s = challengeStyle(slug);
  return `linear-gradient(135deg, ${s.c1} 0%, ${s.c2} 100%)`;
}

/** 事例の“主課題”＝カバー色を決める課題（先頭）。 */
export function primaryChallenge(c: Pick<CaseStudy, "challenges">): string {
  return c.challenges[0] ?? "efficiency";
}
