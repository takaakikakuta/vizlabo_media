#!/usr/bin/env node
/* 事例セレクション（sen型）の記事を、書いた後に機械的に点検する。AIは使わず、記事 JSON と data/cases.json の照合だけで行う。
 * 報告だけを行い、ファイルは書き換えない。基準は content/articles/WRITING-sen.md（2節・4節・7節）。
 *
 *   node scripts/verify/sen-check.mjs 47                         → 記事番号で指定
 *   node scripts/verify/sen-check.mjs sen-48-jichitai-gyosei.json → ファイル名で指定（複数可）
 *   node scripts/verify/sen-check.mjs ./draft/sen-99.json        → パスで指定（「/」を含むもの）
 *   node scripts/verify/sen-check.mjs --all                      → 全記事（hidden を除く）
 *   --quiet  要確認を出さず、NG だけ出す
 *   --dump   点検はせず、記事の各項目（見出し・body）と、その事例のデータ（課題・施策・成果）を並べて出す
 *            （/sen-check の読み手レビューに渡す材料。記事は1本だけ指定する）
 *
 * NG（直す。1件でもあれば終了コード 1）
 *   - body の長さが 80〜130字の外
 *   - 見出し・body の数字が、事例データでは見込み・予定として書かれているのに、断りがない
 *   - body の結びが「〜1本。」
 *   - 「選んだ」「入れた」「置いた」が記事の body 全体で4回以上／ダッシュ「——」が記事全体で3回以上
 * 要確認（目で確かめる。終了コードには影響しない）
 *   - 見出し・body の「数字＋単位」が、その事例のデータ（results・scale・要約・課題・施策・成果の文）に見つからない
 *     → 計算で出した数字（差額など）か、言い換え（6割→60%）か、別の指標の数字を書いていないかを確かめる
 *   - 言い換えの場合は、指標まで合っているか（07 の「紙の量 約6割」を「費用60%」と書いた例がある）
 *
 * 拾えないもの：文の意味が通るか、比較（「01が〜のに対し」「ここだけ」）が正しいか、事例データにない事実を書いていないか。
 * これは /sen-check（.claude/skills/sen-check）の読み手レビューで見る。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "content/articles");
const argv = process.argv.slice(2);
const quiet = argv.includes("--quiet");
const targets = argv.filter((a) => !a.startsWith("--"));

const files = fs.readdirSync(dir).filter((f) => /^sen-.*\.json$/.test(f)).sort();
const load = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) || f.includes("/") ? f : path.join(dir, f), "utf-8"));
let picked;
if (argv.includes("--all")) picked = files.filter((f) => !load(f).hidden);
else if (targets.length) {
  picked = targets.map((t) => {
    if (t.includes("/") && fs.existsSync(t)) return t; // 下書きをリポジトリの外に置いたときなど、パスで直接
    const f = files.find((x) => x === t || x === `${t}.json` || x === path.basename(t)) ?? files.find((x) => load(x).no === Number(t) && !load(x).hidden);
    if (!f) { console.error(`記事が見つからない: ${t}`); process.exit(2); }
    return f;
  });
} else { console.error("使い方: node scripts/verify/sen-check.mjs <番号|ファイル名>... | --all"); process.exit(2); }

const casesRaw = JSON.parse(fs.readFileSync(path.join(root, "data/cases.json"), "utf-8"));
const cases = new Map(casesRaw.map((c) => [c.id, c]));

if (argv.includes("--dump")) {
  if (picked.length !== 1) { console.error("--dump は記事を1本だけ指定する"); process.exit(2); }
  const a = load(picked[0]);
  const out = [`# #${a.no} ${[].concat(a.title).join(" / ")}`, "", `## lead`, a.lead, ""];
  (a.items ?? []).forEach((it, i) => {
    const c = cases.get(it.caseId) ?? {};
    const kv = (xs) => (xs ?? []).map((r) => `${r.metric}: ${r.value}`).join(" / ") || "（なし）";
    out.push(`## ${String(i + 1).padStart(2, "0")}`, "", "### 記事", `見出し: ${it.headline}`, `body: ${it.body}`, "",
      "### 事例データ", `会社: ${c.customer?.name || "（非公開）"}（${c.customer?.size || "規模不明"}・${c.customer?.dept || ""}）`,
      `題: ${c.title}`, `要約: ${c.summary}`, `課題: ${c.challengeDetail}`, `施策: ${c.actions}`,
      `成果（数字）: ${kv(c.results)}`, `規模: ${kv(c.scale)}`, `成果（文）: ${c.resultsQualitative}`, "");
  });
  out.push("## outro", a.outroTitle, a.outro);
  console.log(out.join("\n"));
  process.exit(0);
}

/* 全角数字・カンマを正規化する */
const norm = (s) => String(s ?? "")
  .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
  .replace(/[，,](?=\d{3})/g, "").replace(/．/g, ".").replace(/[～~〜]/g, "〜").replace(/％/g, "%");

/* 「数字＋単位」を取り出す。「2〜4回」は 2 と 4 の両方。単位のない数字（01、050番号）と「本」「選」（記事内の本数）は見ない */
const UNIT = "%|割|倍|円|時間|分|秒|日|週間|週|か月|ヶ月|カ月|ヵ月|カ月間|年|人|名|件|枚|台|社|世帯|部|ページ|回|席|拠点|店舗|校|箇所|ポイント|pt|km|kg|t|トン|GB|TB|行|項目|種類|工程|言語";
const NUM_RE = new RegExp(`(\\d+(?:\\.\\d+)?)(?:〜(\\d+(?:\\.\\d+)?))?(万|億|千)?(?:${UNIT})`, "g");
function numbers(text) {
  const out = [];
  for (const m of norm(text).matchAll(NUM_RE)) {
    for (const n of [m[1], m[2]].filter(Boolean)) out.push({ token: m[0], value: n + (m[3] ?? "") });
  }
  return out;
}
/* 数字が事例データの中に、より大きな数字の一部としてではなく出てくるか */
const has = (hay, value) => new RegExp(`(?<![\\d.])${value.replace(".", "\\.")}(?![\\d])`).test(hay);
/* 言い換え：60% ↔ 6割 */
function paraphrase(hay, token, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (token.endsWith("%") && n % 10 === 0 && n <= 100 && has(hay, `${n / 10}割`)) return `${n / 10}割`;
  if (token.endsWith("割") && n <= 10 && new RegExp(`(?<![\\d.])${n * 10}%`).test(hay)) return `${n * 10}%`;
  return null;
}

const PROSPECT = /見込(?!客|み客|先|め)|試算|見通し|予定(?!通り|どおり|より)/;
const DASH = /——/g;
const CHOSE = /選んだ|入れた|置いた/g;

let ngTotal = 0, warnTotal = 0;
for (const f of picked) {
  const a = load(f);
  const ng = [], warn = [];
  (a.items ?? []).forEach((it, i) => {
    const no = String(i + 1).padStart(2, "0");
    const c = cases.get(it.caseId);
    if (!c) { ng.push(`${no} 事例が data/cases.json にない: ${it.caseId}`); return; }
    const body = it.body ?? "";
    const len = [...body].length;
    if (len < 80 || len > 130) ng.push(`${no} body が ${len}字（80〜130字）`);
    if (/1本。\s*$/.test(body)) ng.push(`${no} body の結びが「〜1本。」`);

    const hay = norm([c.title, c.summary, c.challengeDetail, c.actions, c.resultsQualitative, c.customer?.size,
      ...(c.results ?? []).flatMap((r) => [r.metric, r.value]), ...(c.scale ?? []).flatMap((r) => [r.metric, r.value])].join("\n"));
    /* 見出し・body の数字が、事例データの「見込み・予定」の文の中の数字なら、断りがあるかを見る */
    if (!PROSPECT.test(it.headline + body)) {
      const used = [...new Set(numbers(it.headline + "\n" + body).map((x) => x.value))];
      const src = norm([c.title, c.summary, c.resultsQualitative, ...(c.results ?? []).map((r) => `${r.metric}: ${r.value}`)].join("\n"));
      /* 括弧でも区切る。「売上（当期見込み）: 5億円（前の2億円から）」の「2億円」は実績なので、見込みの文に含めない */
      const hit = src.split(/[。、（(\n]/).find((s) => PROSPECT.test(s) && used.some((v) => has(s, v)));
      if (hit) ng.push(`${no} 事例データでは見込み・予定の数字だが、見出しにも body にも断りがない\n     データ: ${hit.trim()}`);
    }
    for (const [where, text] of [["見出し", it.headline], ["body", body]]) {
      const seen = new Set();
      for (const { token, value } of numbers(text)) {
        if (value === "1" || seen.has(value) || has(hay, value)) continue; // 「1日あたり」「1回の」は単位の言い方なので見ない
        seen.add(value);
        const p = paraphrase(hay, token, value);
        warn.push(p
          ? `${no} ${where}の「${token}」は事例データでは「${p}」。指標まで同じか確かめる`
          : `${no} ${where}の「${token}」が事例データに見つからない（計算した数字か、別の指標か）`);
      }
    }
    if (!(c.results ?? []).length && numbers(it.headline).length) warn.push(`${no} results が空の事例だが、見出しに数字がある`);
  });

  const bodies = (a.items ?? []).map((x) => x.body ?? "").join("\n");
  const chose = (bodies.match(CHOSE) ?? []).length;
  if (chose > 3) ng.push(`body 全体で「選んだ・入れた・置いた」が${chose}回（3回まで）`);
  const all = JSON.stringify([a.title, a.lead, a.items, a.outroTitle, a.outro]);
  const dash = (all.match(DASH) ?? []).length;
  if (dash > 2) ng.push(`ダッシュ「——」が${dash}回（2回まで）`);

  ngTotal += ng.length; warnTotal += warn.length;
  if (!ng.length && (quiet || !warn.length)) continue;
  console.log(`\n■ #${a.no} ${path.basename(f)}${a.draft ? "（下書き）" : ""}`);
  for (const m of ng) console.log(`  NG     ${m}`);
  if (!quiet) for (const m of warn) console.log(`  要確認 ${m}`);
}
console.log(`\n${picked.length}記事: NG ${ngTotal}件${quiet ? "" : ` / 要確認 ${warnTotal}件`}`);
process.exit(ngTotal ? 1 : 0);
