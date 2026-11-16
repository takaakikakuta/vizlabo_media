/* 記念日ポスト（content/days/YYYY-MM-DD.json）を、掲載連絡の記録・通知文では記事と同じ形で扱うための読み込み。
 * 記事と並べられるよう、format: "day"・slug: "day-YYYY-MM-DD"・label: 「記念日11/20」の形にそろえる。
 * DAYS_FROM より前の記念日ポストは対象にしない（事前連絡を始める前に出したもので、事前には連絡できないため）。 */
import fs from "node:fs";
import path from "node:path";

export const DAYS_FROM = "2026-11-17";

const md = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
export const dayLabel = (date) => `記念日${md(date)}`;

/** 記念日ポストを記事の形で返す（draft と DAYS_FROM より前は除く） */
export function loadDayPosts(root) {
  const dir = path.join(root, "content/days");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter((d) => !d.draft && d.date >= DAYS_FROM)
    .map((d) => ({
      format: "day",
      slug: `day-${d.date}`,
      no: d.date,
      date: d.date,
      name: d.name,
      publishedAt: d.date,
      title: [`${d.name}（記念日ポスト ${md(d.date)}）`],
      items: d.items ?? [],
    }));
}

/** 「記念日11/20」「11/20」「11-20」「2026-11-20」を記念日ポストの日付に。年がなければ今日以降で一番近い年（なければ一番新しい年） */
export function resolveDayKey(key, posts, today) {
  const k = String(key).replace(/^記念日/, "").trim();
  let m = k.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const date = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    return posts.find((p) => p.date === date);
  }
  m = k.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!m) return undefined;
  const mmdd = `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const same = posts.filter((p) => p.date.slice(5) === mmdd).sort((a, b) => a.date.localeCompare(b.date));
  return same.find((p) => p.date >= today) ?? same.at(-1);
}
