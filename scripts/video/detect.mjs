#!/usr/bin/env node
/* 元記事（出典ページ）に YouTube 動画が埋め込まれているかを調べ、data/cases.json の video に動画URLを書き込む。
   video が付いた事例は、事例セレクション（選記事）と要約ページに「動画あり」の印と動画への導線が出る（lib/video.ts）。

   使い方: node scripts/video/detect.mjs                  … 公開中・下書きの選記事に出ている事例（video 未設定のもの）を調べる
         node scripts/video/detect.mjs --article 49      … その記事（no かファイル名）の事例だけ
         node scripts/video/detect.mjs --ids a-1,b-2     … 事例IDを直接指定
         node scripts/video/detect.mjs --all             … 公開対象の全事例（1万件。時間がかかるので普段は使わない）
         node scripts/video/detect.mjs --recheck         … video が付いている事例も調べ直す（消えた動画は video を外す）
         node scripts/video/detect.mjs --dry-run         … 書き込まずに結果だけ出す

   見つけ方: ページのHTMLから youtube.com/embed/ID・youtube-nocookie.com/embed/ID・youtu.be/ID・watch?v=ID・shorts/ID と
   lite-youtube の videoid を拾う。埋め込み（iframe / lite-youtube）を優先し、無ければ本文中のリンクを使う。
   サイト全体のヘッダー・フッターに同じ動画が入っていることがあるので、同じ提供元の3件以上に同じ動画が出たら
   「共通動画の疑い」として付けない（--keep-common で付ける）。最後は目で確かめる。

   ネットワークに出るので、ローカル（自分のPC）で走らせる。掲載元に迷惑をかけないよう同時4件・同一ホストは間隔を空ける。 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const casesPath = path.join(root, "data/cases.json");
const cases = JSON.parse(fs.readFileSync(casesPath, "utf-8"));
const blocked = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/blocked_vendors.json"), "utf-8")).vendors.map((v) => v.domain));

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const dryRun = flag("--dry-run");
const recheck = flag("--recheck");
const keepCommon = flag("--keep-common");

/* ── 対象の事例を決める ── */
function senCaseIds(filter) {
  const dir = path.join(root, "content/articles");
  const ids = new Set();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    if (a.format !== "sen" || a.hidden) continue;
    if (filter && !(f === filter || f === `${filter}.json` || a.no === Number(filter))) continue;
    for (const it of a.items ?? []) ids.add(it.caseId);
  }
  return ids;
}

let targetIds;
if (val("--ids")) targetIds = new Set(val("--ids").split(",").map((s) => s.trim()).filter(Boolean));
else if (flag("--all")) targetIds = new Set(cases.map((c) => c.id));
else targetIds = senCaseIds(val("--article"));

const targets = cases.filter((c) =>
  targetIds.has(c.id) && !c.hidden && !blocked.has(c.vendor) && c.sourceUrl && (recheck || !c.video));

if (!targets.length) { console.log("調べる事例がない（すべて video 設定済みか、対象なし）"); process.exit(0); }
console.log(`${targets.length}件の元記事を調べる${dryRun ? "（dry-run）" : ""}`);

/* ── HTMLから YouTube の動画IDを拾う ── */
const ID = "([\\w-]{11})";
const EMBED_RE = new RegExp(`<(?:iframe|lite-youtube|amp-youtube)[^>]*?(?:youtube(?:-nocookie)?\\.com/embed/${ID}|youtu\\.be/${ID}|videoid=["']${ID}|data-videoid=["']${ID})`, "gi");
const LINK_RE = new RegExp(`(?:youtube\\.com/(?:watch\\?(?:[^"'\\s<>]*?&(?:amp;)?)?v=|shorts/|live/|v/|embed/)|youtu\\.be/)${ID}`, "gi");

function findYoutube(html) {
  const pick = (re) => { const m = re.exec(html); re.lastIndex = 0; return m ? m.slice(1).find(Boolean) : undefined; };
  const embed = pick(EMBED_RE);
  if (embed) return { id: embed, how: "埋め込み" };
  const link = pick(LINK_RE);
  return link ? { id: link, how: "リンク" } : undefined;
}

/* ── 取得（同時4件・同一ホストは1.5秒空ける） ── */
const UA = "Mozilla/5.0 (compatible; jirei-mania-video-check/1.0; +https://jirei-mania.com)";
const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  const host = new URL(url).hostname;
  const wait = (lastHit.get(host) ?? 0) + 1500 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

const found = new Map();   // id -> { ytId, how }
const errors = [];
let done = 0;
async function worker(queue) {
  for (let c; (c = queue.shift()); ) {
    try {
      const hit = findYoutube(await fetchHtml(c.sourceUrl));
      if (hit) found.set(c.id, { ytId: hit.id, how: hit.how });
    } catch (e) {
      errors.push(`${c.id}: ${e.message ?? e}`);
    }
    done++;
    if (done % 25 === 0 || done === targets.length) process.stdout.write(`  ${done}/${targets.length}\n`);
  }
}
const queue = [...targets];
await Promise.all(Array.from({ length: 4 }, () => worker(queue)));

/* ── 同じ提供元で同じ動画が3件以上 → サイト共通の埋め込みの疑い ── */
const byVendorVideo = new Map();
for (const c of targets) {
  const f = found.get(c.id);
  if (!f) continue;
  const k = `${c.vendor}|${f.ytId}`;
  byVendorVideo.set(k, (byVendorVideo.get(k) ?? 0) + 1);
}
const common = new Set([...byVendorVideo].filter(([, n]) => n >= 3).map(([k]) => k));

/* ── 書き込み ── */
let added = 0, removed = 0, skipped = 0;
const lines = [];
for (const c of targets) {
  const f = found.get(c.id);
  const url = f ? `https://www.youtube.com/watch?v=${f.ytId}` : undefined;
  if (f && common.has(`${c.vendor}|${f.ytId}`) && !keepCommon) { skipped++; lines.push(`  ? ${c.id}  ${url}（${c.vendor} の共通動画の疑い。付けない）`); continue; }
  if (url && c.video !== url) {
    lines.push(`  + ${c.id}  ${url}（${f.how}）`);
    if (!dryRun) {
      /* image の次に video を置く（diff を読みやすく保つ）。既にあればその場で置き換わる */
      if (!("video" in c)) {
        const entries = Object.entries(c);
        const at = entries.findIndex(([k]) => k === "image");
        entries.splice(at >= 0 ? at + 1 : entries.length, 0, ["video", url]);
        for (const k of Object.keys(c)) delete c[k];
        Object.assign(c, Object.fromEntries(entries));
      } else c.video = url;
    }
    added++;
  } else if (!url && c.video && recheck && !errors.some((e) => e.startsWith(`${c.id}:`))) {
    lines.push(`  - ${c.id}  動画が見つからなくなったので video を外す`);
    if (!dryRun) delete c.video;
    removed++;
  }
}
if (!dryRun && (added || removed)) fs.writeFileSync(casesPath, JSON.stringify(cases, null, 2));

console.log(lines.join("\n") || "  動画のある元記事は無かった");
console.log(`\n動画あり ${added}件を${dryRun ? "検出" : "書き込み"} / 外した ${removed}件 / 共通動画の疑い ${skipped}件 / 取得失敗 ${errors.length}件`);
if (errors.length) console.log("取得失敗:\n" + errors.map((e) => `  ${e}`).join("\n"));
if (skipped) console.log("共通動画の疑いは目で確かめて、本当にその事例の動画なら --ids で指定して --keep-common で付ける");
