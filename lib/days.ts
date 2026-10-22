import fs from "node:fs";
import path from "node:path";
import { getCase } from "./cases";
import type { CaseStudy } from "./types";

/* 記念日ページ（/days/YYYY-MM-DD）。SNSの記念日ポストを、1日1ページの読みものとして残す。
   データは content/days/YYYY-MM-DD.json（1日1ファイル）。イラストは public/days/YYYY-MM-DD.jpg|png を置くだけで反映。
   事例の本文・会社名・数字はテンプレートが cases.json から引くので、JSONには事例IDと一言だけを書く。 */

export type DayItem = { caseId: string; note: string };

export type DayPost = {
  date: string;            // "YYYY-MM-DD"（年ごとに内容を変えられるよう、年を含める）
  name: string;            // 記念日の名前（例: 世界パスタデー）
  emoji?: string;          // リプ欄の行頭に付ける絵文字（任意）
  intro?: string[];        // 冒頭の説明（段落ごと）。この日が記念日になった由来と、事例との関連
  title: string[];         // 書き出し（行ごと。SNSポストの1〜2文目）
  body: string;            // 本文（ポストの続き。1段落）
  theme: string;           // 3本の括り（例: 手仕事の食品づくりを機械に任せた事例）
  items: DayItem[];        // 事例3本（caseId と一言）
  more?: { label: string; href: string };  // 「もっと見る」導線（任意）
  image?: string;          // イラストの明示指定（未指定なら public/days/YYYY-MM-DD.jpg|png を自動検出）
  draft?: boolean;         // 公開前の下書き
};

const DIR = path.join(process.cwd(), "content", "days");

export function allDays(): DayPost[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8")) as DayPost)
    .filter((d) => !d.draft)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getDay(date: string): DayPost | undefined {
  return allDays().find((d) => d.date === date);
}

/** 前後の記念日（存在する日だけを環状にたどる） */
export function neighborDays(date: string): { prev?: DayPost; next?: DayPost } {
  const days = allDays();
  const i = days.findIndex((d) => d.date === date);
  if (i < 0 || days.length < 2) return {};
  return { prev: days[(i - 1 + days.length) % days.length], next: days[(i + 1) % days.length] };
}

/** イラスト。明示指定 > public/days/YYYY-MM-DD.jpg|png > なし */
export function dayImage(d: DayPost): string | undefined {
  if (d.image) return d.image;
  for (const ext of ["jpg", "png", "webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "days", `${d.date}.${ext}`))) return `/days/${d.date}.${ext}`;
  }
  return undefined;
}

/** 日本時間の今日（"YYYY-MM-DD"） */
export function todayJST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 今日の記念日。無ければ次に来る記念日、それも無ければ直近に過ぎた記念日（トップの入口カードで使う） */
export function todayDay(): { day: DayPost; when: "today" | "next" | "past" } | undefined {
  const today = todayJST();
  const days = allDays();
  const exact = days.find((d) => d.date === today);
  if (exact) return { day: exact, when: "today" };
  const next = days.find((d) => d.date > today);
  if (next) return { day: next, when: "next" };
  const past = days.filter((d) => d.date < today).at(-1);
  return past ? { day: past, when: "past" } : undefined;
}

/** "YYYY-MM-DD" → "10月25日"（年は withYear で "2026年10月25日"） */
export function dayLabel(date: string, withYear = false): string {
  const [y, m, d] = date.split("-").map((s) => parseInt(s, 10));
  return withYear ? `${y}年${m}月${d}日` : `${m}月${d}日`;
}

export function dayYear(date: string): number {
  return parseInt(date.slice(0, 4), 10);
}

export function dayMonth(date: string): number {
  return parseInt(date.slice(5, 7), 10);
}

/** 事例3本を cases.json から引く（hidden・禁止ベンダーは getCase が除くので、その場合は落ちる） */
export function dayCases(d: DayPost): { item: DayItem; c: CaseStudy }[] {
  return d.items.map((item) => ({ item, c: getCase(item.caseId) }))
    .filter((x): x is { item: DayItem; c: CaseStudy } => Boolean(x.c));
}
