#!/usr/bin/env node
/* 記事の提供元（ベンダー）に送る「掲載通知文」を、提供元ごとに1通ずつ作る。
 *
 *   node scripts/vendors/notify.mjs <記事slug|no|用語no>          例: notify.mjs 8 / notify.mjs 用語1 / notify.mjs b4f52a79-…
 *     --short          各社600字以内の短縮版も出す（追加掲載の案内と「SNSで使って大歓迎」の一文を削る）
 *     --no-url         記事URLの行を「記事URLはご返信いただければお送りします。」に替える（フォームがURLを弾く場合用）
 *     --tieup          追加掲載の段落の末尾にタイアップ制作の一文を足す
 *     --exclude a,b    ドメインで除外（例: --exclude sato.co.jp）
 *     --all            連絡済み（この記事で notified: true）の提供元も出す（既定では未連絡だけ）
 *
 * 文面はテンプレート固定。差し込むのは記事タイトル・記事URL・提供元の事例（導入企業名）だけで、数字や事例は記事データから足さない。
 * 提供元の会社名は data/vendor_contacts.json の company を使う（空ならドメインで見出しを作り、末尾の「要確認」に出す）。
 * 連絡済みの提供元には、これまでの記事ごとの連絡日と前回からの日数を出す（60日以上空いていたら再送の目安として印を付ける）。
 * 出力は標準出力と content/articles/notify/<記事ラベル>.md（git には入れない）。
 * 送ったら node scripts/vendors/contacts.mjs --notified <記事slug|no> [日付] で連絡済みにする。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const SITE = "https://vizlabo.com";

const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--exclude");
if (!key) { console.error("使い方: node scripts/vendors/notify.mjs <記事slug|no|用語no> [--short] [--no-url] [--tieup] [--exclude a,b] [--all]"); process.exit(1); }
const opt = { short: args.includes("--short"), noUrl: args.includes("--no-url"), tieup: args.includes("--tieup"), all: args.includes("--all") };
const exclude = new Set((args[args.indexOf("--exclude") + 1] ?? "").split(",").map((s) => s.trim()).filter((s) => args.includes("--exclude") && s));

/* 記事を探す：slug / 事例セレクションの no / 「用語」+no */
const articles = fs.readdirSync(path.join(ROOT, "content/articles")).filter((f) => f.endsWith(".json")).map((f) => read("content/articles/" + f)).filter((a) => !a.hidden);
const m = key.match(/^(用語|yougo)#?(\d+)$/i);
const a = articles.find((x) => x.slug === key)
  ?? (m ? articles.find((x) => x.format === "yougo" && String(x.no) === m[2]) : articles.find((x) => x.format !== "yougo" && String(x.no) === key));
if (!a) { console.error("記事が見つからない:", key); process.exit(1); }
if (a.draft) console.error("※ この記事は draft です（公開前）。");

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
const label = (a.format === "yougo" ? "用語" : "") + "#" + String(a.no).padStart(3, "0");
const title = a.title.join("");
const url = `${SITE}${a.format === "yougo" ? "/terms/" : "/articles/"}${a.slug}`;

const blocked = new Set(read("data/blocked_vendors.json").vendors.map((v) => v.domain));
const cases = new Map(read("data/cases.json").map((c) => [c.id, c]));
const contacts = fs.existsSync(path.join(ROOT, "data/vendor_contacts.json")) ? read("data/vendor_contacts.json").vendors : [];
const contact = (domain) => contacts.find((v) => v.domain === domain);
const RESEND_DAYS = 60;  // 前回の連絡からこれだけ空いたら再送の目安
const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
/* これまでの連絡履歴（この記事以外）。省略した記事は連絡に数えない。連絡日が記録にない記事は公開日で推定する */
function history(v, slug) {
  const arts = (v?.articles ?? []).filter((x) => x.slug !== slug && x.notified);
  const sent = arts.filter((x) => !x.skipped).map((x) => ({ label: x.label, date: x.notifiedAt || x.publishedAt, est: !x.notifiedAt }));
  const skipped = arts.filter((x) => x.skipped).map((x) => x.label);
  const last = sent.reduce((m, x) => (!m || x.date > m.date ? x : m), null);
  return { sent, skipped, last };
}

/* 法人格を外す（記事の表記に合わせ、敬称は「様」） */
const strip = (name) => name.replace(/(株式会社|有限会社|合同会社|合資会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|社会福祉法人|社会医療法人|医療法人社団|医療法人財団|医療法人|学校法人|特定非営利活動法人|NPO法人|独立行政法人|国立大学法人)/g, "").replace(/^[\s・]+|[\s・]+$/g, "").trim() || name;

/* 提供元ごとに事例をまとめる */
const groups = new Map();
const unknown = [];
for (const id of new Set(caseIds(a).filter(Boolean))) {
  const c = cases.get(id);
  if (!c) { unknown.push(`${id}（事例データが見つからない）`); continue; }
  if (c.hidden || blocked.has(c.vendor)) continue;  // 削除依頼を受けた先には送らない
  if (!c.vendor) { unknown.push(`${id}（提供元不明）`); continue; }
  const g = groups.get(c.vendor) ?? { domain: c.vendor, customers: [], anonymous: 0 };
  if (c.customer?.name && !c.linkOnly) { const n = strip(c.customer.name); if (!g.customers.includes(n)) g.customers.push(n); }
  else g.anonymous++;
  groups.set(c.vendor, g);
}

const needCheck = [...unknown];
const noCompany = [];
const out = [];
let n = 0;
for (const g of [...groups.values()].sort((x, y) => x.domain.localeCompare(y.domain))) {
  if (exclude.has(g.domain)) continue;
  const v = contact(g.domain);
  const art = v?.articles.find((x) => x.slug === a.slug);
  if (!opt.all && art?.notified) continue;
  const company = v?.company?.trim();
  if (!company) noCompany.push(g.domain);
  if (g.anonymous) needCheck.push(`${g.domain}：導入企業名が非公開の事例が${g.anonymous}件（文面では件数に含めていない）`);
  if (g.customers.length === 0) { needCheck.push(`${g.domain}：導入企業名が1件も出せないので文面を作っていない`); continue; }

  const cust = g.customers.length === 1
    ? `導入事例（${g.customers[0]}様）`
    : `導入事例${g.customers.length}件（${g.customers.map((c) => c + "様").join("、")}）`;
  const full = body({ cust, title, url, short: false, noUrl: opt.noUrl, tieup: opt.tieup });
  n++;
  out.push(`### ${n}. ${company || g.domain}`);
  out.push(`掲載事例: ${g.customers.join(" / ")}`);
  out.push(`提供元: ${g.domain}${v?.status === "no-objection" ? "（連絡済み・削除依頼なし）" : "（初めて連絡する先）"}`);
  const h = history(v, a.slug);
  if (h.last) {
    const days = daysBetween(h.last.date, todayJst);
    const list = h.sent.sort((x, y) => x.date.localeCompare(y.date)).map((x) => `${x.label} ${x.date}${x.est ? "（推定）" : ""}`).join(" / ");
    out.push(`連絡日: ${list}${h.skipped.length ? `（省略: ${h.skipped.join(" ")}）` : ""}`);
    out.push(`前回の連絡: ${h.last.date}${h.last.est ? "（推定）" : ""}・${days}日前${days >= RESEND_DAYS ? `　★${RESEND_DAYS}日以上空いている（再送の目安）` : ""}`);
  }
  out.push("```", full, "```");
  if (opt.short) {
    const s = body({ cust, title, url, short: true, noUrl: opt.noUrl, tieup: false });
    out.push(`短縮版（${[...s].length}字）`, "```", s, "```");
  }
  out.push("");
}
if (noCompany.length) needCheck.push(`会社名が未登録（見出しはドメイン。data/vendor_contacts.json の company に書くと次から出る）: ${noCompany.join(", ")}`);
out.push(`要確認: ${needCheck.length ? needCheck.join(" ／ ") : "なし"}`);

function body({ cust, title, url, short, noUrl, tieup }) {
  const urlLine = noUrl ? "記事URLはご返信いただければお送りします。" : `▼記事はこちら\n${url}`;
  const lines = [
    "突然のご連絡失礼いたします。BtoB導入事例の検索メディア「事例マニア」を運営しております、角田崇明と申します。",
    "",
    `このたび、編集記事にて貴社の${cust}を紹介させていただきました。`,
    "",
    `『${title}』`,
    urlLine,
    "",
    "当メディアは、各社が公開されている導入事例を「課題から探せる」形で整理したデータベース（現在10,000件超を収録）です。掲載は公開情報の要約と出典リンクのみで行い、本文の転載はしておりません。記事から貴社の事例ページへ直接リンクしています。",
    "",
    short
      ? "掲載内容に誤りやご不都合がございましたら、すぐに修正・削除いたしますのでお知らせください。"
      : "掲載内容に誤りやご不都合がございましたら、すぐに修正・削除いたしますのでお知らせください。もちろん、記事を貴社のSNSやお客様へのご案内にお使いいただくのは大歓迎です。",
  ];
  if (!short) {
    lines.push("", "また、貴社の他の導入事例の追加掲載も承っております（無償）。ご興味があればお気軽にご返信ください。" + (tieup ? "比較検討層に届く事例記事のタイアップ制作も承っております。" : ""));
  }
  lines.push("", "事例マニア 運営：角田崇明", "https://vizlabo.com", "kakuta@vizlabo.net");
  return lines.join("\n");
}

const head = [`# ${label} ${title}`, url, `提供元 ${groups.size} 社のうち ${n} 通（${opt.all ? "連絡済みも含む" : "未連絡のみ"}${opt.short ? "・短縮版つき" : ""}${opt.noUrl ? "・URLなし版" : ""}${opt.tieup ? "・タイアップあり" : ""}）`, ""];
const text = [...head, ...out].join("\n");
const dir = path.join(ROOT, "content/articles/notify");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${label.replace("#", "")}.md`);
fs.writeFileSync(file, text + "\n");
console.log(text);
console.log(`\n→ ${path.relative(ROOT, file)} に書き出した。送ったら: node scripts/vendors/contacts.mjs --notified ${a.format === "yougo" ? a.slug : a.no} [YYYY-MM-DD]`);
