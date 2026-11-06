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

export async function latestNotePosts(): Promise<NotePost[]> {
  const m = newestManual();
  if (!m) return [];
  const posts = await Promise.all([build("sugoi", m.sugoi), build("column", m.column)]);
  return posts.filter((p): p is NotePost => p !== null);
}
