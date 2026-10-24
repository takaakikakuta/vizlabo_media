#!/usr/bin/env node
/* 事例の棚卸し。選記事（10選・5選・3選）を企画する前に、テーマごとに何件あるかを数える。
 *
 *   node scripts/inventory/inventory.mjs                 → content/articles/INVENTORY.md を書き出す（テーマ別の件数と判定、タグ上位、重複使用）
 *   node scripts/inventory/inventory.mjs --theme "停電|非常用電源"   → そのテーマの候補事例を一覧（素材級のみ。--all で全件）
 *   node scripts/inventory/inventory.mjs --theme 金型 --industry manufacturing
 *   node scripts/inventory/inventory.mjs --tags          → 困りごとタグ別の件数（テーマ候補を探す）
 *
 * 素材級 = 課題文80字以上 かつ（数値成果あり または 施策80字以上）。線引きは WRITING-sen.md 冒頭と6節。
 * 判定の目安: 10選 = 素材級15以上・数字7以上・提供元5以上 / 5選 = 素材級10以上・数字4以上・数字ありの提供元4以上 / 3選 = 素材級6以上・数字2以上・提供元2以上
 * 「使用」は content/articles/*.json（hidden・draft 含む）で参照されている事例。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const blocked = new Set(read("data/blocked_vendors.json").vendors.map((v) => v.domain));
const cases = read("data/cases.json").filter((c) => !c.hidden && !c.sample && !blocked.has(c.vendor));
const themes = read("scripts/inventory/themes.json").themes;

/* 記事→事例の参照（lib/articles.ts の articleCaseIds と同じ範囲） */
const usedIn = new Map(); // caseId -> [{no,format,hidden,draft,title}]
const articles = [];
for (const f of fs.readdirSync(path.join(ROOT, "content/articles")).filter((f) => f.endsWith(".json"))) {
  const a = read("content/articles/" + f);
  let ids = [];
  switch (a.format) {
    case "wakaremichi": ids = [a.caseA?.id, a.caseB?.id, a.verification?.caseId]; break;
    case "genba": ids = [a.axisId, ...(a.paths ?? []).flatMap((p) => p.caseIds ?? [])]; break;
    case "dounyumae": ids = [...(a.types ?? []).flatMap((t) => (t.quotes ?? []).map((q) => q.caseId)), ...(a.exits ?? []).flatMap((x) => x.caseIds ?? [])]; break;
    case "chizu": ids = (a.routes ?? []).flatMap((r) => r.caseIds ?? []); break;
    case "ekkyou": ids = [a.caseA?.id, a.caseB?.id]; break;
    case "butaiura": ids = [...(a.walls ?? []).flatMap((w) => w.caseIds ?? []), ...(a.approaches ?? []).flatMap((x) => x.caseIds ?? [])]; break;
    case "sen": ids = (a.items ?? []).map((x) => x.caseId); break;
  }
  const info = { no: a.no, format: a.format, hidden: !!a.hidden, draft: !!a.draft, title: Array.isArray(a.title) ? a.title.join(" ") : a.title, items: a.items?.length };
  articles.push(info);
  for (const id of new Set(ids.filter(Boolean))) usedIn.set(id, [...(usedIn.get(id) ?? []), info]);
}

const text = (c) => [c.title, c.summary, c.challengeDetail, c.actions].filter(Boolean).join(" ");
const len = (v) => (Array.isArray(v) ? v.join("") : v ?? "").length;
const isSozai = (c) => len(c.challengeDetail || c.challenges) >= 80 && (c.hasNumbers || len(c.actions) >= 80);
const used = (c) => usedIn.has(c.id);

function match(theme) {
  const re = theme.pattern ? new RegExp(theme.pattern) : null;
  return cases.filter((c) =>
    (!theme.industry || c.customer?.industry === theme.industry) &&
    (!theme.tag || (c.tags ?? []).includes(theme.tag)) &&
    (!re || re.test(text(c))));
}

function count(list) {
  const sozai = list.filter(isSozai);
  const num = sozai.filter((c) => c.hasNumbers);
  const vendors = (xs) => new Set(xs.map((c) => c.vendor)).size;
  const unusedS = sozai.filter((c) => !used(c));
  const unusedN = num.filter((c) => !used(c));
  let verdict = "不足（舞台裏型・攻略地図型へ）";
  if (sozai.length >= 15 && num.length >= 7 && vendors(sozai) >= 5) verdict = "10選まで組める";
  else if (sozai.length >= 10 && num.length >= 4 && vendors(num) >= 4) verdict = "5選まで";
  else if (sozai.length >= 6 && num.length >= 2 && vendors(num) >= 2) verdict = "3選まで（主張が立てば）";
  return { total: list.length, sozai: sozai.length, num: num.length, vendorsS: vendors(sozai), vendorsN: vendors(num), unusedS: unusedS.length, unusedN: unusedN.length, verdict };
}

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };

if (args.includes("--theme")) {
  const theme = { pattern: opt("--theme"), industry: opt("--industry"), tag: opt("--tag") };
  const list = match(theme);
  const show = (args.includes("--all") ? list : list.filter(isSozai))
    .sort((a, b) => (b.hasNumbers - a.hasNumbers) || (len(b.challengeDetail) - len(a.challengeDetail)));
  const c = count(list);
  console.log(`テーマ /${theme.pattern ?? ""}/ ${theme.industry ? "industry=" + theme.industry : ""} ${theme.tag ? "tag=" + theme.tag : ""}`);
  console.log(`該当 ${c.total} / 素材級 ${c.sozai}（提供元 ${c.vendorsS}）/ うち数字あり ${c.num}（提供元 ${c.vendorsN}）/ 未使用 素材級 ${c.unusedS}・数字あり ${c.unusedN} → ${c.verdict}\n`);
  for (const x of show) {
    const u = (usedIn.get(x.id) ?? []).map((a) => "#" + a.no + (a.hidden ? "(hidden)" : a.draft ? "(draft)" : "")).join(",");
    const res = (x.results ?? []).map((r) => `${r.metric} ${r.value}`).join("／");
    console.log(`${x.hasNumbers ? "●" : "○"} ${x.id}`);
    console.log(`   ${x.vendor} | ${x.customer?.name ?? "（社名非公開）"} ${x.customer?.size ?? ""} [${x.customer?.industry ?? ""}]${u ? " | 使用: " + u : ""}`);
    console.log(`   課題: ${(x.challengeDetail ?? "").slice(0, 90)}`);
    if (res) console.log(`   成果: ${res.slice(0, 120)}`);
  }
  console.log(`\n${show.length}件表示（● 数字あり / ○ 数字なし）`);
  process.exit(0);
}

if (args.includes("--tags")) {
  const t = new Map();
  for (const c of cases) for (const tag of c.tags ?? []) {
    const e = t.get(tag) ?? { total: 0, sozai: 0, num: 0, unusedN: 0 };
    e.total++; if (isSozai(c)) { e.sozai++; if (c.hasNumbers) { e.num++; if (!used(c)) e.unusedN++; } }
    t.set(tag, e);
  }
  const rows = [...t].filter(([, e]) => e.sozai >= 6).sort((a, b) => b[1].sozai - a[1].sozai);
  console.log("タグ\t該当\t素材級\t数字あり\t未使用の数字あり");
  for (const [tag, e] of rows) console.log(`${tag}\t${e.total}\t${e.sozai}\t${e.num}\t${e.unusedN}`);
  process.exit(0);
}

/* 既定: INVENTORY.md を書く */
const today = new Date().toISOString().slice(0, 10);
const allS = cases.filter(isSozai);
const lines = [];
lines.push(`# 事例の棚卸し（${today} 時点）`, "",
  "`node scripts/inventory/inventory.mjs` で再生成する（テーマは `scripts/inventory/themes.json`）。選記事を企画する前に、ここでテーマの厚みを見る。",
  "候補の事例そのものを見るときは `node scripts/inventory/inventory.mjs --theme \"停電|非常用電源\"`。", "",
  `- 掲載事例 ${cases.length.toLocaleString()} 件（hidden・掲載禁止ベンダーを除く）。素材級 ${allS.length.toLocaleString()} 件、うち数字あり ${allS.filter((c) => c.hasNumbers).length.toLocaleString()} 件。`,
  `- 記事 ${articles.length} 本（hidden・draft 含む）が ${usedIn.size} 件の事例を参照している。`,
  "- 素材級 = 課題文80字以上かつ（数値成果があるか施策80字以上）。判定の目安は 10選 = 素材級15以上・数字7以上・提供元5以上、5選 = 素材級10以上・数字4以上・数字ありの提供元4以上、3選 = 素材級6以上・数字2以上。",
  "- 「未使用」はどの記事にも出ていない事例。既存の記事と同じ事例ばかりになるテーマは、未使用の数字ありが少ない。", "",
  "## テーマ別", "",
  "| テーマ | 該当 | 素材級（提供元） | 数字あり（提供元） | 未使用 素材級／数字 | 判定 | 既存記事 |", "|---|---:|---:|---:|---:|---|---|");
const rows = themes.map((t) => ({ t, c: count(match(t)) }));
for (const { t, c } of rows) {
  const arts = (t.articles ?? []).map((n) => "#" + n).join(" ");
  lines.push(`| ${t.name} | ${c.total} | ${c.sozai}（${c.vendorsS}） | ${c.num}（${c.vendorsN}） | ${c.unusedS}／${c.unusedN} | ${c.verdict} | ${arts} |`);
}
lines.push("", "### 記事がまだないテーマで、5選以上が組めるもの", "");
for (const { t, c } of rows.filter((r) => !(r.t.articles ?? []).length && /10選|5選/.test(r.c.verdict)).sort((a, b) => b.c.num - a.c.num))
  lines.push(`- ${t.name.trim()}: 素材級 ${c.sozai}・数字あり ${c.num}（未使用 ${c.unusedN}）→ ${c.verdict}`);

lines.push("", "## 困りごとタグ別（素材級15件以上）", "", "テーマ表にない切り口を探すための一覧。タグは1事例に複数付く。", "",
  "| タグ | 該当 | 素材級 | 数字あり | 未使用の数字あり |", "|---|---:|---:|---:|---:|");
const tagMap = new Map();
for (const c of cases) for (const tag of c.tags ?? []) {
  const e = tagMap.get(tag) ?? { total: 0, sozai: 0, num: 0, unusedN: 0 };
  e.total++; if (isSozai(c)) { e.sozai++; if (c.hasNumbers) { e.num++; if (!used(c)) e.unusedN++; } }
  tagMap.set(tag, e);
}
for (const [tag, e] of [...tagMap].filter(([, e]) => e.sozai >= 15).sort((a, b) => b[1].sozai - a[1].sozai))
  lines.push(`| ${tag} | ${e.total} | ${e.sozai} | ${e.num} | ${e.unusedN} |`);

lines.push("", "## 2本以上の記事に出ている事例", "", "同じ事例が看板になり続けないための確認。", "");
const dup = [...usedIn].filter(([, a]) => a.length >= 2).sort((a, b) => b[1].length - a[1].length);
if (!dup.length) lines.push("なし");
for (const [id, a] of dup) {
  const c = cases.find((x) => x.id === id);
  lines.push(`- ${c?.customer?.name ?? id}（${c?.vendor ?? "-"}）: ${a.map((x) => "#" + x.no).join(", ")}`);
}
lines.push("", "## 提供元の偏り（記事に出た回数が多い提供元）", "");
const vend = new Map();
for (const [id, a] of usedIn) { const c = cases.find((x) => x.id === id); if (c) vend.set(c.vendor, (vend.get(c.vendor) ?? 0) + a.length); }
for (const [v, n] of [...vend].sort((a, b) => b[1] - a[1]).slice(0, 15)) lines.push(`- ${v}: ${n}回`);
lines.push("");
fs.writeFileSync(path.join(ROOT, "content/articles/INVENTORY.md"), lines.join("\n"));
console.log(`content/articles/INVENTORY.md を書き出した（テーマ ${themes.length}、事例 ${cases.length}）`);
