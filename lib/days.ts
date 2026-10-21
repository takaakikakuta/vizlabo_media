import fs from "node:fs";
import path from "node:path";
import { getCase } from "./cases";
import type { CaseStudy } from "./types";

/* 記念日ページ（/days/MM-DD）。SNSの記念日ポストを、1日1ページの読みものとして残す。
   データは content/days/MM-DD.json（1日1ファイル）。イラストは public/days/MM-DD.jpg|png を置くだけで反映。
   事例の本文・会社名・数字はテンプレートが cases.json から引くので、JSONには事例IDと一言だけを書く。 */

export type DayItem = { caseId: string; note: string };

export type DayPost = {
  date: string;            // "MM-DD"
  name: string;            // 記念日の名前（例: 世界パスタデー）
  emoji?: string;          // リプ欄の行頭に付ける絵文字（任意）
  title: string[];         // 書き出し（行ごと。SNSポストの1〜2文目）
  body: string;            // 本文（ポストの続き。1段落）
  theme: string;           // 3本の括り（例: 手仕事の食品づくりを機械に任せた事例）
  items: DayItem[];        // 事例3本（caseId と一言）
  more?: { label: string; href: string };  // 「もっと見る」導線（任意）
  image?: string;          // イラストの明示指定（未指定なら public/days/MM-DD.jpg|png を自動検出）
  draft?: boolean;         // 公開前の下書き
};

const DIR = path.join(process.cwd(), "content", "days");

export function allDays(): DayPost[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => /^\d{2}-\d{2}\.json$/.test(f))
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

/** イラスト。明示指定 > public/days/MM-DD.jpg|png > なし */
export function dayImage(d: DayPost): string | undefined {
  if (d.image) return d.image;
  for (const ext of ["jpg", "png", "webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "days", `${d.date}.${ext}`))) return `/days/${d.date}.${ext}`;
  }
  return undefined;
}

export function dayLabel(date: string): string {
  const [m, d] = date.split("-").map((s) => parseInt(s, 10));
  return `${m}月${d}日`;
}

/** 事例3本を cases.json から引く（hidden・禁止ベンダーは getCase が除くので、その場合は落ちる） */
export function dayCases(d: DayPost): { item: DayItem; c: CaseStudy }[] {
  return d.items.map((item) => ({ item, c: getCase(item.caseId) }))
    .filter((x): x is { item: DayItem; c: CaseStudy } => Boolean(x.c));
}

/** SNSポストの文面を組み立てる（本文＋リプ欄）。ページの「ポスト用テキスト」に出す */
export function dayPostText(d: DayPost, site = "https://vizlabo.com"): { main: string; reply: string } {
  const e = d.emoji ?? "・";
  const main = [...d.title, d.body, `${dayLabel(d.date)}は「${d.name}」。`, `${d.theme}を${d.items.length}つ、リプ欄に。`].join("\n");
  const lines = dayCases(d).map(({ item, c }) => {
    const who = c.customer?.name ? `${c.customer.name}: ` : "";
    return `${e} ${who}${item.note}\n${site}/cases/${c.id}`;
  });
  if (d.more) lines.push(`${d.more.label}→ ${site}${d.more.href}`);
  return { main, reply: lines.join("\n") };
}
