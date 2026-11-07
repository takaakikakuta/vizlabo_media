#!/usr/bin/env node
/* 提供元（ベンダー）への掲載連絡の記録。記事に出した提供元のうち、連絡済みで削除依頼がなかった先を残す。
 *
 *   node scripts/vendors/contacts.mjs                       → 公開中の記事（hidden・draft 以外）から提供元と記事を拾い、data/vendor_contacts.json に足す。
 *                                                              新しい提供元は「未連絡」、既存の提供元の新しい記事は notified: false で入る。手で書いた値は上書きしない。
 *                                                              あわせて content/articles/VENDORS.md（状態別の一覧）を書き出す
 *   node scripts/vendors/contacts.mjs --notified <記事slug|no> [YYYY-MM-DD]  → その記事の提供元すべてを連絡済みにする（日付省略時は今日）
 *   node scripts/vendors/contacts.mjs --pending <記事slug|no>                → その記事の提供元を未連絡に戻す
 *   node scripts/vendors/contacts.mjs --list                                 → 未連絡の提供元と記事を表示する
 *   node scripts/vendors/contacts.mjs --init-assume-notified                 → 初回だけ。今ある記事をすべて連絡済み（日付は記事の公開日・推定）にして作る
 *
 * 状態（status）: pending＝未連絡 / no-objection＝連絡済みで削除依頼なし / removed＝削除依頼あり（data/blocked_vendors.json から自動）
 * 削除依頼を受けたら blocked_vendors.json に足す（この記録は自動で removed になる）。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const FILE = "data/vendor_contacts.json";
const MD = "content/articles/VENDORS.md";
const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] ?? true) : undefined; };
const flagArg2 = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 2] : undefined; };

const blocked = read("data/blocked_vendors.json").vendors;
const blockedMap = new Map(blocked.map((v) => [v.domain, v]));
const cases = read("data/cases.json");
const byId = new Map(cases.map((c) => [c.id, c]));

/* 記事→事例ID（lib/articles.ts の articleCaseIds と同じ範囲） */
function caseIds(a) {
  switch (a.format) {
    case "sen": case "yougo": return (a.items ?? []).map((x) => x.caseId);
    case "wakaremichi": return [a.caseA?.id, a.caseB?.id, a.verification?.caseId];
    case "genba": return [a.axisId, ...(a.paths ?? []).flatMap((p) => p.caseIds ?? [])];
    case "dounyumae": return [...(a.types ?? []).flatMap((t) => (t.quotes ?? []).map((q) => q.caseId)), ...(a.exits ?? []).flatMap((x) => x.caseIds ?? [])];
    case "chizu": return (a.routes ?? []).flatMap((r) => r.caseIds ?? []);
    case "ekkyou": return [a.caseA?.id, a.caseB?.id];
    case "butaiura": return [...(a.walls ?? []).flatMap((w) => w.caseIds ?? []), ...(a.approaches ?? []).flatMap((x) => x.caseIds ?? [])];
    default: return [];
  }
}
const seriesTag = (a) => (a.format === "yougo" ? "用語" : "") + "#" + String(a.no).padStart(3, "0");

const articles = fs.readdirSync(path.join(ROOT, "content/articles")).filter((f) => f.endsWith(".json"))
  .map((f) => ({ f, a: read("content/articles/" + f) }))
  .filter(({ a }) => !a.hidden && !a.draft)
  .sort((x, y) => x.a.publishedAt.localeCompare(y.a.publishedAt) || x.a.no - y.a.no);

const data = fs.existsSync(path.join(ROOT, FILE)) ? read(FILE) : { note: "", vendors: [] };
data.note = "提供元への掲載連絡の記録。scripts/vendors/contacts.mjs が公開中の記事から提供元と記事を足す（手で書いた status・notifiedAt・company・memo は上書きしない）。status: pending＝未連絡 / no-objection＝連絡済みで削除依頼なし / removed＝削除依頼あり（blocked_vendors.json から自動）。notifiedAtEstimated が true の日付は記事の公開日からの推定なので、分かれば直す。";
const vmap = new Map(data.vendors.map((v) => [v.domain, v]));
const init = args.includes("--init-assume-notified");
const assumeNotified = (a) => init && a.publishedAt <= today;  // 予約公開（公開日が未来）の記事は初回でも未連絡のまま

/* 1. 公開中の記事から提供元と記事を足す */
for (const { a } of articles) {
  const perVendor = new Map();
  for (const id of new Set(caseIds(a).filter(Boolean))) {
    const c = byId.get(id);
    if (!c || c.hidden) continue;
    if (!perVendor.has(c.vendor)) perVendor.set(c.vendor, { products: new Set(), customers: [] });
    const e = perVendor.get(c.vendor);
    if (c.product) e.products.add(c.product.split(/[（(]/)[0].trim());
    e.customers.push(c.linkOnly ? "（リンクのみ）" : c.customer?.name || "（非公開）");
  }
  for (const [domain, e] of perVendor) {
    let v = vmap.get(domain);
    if (!v) {
      v = { domain, company: "", status: assumeNotified(a) ? "no-objection" : "pending", notifiedAt: assumeNotified(a) ? a.publishedAt : "", notifiedAtEstimated: assumeNotified(a), products: [], articles: [], memo: "" };
      vmap.set(domain, v);
      data.vendors.push(v);
    }
    for (const p of e.products) if (!v.products.includes(p)) v.products.push(p);
    let art = v.articles.find((x) => x.slug === a.slug);
    if (!art) {
      art = { slug: a.slug, label: seriesTag(a), title: a.title.join(""), publishedAt: a.publishedAt, customers: [], products: [], notified: assumeNotified(a) };
      v.articles.push(art);
    }
    art.label = seriesTag(a); art.title = a.title.join(""); art.publishedAt = a.publishedAt;
    for (const c of e.customers) if (!art.customers.includes(c)) art.customers.push(c);
    art.products ??= [];
    for (const p of e.products) if (!art.products.includes(p)) art.products.push(p);
  }
}

/* 2. 連絡済み／未連絡の切り替え */
const findArticle = (key) => articles.find(({ a }) => a.slug === key || String(a.no) === String(key))?.a;
if (flag("--notified")) {
  const a = findArticle(flag("--notified"));
  if (!a) { console.error("記事が見つからない:", flag("--notified")); process.exit(1); }
  const date = flagArg2("--notified") && /^\d{4}-\d{2}-\d{2}$/.test(flagArg2("--notified")) ? flagArg2("--notified") : today;
  for (const v of data.vendors) {
    const art = v.articles.find((x) => x.slug === a.slug);
    if (!art) continue;
    art.notified = true; art.notifiedAt = date;
    if (v.status === "pending") { v.status = "no-objection"; v.notifiedAt = date; v.notifiedAtEstimated = false; }
    if (!v.notifiedAt) { v.notifiedAt = date; v.notifiedAtEstimated = false; }
  }
  console.log(`${seriesTag(a)} の提供元を連絡済み（${date}）にした`);
}
if (flag("--pending")) {
  const a = findArticle(flag("--pending"));
  if (!a) { console.error("記事が見つからない:", flag("--pending")); process.exit(1); }
  for (const v of data.vendors) {
    const art = v.articles.find((x) => x.slug === a.slug);
    if (!art) continue;
    art.notified = false; delete art.notifiedAt;
    if (!v.articles.some((x) => x.notified)) { v.status = "pending"; v.notifiedAt = ""; v.notifiedAtEstimated = false; }
  }
  console.log(`${seriesTag(a)} の提供元を未連絡に戻した`);
}

/* 3. 削除依頼（blocked_vendors.json）は自動で removed */
for (const v of data.vendors) {
  const b = blockedMap.get(v.domain);
  if (b) { v.status = "removed"; v.removedAt = b.blockedAt; v.removedReason = b.reason; }
}
for (const b of blocked) {
  if (!vmap.has(b.domain)) {
    const v = { domain: b.domain, company: b.name, status: "removed", notifiedAt: "", notifiedAtEstimated: false, products: [], articles: [], memo: "", removedAt: b.blockedAt, removedReason: b.reason };
    vmap.set(b.domain, v); data.vendors.push(v);
  } else if (!vmap.get(b.domain).company) vmap.get(b.domain).company = b.name;
}

data.vendors.sort((x, y) => x.domain.localeCompare(y.domain));
for (const v of data.vendors) v.articles.sort((x, y) => x.publishedAt.localeCompare(y.publishedAt));
fs.writeFileSync(path.join(ROOT, FILE), JSON.stringify(data, null, 2) + "\n");

/* 4. 一覧（md） */
const by = (s) => data.vendors.filter((v) => v.status === s);
const pendingArticles = (v) => v.articles.filter((x) => !x.notified);
const prods = (arts) => [...new Set(arts.flatMap((x) => x.products ?? []))].join("・") || "—";
const row = (v, arts) => `| ${v.domain}${v.company ? `（${v.company}）` : ""} | ${prods(arts)} | ${arts.map((x) => `${x.label}（${x.customers.join("、")}）`).join("<br>") || "—"} |`;
const md = [
  `# 提供元への掲載連絡の記録（${today} 時点）`, "",
  "`node scripts/vendors/contacts.mjs` で公開中の記事から提供元を足し、この一覧を書き直す。連絡したら `node scripts/vendors/contacts.mjs --notified <記事slug|no> [日付]`。削除依頼は `data/blocked_vendors.json` に足せば自動で「削除依頼あり」に移る。",
  "元データは `data/vendor_contacts.json`（会社名・メモ・正確な連絡日はそこに手で書く）。", "",
  `- 連絡済み・削除依頼なし: ${by("no-objection").length} 社（うち連絡日が推定のもの ${by("no-objection").filter((v) => v.notifiedAtEstimated).length} 社）`,
  `- 未連絡: ${by("pending").length} 社（記事単位で未連絡のものは下の表）`,
  `- 削除依頼あり: ${by("removed").length} 社`, "",
  "## 未連絡（これから掲載連絡する）", "",
  "| 提供元 | サービス | 記事（導入企業） |", "|---|---|---|",
  ...data.vendors.filter((v) => v.status !== "removed" && pendingArticles(v).length).map((v) => row(v, pendingArticles(v))),
  "", "## 連絡済み・削除依頼なし", "",
  "| 提供元 | 連絡日 | サービス | 記事（導入企業） |", "|---|---|---|---|",
  ...by("no-objection").map((v) => `| ${v.domain}${v.company ? `（${v.company}）` : ""} | ${v.notifiedAt}${v.notifiedAtEstimated ? "（推定）" : ""} | ${prods(v.articles.filter((x) => x.notified))} | ${v.articles.filter((x) => x.notified).map((x) => `${x.label}（${x.customers.join("、")}）`).join("<br>") || "—"} |`),
  "", "## 削除依頼あり（掲載しない）", "",
  "| 提供元 | 依頼日 | 理由 |", "|---|---|---|",
  ...by("removed").map((v) => `| ${v.domain}${v.company ? `（${v.company}）` : ""} | ${v.removedAt ?? ""} | ${v.removedReason ?? ""} |`),
  "",
];
fs.writeFileSync(path.join(ROOT, MD), md.join("\n"));

if (args.includes("--list")) {
  for (const v of data.vendors) {
    const p = pendingArticles(v);
    if (v.status !== "removed" && p.length) console.log(`${v.domain}: ${p.map((x) => x.label).join(" ")}`);
  }
}
console.log(`${FILE} と ${MD} を書き出した（提供元 ${data.vendors.length}：連絡済み ${by("no-objection").length}、未連絡 ${by("pending").length}、削除依頼 ${by("removed").length}）`);
