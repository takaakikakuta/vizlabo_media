/* LinkedIn の DM で紹介する事例セレクションを探す。
 *   node scripts/linkedin/find-sen.mjs <キーワード...> [--vendor <語>] [--all] [--top N]
 *   node scripts/linkedin/find-sen.mjs --list          公開中の全セレクションを番号順に一覧（題・URL・提供元）
 *   例: node scripts/linkedin/find-sen.mjs 請求書 経理 AI-OCR --vendor fastaccounting
 *
 * 公開中（hidden/draft でなく、publishedAt が今日以前・日本時間）の事例セレクション（sen型）だけを対象に、
 * タイトル・リード・見出し・本文と、収録事例の提供元ドメイン・製品名・導入企業名・業種・タグ・課題文を
 * キーワードで横断検索して、当たりの多い順に出す。URL は https://vizlabo.com/articles/<slug>。
 *
 * --vendor は提供元の照合用。ドメイン、製品名、data/vendor_contacts.json の会社名に部分一致したら
 * 「提供元一致」として最優先に出す（相手の会社・製品の事例が入っている記事）。
 * --all で公開前（publishedAt が未来）の記事も含める（既定は公開中だけ。URL を送る用途なので）。
 * キーワードは正規表現として扱う（大文字小文字は無視）。「|」で同義語をまとめられる。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://vizlabo.com";
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf-8"));

const args = process.argv.slice(2);
const keywords = [];
let vendorQuery = null, includeFuture = false, top = 5, list = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--vendor") vendorQuery = args[++i];
  else if (a === "--all") includeFuture = true;
  else if (a === "--list") list = true;
  else if (a === "--top") top = Number(args[++i]) || 5;
  else keywords.push(a);
}
if (!keywords.length && !vendorQuery && !list) {
  console.error("使い方: node scripts/linkedin/find-sen.mjs <キーワード...> [--vendor <ドメイン|会社名|製品名>] [--all] [--top N]");
  process.exit(1);
}

const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const cases = new Map(read("data/cases.json").map((c) => [c.id, c]));
const contacts = fs.existsSync(path.join(ROOT, "data/vendor_contacts.json"))
  ? new Map(read("data/vendor_contacts.json").vendors.map((v) => [v.domain, v.company || ""])) : new Map();

const INDUSTRY = { manufacturing: "製造業", it: "IT・ソフトウェア", construction: "建設・不動産", logistics: "物流・運輸", medical: "医療・介護",
  finance: "金融・保険", retail: "小売・EC", food: "飲食・食品", education: "教育", "hr-service": "人材サービス", public: "自治体・公共",
  energy: "エネルギー・環境", "other-industry": "その他" };

const dir = path.join(ROOT, "content/articles");
const articles = fs.readdirSync(dir).filter((f) => f.startsWith("sen-") && f.endsWith(".json"))
  .map((f) => ({ file: f, ...read(`content/articles/${f}`) }))
  .filter((a) => a.format === "sen" && !a.hidden && !a.draft && (includeFuture || a.publishedAt <= today));

if (list) {
  console.log(`公開中の事例セレクション ${articles.length} 本（今日 ${today}）\n`);
  for (const a of [...articles].sort((x, y) => x.no - y.no)) {
    const cs = (a.items || []).map((it) => cases.get(it.caseId)).filter(Boolean);
    const vendors = [...new Set(cs.map((c) => c.vendor).filter(Boolean))];
    console.log(`#${String(a.no).padStart(3, "0")}  ${Array.isArray(a.title) ? a.title.join(" ") : a.title}`);
    console.log(`  ${SITE}/articles/${a.slug}  公開 ${a.publishedAt}  提供元: ${vendors.join(", ")}`);
  }
  process.exit(0);
}

const kwRes = keywords.map((k) => { try { return new RegExp(k, "i"); } catch { return new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); } });
const vendorRe = vendorQuery ? new RegExp(vendorQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

const scored = articles.map((a) => {
  const title = Array.isArray(a.title) ? a.title.join(" ") : String(a.title);
  const own = [title, a.lead || "", a.outroTitle || "", a.outro || "", ...(a.items || []).flatMap((it) => [it.headline || "", it.body || ""])].join("\n");
  const cs = (a.items || []).map((it) => cases.get(it.caseId)).filter(Boolean);
  const vendors = [...new Set(cs.map((c) => c.vendor).filter(Boolean))];
  const industries = [...new Set(cs.map((c) => INDUSTRY[c.customer?.industry] || c.customer?.industry).filter(Boolean))];
  const caseText = cs.map((c) => [c.vendor, contacts.get(c.vendor) || "", c.product, c.customer?.name, INDUSTRY[c.customer?.industry] || "", (c.tags || []).join(" "), c.challengeDetail, c.actions].join(" ")).join("\n");

  const hits = [];
  let score = 0;
  for (const re of kwRes) {
    const inTitle = re.test(title), inOwn = re.test(own);
    const caseHits = cs.filter((c) => re.test([c.vendor, c.product, c.customer?.name, (c.tags || []).join(" "), c.challengeDetail, c.actions, INDUSTRY[c.customer?.industry] || ""].join(" "))).length;
    if (inTitle) score += 5;
    if (inOwn) score += 2;
    score += Math.min(caseHits, 5);
    if (inTitle || inOwn || caseHits) hits.push(`${re.source}${inTitle ? "（題）" : ""}${caseHits ? `×${caseHits}件` : ""}`);
  }
  const vendorHit = vendorRe ? cs.filter((c) => vendorRe.test([c.vendor, contacts.get(c.vendor) || "", c.product].join(" "))) : [];
  if (vendorHit.length) score += 100 + vendorHit.length;
  return { a, title, score, hits, vendors, industries, vendorHit, n: cs.length };
}).filter((r) => r.score > 0).sort((x, y) => y.score - x.score || y.a.publishedAt.localeCompare(x.a.publishedAt));

if (!scored.length) {
  console.log(`該当なし（公開中の事例セレクション ${articles.length} 本を検索）。キーワードを広げるか同義語を | で足す。`);
  process.exit(0);
}
console.log(`公開中の事例セレクション ${articles.length} 本から上位 ${Math.min(top, scored.length)} 本（今日 ${today}）\n`);
for (const r of scored.slice(0, top)) {
  console.log(`#${String(r.a.no).padStart(3, "0")}  ${r.title}`);
  console.log(`  URL: ${SITE}/articles/${r.a.slug}`);
  console.log(`  公開: ${r.a.publishedAt}  収録: ${r.n}件  score: ${r.score}`);
  if (r.vendorHit.length) console.log(`  提供元一致: ${[...new Set(r.vendorHit.map((c) => `${c.vendor}（${c.product}／${c.customer?.name || "匿名"}）`))].join("、")}`);
  if (r.hits.length) console.log(`  当たり: ${r.hits.join("、")}`);
  console.log(`  提供元: ${r.vendors.slice(0, 12).join(", ")}${r.vendors.length > 12 ? " …" : ""}`);
  console.log(`  業種: ${r.industries.join("、")}`);
  console.log();
}
