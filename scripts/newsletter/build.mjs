#!/usr/bin/env node
/* メルマガ「週刊 事例マニア」の HTML を組み立てる（Benchmark に「HTMLを貼り付け」で入れる用）。

   使い方（vizlabo_media で）:
     node scripts/newsletter/build.mjs 2026-10-31
       → newsletter/2026-10-31.json が無ければ手書き欄の雛形を作る（note 2本・お知らせ・編集後記）
       → newsletter/2026-10-31.html を書き出す
   日付を省くと「次の土曜日」。

   自動で拾うもの（サイトのデータから）:
     - 今週の事例セレクション：公開中の選記事のうち新しい順に5本（サムネイル・タイトル・リードの冒頭）
     - 今週の記念日ポスト：配信日の6日前〜配信日の7日分
     - 今週の数字：配信日前7日間に追加した事例の件数と、成果の数字が「A→B」の形で出ている事例を3つ
   手で書くもの（newsletter/YYYY-MM-DD.json）:
     - この事例がスゴイ／事例コラム（note の URL・タイトル・一言）、お知らせ枠（1つ）、編集後記、冒頭のひと言
   リンクにはすべて utm_source=newsletter&utm_medium=email&utm_campaign=YYYY-MM-DD&utm_content=<枠> を付ける。

   HTML メールの作法：table 組み・インライン CSS・幅600px・Web フォント無し（Gmail / Outlook で崩れないように）。 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const SITE = "https://vizlabo.com";
const OUT_DIR = path.join(ROOT, "newsletter");

// ── 色（サイトの globals.css に合わせる）
const C = {
  ink: "#16181d", body: "#4a505c", muted: "#8a9099", line: "#e3e0d9", line2: "#efece5",
  soft: "#f7f5f0", bg: "#fdfcfa", brand: "#0f4c81", accent: "#0e6e52",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif";
const SERIF = "'Hiragino Mincho ProN','Yu Mincho','YuMincho',serif";
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

// ── 日付
const ymd = (d) => d.toISOString().slice(0, 10);
function nextSaturday() {
  const now = new Date(Date.now() + 9 * 3600e3);  // 日本時間
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7));
  return ymd(d);
}
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const md = (s) => `${parseInt(s.slice(5, 7), 10)}/${parseInt(s.slice(8, 10), 10)}`;
const wd = (s) => WEEK[new Date(`${s}T00:00:00Z`).getUTCDay()];

const issue = process.argv[2] || nextSaturday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(issue)) { console.error("日付は YYYY-MM-DD で"); process.exit(1); }
const weekFrom = addDays(issue, -6);

// ── 共通
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s = "", n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
function utm(url, content) {
  try {
    const u = new URL(url, SITE);
    u.searchParams.set("utm_source", "newsletter");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", issue);
    u.searchParams.set("utm_content", content);
    return u.toString();
  } catch { return url; }
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf-8"));
const exists = (p) => fs.existsSync(p);

// ── データ
const cases = readJson(path.join(ROOT, "data", "cases.json"));
const blocked = new Set(readJson(path.join(ROOT, "data", "blocked_vendors.json")).vendors.map((v) => v.domain));
const publicCases = cases.filter((c) => !c.hidden && !blocked.has(c.vendor));
const caseById = new Map(publicCases.map((c) => [c.id, c]));

const artDir = path.join(ROOT, "content", "articles");
const articles = fs.readdirSync(artDir).filter((f) => f.endsWith(".json"))
  .map((f) => readJson(path.join(artDir, f)))
  .filter((a) => !a.hidden && !a.draft && a.publishedAt <= issue)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.no - a.no);
function articleThumb(a) {
  if (a.thumbnail && a.thumbnail !== "none") return `${SITE}${a.thumbnail}`;
  for (const ext of ["jpg", "png"]) {
    const f = `${String(a.no).padStart(3, "0")}.${ext}`;
    if (exists(path.join(ROOT, "public", "thumbnail", f))) return `${SITE}/thumbnail/${f}`;
  }
  const first = (a.items || []).map((it) => caseById.get(it.caseId)?.image).find(Boolean);
  return first;
}
const selections = articles.slice(0, 5);

const dayDir = path.join(ROOT, "content", "days");
const days = fs.readdirSync(dayDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => readJson(path.join(dayDir, f)))
  .filter((d) => !d.draft && d.date >= weekFrom && d.date <= issue)
  .sort((a, b) => a.date.localeCompare(b.date));

const newCases = publicCases.filter((c) => (c.collectedAt || "").slice(0, 10) >= addDays(issue, -7) && (c.collectedAt || "").slice(0, 10) < issue);
const highlights = [];
const seenVendor = new Set();
for (const c of newCases) {
  const r = (c.results || []).find((x) => /→/.test(x.value) && /\d/.test(x.value));
  if (!r || seenVendor.has(c.vendor)) continue;
  seenVendor.add(c.vendor);
  highlights.push({ c, r });
  if (highlights.length >= 3) break;
}
// 同じ提供元ばかりの週は3つに満たないので、2周目は提供元の重複を許して埋める
for (const c of newCases) {
  if (highlights.length >= 3) break;
  if (highlights.some((h) => h.c.id === c.id)) continue;
  const r = (c.results || []).find((x) => /→/.test(x.value) && /\d/.test(x.value));
  if (r) highlights.push({ c, r });
}

// ── 手書き欄（無ければ雛形を作る）
fs.mkdirSync(OUT_DIR, { recursive: true });
const manualPath = path.join(OUT_DIR, `${issue}.json`);
if (!exists(manualPath)) {
  fs.writeFileSync(manualPath, JSON.stringify({
    _note: "この号の手書き欄。空欄の枠はメールに出さない（note の2本は必ず埋める）。書いたら build.mjs をもう一度実行する。",
    intro: "今週も、事例の集積から読み解いた記事をお届けします。",
    sugoi: { title: "", url: "", desc: "" },
    column: { title: "", url: "", desc: "" },
    notice: {
      label: "AI事例サジェスト（無料）",
      title: "貴社のURLを入れるだけで、似た事例が届きます",
      desc: "AIが同じ業界・同じ困りごとの事例を選んで、メールでお届けします。",
      url: "https://vizlabo.com/suggest",
      cta: "試してみる",
    },
    afterword: "",
  }, null, 2), "utf-8");
  console.log(`手書き欄の雛形を作成 → ${path.relative(ROOT, manualPath)}`);
}
const m = readJson(manualPath);

// note の記事は OGP 画像（アイキャッチ）とタイトルを自動で取りに行く。取れたら手書き欄にも書き戻す（次回から再取得しない）
async function fillFromOgp(n) {
  if (!n || !n.url || (n.image && n.title)) return false;
  try {
    const res = await fetch(n.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; jirei-mania-newsletter/1.0)" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return false;
    const h = await res.text();
    const meta = (p) => {
      const r = h.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)["']`, "i"))
        || h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${p}["']`, "i"));
      return r ? r[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : "";
    };
    let changed = false;
    if (!n.image && meta("image")) { n.image = meta("image"); changed = true; }
    if (!n.title && meta("title")) { n.title = meta("title").replace(/｜vizlabo$/, ""); changed = true; }
    return changed;
  } catch { return false; }
}
const filled = (await Promise.all([fillFromOgp(m.sugoi), fillFromOgp(m.column)])).some(Boolean);
if (filled) fs.writeFileSync(manualPath, JSON.stringify(m, null, 2), "utf-8");

// ── 部品
const sectionHead = (label, title) => `
<tr><td style="padding:36px 0 12px 0;border-bottom:2px solid ${C.ink};">
  <div style="font-size:11px;letter-spacing:.16em;color:${C.muted};font-weight:bold;">${esc(label)}</div>
  <div style="font-family:${SERIF};font-size:20px;line-height:1.4;color:${C.ink};margin-top:4px;">${esc(title)}</div>
</td></tr>`;

const button = (href, text) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>
  <td style="background:${C.ink};"><a href="${esc(href)}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(text)} →</a></td>
</tr></table>`;

function selectionRow(a, i) {
  const href = utm(`${SITE}/articles/${a.slug}`, `selection-${i + 1}`);
  const img = articleThumb(a);
  return `
<tr><td style="padding:18px 0;border-bottom:1px solid ${C.line2};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${img ? `<td width="150" valign="top" style="padding-right:16px;"><a href="${esc(href)}"><img src="${esc(img)}" width="150" alt="" style="display:block;width:150px;height:auto;border:1px solid ${C.line2};"></a></td>` : ""}
    <td valign="top">
      <div style="font-size:11px;color:${C.muted};">#${String(a.no).padStart(3, "0")}</div>
      <a href="${esc(href)}" style="font-family:${SERIF};font-size:16px;line-height:1.55;color:${C.ink};text-decoration:none;font-weight:bold;">${esc(a.title.join(""))}</a>
      <div style="font-size:12.5px;line-height:1.8;color:${C.body};margin-top:6px;">${esc(clip(a.lead || "", 72))}</div>
    </td>
  </tr></table>
</td></tr>`;
}

function noteBlock(label, n, key) {
  if (!n || !n.url) return `
<tr><td style="padding:16px;background:#fff5d6;border:1px dashed #c9a227;font-size:12px;color:#7a5b00;">
  【未入力】${esc(label)}：newsletter/${issue}.json の「${key}」に note の URL・タイトル・一言を書いて、もう一度実行してください。
</td></tr>`;
  const href = utm(n.url, key);
  return `
<tr><td style="padding:18px 0;">
  ${n.image ? `<a href="${esc(href)}"><img src="${esc(n.image)}" width="544" alt="" style="display:block;width:100%;max-width:544px;height:auto;border:1px solid ${C.line2};margin-bottom:14px;"></a>` : ""}
  <a href="${esc(href)}" style="font-family:${SERIF};font-size:17px;line-height:1.55;color:${C.ink};text-decoration:none;font-weight:bold;">${esc(n.title)}</a>
  ${n.desc ? `<div style="font-size:13px;line-height:1.85;color:${C.body};margin-top:6px;">${esc(n.desc)}</div>` : ""}
  ${button(href, "noteで読む")}
</td></tr>`;
}

function dayRow(d) {
  const href = utm(`${SITE}/days/${d.date}`, `day-${d.date}`);
  return `
<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line2};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="64" valign="top" style="font-size:13px;color:${C.ink};font-weight:bold;white-space:nowrap;">${md(d.date)}<span style="font-size:11px;color:${C.muted};font-weight:normal;">（${wd(d.date)}）</span></td>
    <td valign="top">
      <a href="${esc(href)}" style="font-size:13.5px;color:${C.ink};text-decoration:none;font-weight:bold;">${esc(d.emoji ? d.emoji + " " : "")}${esc(d.name)}</a>
      <div style="font-size:12px;line-height:1.7;color:${C.body};margin-top:2px;">${esc(d.theme)}を3本</div>
    </td>
  </tr></table>
</td></tr>`;
}

function highlightRow({ c, r }, i) {
  const href = utm(`${SITE}/cases/${c.id}`, `number-${i + 1}`);
  return `
<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line2};">
  <div style="font-size:11px;color:${C.muted};">${esc(r.metric)}</div>
  <div style="font-size:22px;font-weight:bold;color:${C.accent};line-height:1.3;margin-top:2px;">${esc(r.value)}</div>
  <a href="${esc(href)}" style="font-size:12.5px;line-height:1.7;color:${C.brand};text-decoration:none;">${esc(c.customer?.name ? c.customer.name + "：" : "")}${esc(clip(c.title, 46))} →</a>
</td></tr>`;
}

// ── 本文
const preheader = `${selections[0] ? selections[0].title.join("") : ""}ほか、今週の事例セレクション${selections.length}本`;

const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>週刊 事例マニア ${issue}</title></head>
<body style="margin:0;padding:0;background:${C.soft};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.bg};border:1px solid ${C.line};font-family:${FONT};color:${C.body};">
<tr><td style="padding:28px 28px 8px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

<tr><td style="padding-bottom:16px;border-bottom:1px solid ${C.ink};">
  <div style="font-size:11px;letter-spacing:.2em;color:${C.muted};font-weight:bold;">${issue.replace(/-/g, ".")}（${wd(issue)}）号</div>
  <div style="font-family:${SERIF};font-size:28px;color:${C.ink};margin-top:6px;letter-spacing:.04em;">週刊 事例マニア</div>
  <div style="font-size:12px;color:${C.muted};margin-top:4px;">課題から探すBtoB導入事例データベース</div>
</td></tr>

<tr><td style="padding:20px 0 4px 0;font-size:14px;line-height:1.9;color:${C.body};">
  ${esc(m.intro || "")}
</td></tr>

${sectionHead("01", "今週の事例セレクション")}
${selections.map(selectionRow).join("")}
<tr><td style="padding-top:12px;"><a href="${esc(utm(`${SITE}/articles`, "selection-all"))}" style="font-size:13px;color:${C.brand};font-weight:bold;text-decoration:none;">事例セレクションの一覧を見る →</a></td></tr>

${sectionHead("02", "この事例がスゴイ")}
${noteBlock("この事例がスゴイ", m.sugoi, "sugoi")}

${sectionHead("03", "事例コラム")}
${noteBlock("事例コラム", m.column, "column")}

${days.length ? `${sectionHead("04", "今週の記念日ポスト")}
<tr><td style="padding:10px 0 4px 0;font-size:12.5px;color:${C.body};">その日の記念日にちなんで、掲載事例から3本ずつ選んでいます。</td></tr>
${days.map(dayRow).join("")}
<tr><td style="padding-top:12px;"><a href="${esc(utm(`${SITE}/days`, "day-all"))}" style="font-size:13px;color:${C.brand};font-weight:bold;text-decoration:none;">記念日の一覧（カレンダー）を見る →</a></td></tr>` : ""}

${newCases.length ? `${sectionHead(days.length ? "05" : "04", "今週の数字")}
<tr><td style="padding:12px 0 4px 0;font-size:13px;color:${C.body};">今週、新しく掲載した事例は <b style="font-size:18px;color:${C.ink};">${newCases.length.toLocaleString()}</b> 件。${highlights.length ? `その中から、成果の数字を${highlights.length}つ。` : ""}</td></tr>
${highlights.map(highlightRow).join("")}` : ""}

${m.notice && m.notice.url ? `
<tr><td style="padding:32px 0 0 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.ink};background:${C.soft};"><tr><td style="padding:18px 20px;">
    <div style="font-size:11px;letter-spacing:.16em;color:${C.muted};font-weight:bold;">${esc(m.notice.label || "お知らせ")}</div>
    <div style="font-family:${SERIF};font-size:17px;line-height:1.5;color:${C.ink};margin-top:4px;">${esc(m.notice.title || "")}</div>
    ${m.notice.desc ? `<div style="font-size:12.5px;line-height:1.8;color:${C.body};margin-top:6px;">${esc(m.notice.desc)}</div>` : ""}
    ${button(utm(m.notice.url, "notice"), m.notice.cta || "詳しく見る")}
  </td></tr></table>
</td></tr>` : ""}

${m.afterword ? `
<tr><td style="padding:32px 0 0 0;">
  <div style="font-size:11px;letter-spacing:.16em;color:${C.muted};font-weight:bold;">編集後記</div>
  <div style="font-size:13px;line-height:1.95;color:${C.body};margin-top:8px;white-space:pre-line;">${esc(m.afterword)}</div>
</td></tr>` : ""}

<tr><td style="padding:36px 0 24px 0;border-top:1px solid ${C.line};margin-top:32px;font-size:11px;line-height:1.9;color:${C.muted};">
  <div style="margin-top:16px;">週刊 事例マニア｜毎週土曜配信</div>
  <div><a href="${esc(utm(SITE, "footer"))}" style="color:${C.muted};">vizlabo.com</a> ／ <a href="${esc(utm(`${SITE}/contact`, "footer-contact"))}" style="color:${C.muted};">お問い合わせ</a></div>
  <div style="margin-top:8px;">配信の停止は、このメール下部の配信停止リンクから行えます。</div>
</td></tr>

</table>
</td></tr>
</table>
</td></tr></table>
</body></html>
`;

const outPath = path.join(OUT_DIR, `${issue}.html`);
fs.writeFileSync(outPath, html, "utf-8");
const missing = ["sugoi", "column"].filter((k) => !m[k] || !m[k].url);
console.log(`${issue}（${wd(issue)}）号 → ${path.relative(ROOT, outPath)}`);
console.log(`  事例セレクション ${selections.length}本 / 記念日 ${days.length}日分（${weekFrom}〜${issue}） / 今週の新着 ${newCases.length}件・数字 ${highlights.length}つ`);
if (missing.length) console.log(`  未入力: ${missing.join(", ")}（newsletter/${issue}.json に書いて再実行）`);
