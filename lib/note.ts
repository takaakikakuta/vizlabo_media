import fs from "node:fs";
import path from "node:path";

/* note で連載中の「この事例がスゴイ」「事例コラム」の最新回。
   出どころはメルマガの手書き欄 newsletter/YYYY-MM-DD.json（sugoi / column）。
   いちばん新しい号に URL があればそれを使う。title・image が空なら note の OGP から取る
   （メルマガの build.mjs が取って書き戻しているので、普段は空にならない）。
   次の号の JSON を先に作って URL だけ書いておけば、配信前でもトップに出せる。 */

export type NotePost = {
  kind: "sugoi" | "column";
  url: string;
  title: string;
  image: string;
  desc: string;
};

const DIR = path.join(process.cwd(), "newsletter");

type Manual = { url?: string; title?: string; image?: string; desc?: string };

function newestManual(): { sugoi?: Manual; column?: Manual } | null {
  if (!fs.existsSync(DIR)) return null;
  const files = fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
  for (const f of files) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8"));
      if (m?.sugoi?.url || m?.column?.url) return m;
    } catch { /* 壊れた号は飛ばす */ }
  }
  return null;
}

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/* OGP の title / image。1時間キャッシュ（トップの ISR と同じ周期）。取れなければ空 */
async function ogp(url: string): Promise<{ title: string; image: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; vizlabo-site/1.0)" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { title: "", image: "" };
    const h = await res.text();
    const meta = (p: string) => {
      const r = h.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)["']`, "i"))
        || h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${p}["']`, "i"));
      return r ? decode(r[1]) : "";
    };
    return { title: meta("title").replace(/｜vizlabo$/, ""), image: meta("image") };
  } catch {
    return { title: "", image: "" };
  }
}

async function build(kind: NotePost["kind"], m?: Manual): Promise<NotePost | null> {
  if (!m?.url) return null;
  let title = m.title ?? "", image = m.image ?? "";
  if (!title || !image) {
    const o = await ogp(m.url);
    title ||= o.title;
    image ||= o.image;
  }
  if (!title) return null;
  return { kind, url: m.url, title, image, desc: m.desc ?? "" };
}

/* ── 連載ごとの一覧（/sugoi・/column） ──
   メルマガの全号から sugoi / column を集め、URL で重複を除いて新しい順に並べる。
   メルマガ開始（2026-10-24）より前の回は data/note_backfill.json に URL だけ書けば足りる
   （title・image は OGP から取る）。 */

export type NoteEntry = NotePost & { date: string; no: number | null };

type Backfill = Manual & { kind?: NotePost["kind"]; date?: string };

function manualEntries(kind: NotePost["kind"]): (Manual & { date: string })[] {
  const out: (Manual & { date: string })[] = [];
  if (fs.existsSync(DIR)) {
    for (const f of fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8"));
        if (m?.[kind]?.url) out.push({ ...m[kind], date: f.slice(0, 10) });
      } catch { /* 壊れた号は飛ばす */ }
    }
  }
  const bf = path.join(process.cwd(), "data", "note_backfill.json");
  if (fs.existsSync(bf)) {
    try {
      const list: Backfill[] = JSON.parse(fs.readFileSync(bf, "utf-8")).posts ?? [];
      for (const b of list) if (b.kind === kind && b.url) out.push({ ...b, date: b.date ?? "" });
    } catch { /* 読めなければ無視 */ }
  }
  return out;
}

/* 「【この事例がスゴイ！ #012】…」の #012 */
function seriesNo(title: string): number | null {
  const m = title.match(/#\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function allNotePosts(kind: NotePost["kind"]): Promise<NoteEntry[]> {
  // 同じ URL が複数の号に出ていたら、いちばん古い号の日付を使う（初出）
  const byUrl = new Map<string, Manual & { date: string }>();
  for (const m of manualEntries(kind).sort((a, b) => (a.date || "9").localeCompare(b.date || "9"))) {
    const prev = byUrl.get(m.url!);
    byUrl.set(m.url!, prev ? { ...m, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v)) } as Manual & { date: string } : m);
  }
  const built = await Promise.all([...byUrl.values()].map(async (m) => {
    const p = await build(kind, m);
    return p ? { ...p, date: m.date, no: seriesNo(p.title) } : null;
  }));
  return built.filter((p): p is NoteEntry => p !== null).sort((a, b) =>
    (b.no ?? -1) - (a.no ?? -1) || b.date.localeCompare(a.date));
}

export async function latestNotePosts(): Promise<NotePost[]> {
  const m = newestManual();
  if (!m) return [];
  const posts = await Promise.all([build("sugoi", m.sugoi), build("column", m.column)]);
  return posts.filter((p): p is NotePost => p !== null);
}
