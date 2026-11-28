#!/usr/bin/env node
/* 事例でわかる技術用語（yougo型）の記事を、書いた後に機械的に点検する。AIは使わず、記事 JSON と data/cases.json の照合だけで行う。
 * 報告だけを行い、ファイルは書き換えない。基準は content/articles/WRITING-yougo.md。
 *
 *   node scripts/verify/yougo-check.mjs 7                  → 記事番号で指定
 *   node scripts/verify/yougo-check.mjs yougo-07-kyuyo.json → ファイル名で指定（複数可）
 *   node scripts/verify/yougo-check.mjs --all              → 全記事
 *
 * NG（直す。1件でもあれば終了コード 1）
 *   - body の長さが 80〜140字の外、または4文以上
 *   - headline・body・hitokoto の「数字」が、その事例のデータ（title・summary・課題・施策・results・scale・規模・製品名）に見つからない
 *     → 2026-11-21 に #7 西松屋の旧 body で「2か月→10日」（データは 2時間半→10分）、「16年使った」（データになし）が見つかったため NG 扱い。
 *       言い換え（16名→20人に満たない）は許容リストに入れるか、数字を使わない表現に直す
 *   - body・hitokoto に「」（固有名詞以外の強調）
 *   - 「唯一」が記事内で3回以上
 *   - 読みにくい言い回し（2026-11-21 に全項目から外した）：「記録されて」「として読める」「読みどころ」「出来事で読む」「点がほか」、
 *     比較を二度言う「〜中で、…ここだけ／ほかにない」
 * 拾えないもの：文の意味、比較（「ここだけ」「01が〜のに対し」）の正しさ、数字のない事実の裏付け。読んで確かめる。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "content/articles");
const argv = process.argv.slice(2);
const targets = argv.filter((a) => !a.startsWith("--"));
const files = fs.readdirSync(dir).filter((f) => /^yougo-\d+.*\.json$/.test(f)).sort();
const load = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) || f.includes("/") ? f : path.join(dir, f), "utf-8"));
let picked;
if (argv.includes("--all")) picked = files;
else if (targets.length) picked = targets.map((t) => /^\d+$/.test(t) ? files.find((f) => f.startsWith(`yougo-${t.padStart(2, "0")}-`)) : t).filter(Boolean);
else { console.error("記事番号・ファイル名・--all のいずれかを指定"); process.exit(2); }

const cases = JSON.parse(fs.readFileSync(path.join(root, "data/cases.json"), "utf-8"));
const byId = new Map(cases.map((c) => [c.id, c]));
const norm = (s) => String(s ?? "").replace(/[，,]/g, "").replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
// 数字そのものではない語（項目番号・「一つ」などの表現・この記事の本数）
const ALLOW = new Set(["1", "2", "3", "5", "10"]);

let ng = 0;
for (const f of picked) {
  const a = load(f);
  const out = [];
  let yuiitsu = 0;
  a.items.forEach((it, i) => {
    const no = String(i + 1).padStart(2, "0");
    const body = it.body ?? "";
    const sents = body.split("。").filter(Boolean).length;
    if (body.length < 80 || body.length > 140 || sents > 3) out.push(`[${no}] body ${body.length}字・${sents}文（80〜140字・3文以内）`);
    if (!it.headline) out.push(`[${no}] headline がない（数字か出来事の文）`);
    const text = (it.headline ?? "") + "\n" + body + "\n" + (it.hitokoto ?? "");
    if (/「/.test(text)) out.push(`[${no}] 「」がある（固有名詞以外は外す）`);
    if (/唯一/.test(body)) yuiitsu++;
    const meta = [[/記録されて/, "記録されて"], [/として読める/, "として読める"], [/読みどころ/, "読みどころ"], [/出来事で読む/, "出来事で読む"], [/点が、?ほか/, "点がほか"], [/中で[^。]*(ここだけ|ほかにない|唯一)/, "比較の二重"]].filter(([re]) => re.test(body)).map(([, n]) => n);
    if (meta.length) out.push(`[${no}] 読みにくい言い回し：${meta.join("・")}`);
    const c = byId.get(it.caseId);
    if (!c) { out.push(`[${no}] caseId ${it.caseId} が data/cases.json にない`); return; }
    const hay = norm([c.title, c.summary, c.challengeDetail, c.actions, c.resultsQualitative, c.customer?.size, c.customer?.name, c.product,
      ...(c.results || []).map((r) => r.metric + r.value), ...(c.scale || []).map((r) => r.metric + r.value)].join(" "));
    const nums = [...new Set((norm(text).replace(/\b0\d\b/g, "").match(/\d[\d.]*/g) || []))];
    const bad = nums.filter((n) => !ALLOW.has(n) && !hay.includes(n));
    if (bad.length) out.push(`[${no}] ${c.customer?.name}: 事例データにない数字 → ${bad.join(", ")}`);
  });
  if (yuiitsu >= 3) out.push(`「唯一」が ${yuiitsu} 回（2回まで）`);
  if (out.length) { ng += out.length; console.log(`\n## ${f}（#${a.no} ${a.term}）`); out.forEach((l) => console.log("  NG " + l)); }
  else console.log(`${f}（#${a.no} ${a.term}）: OK`);
}
process.exit(ng ? 1 : 0);
