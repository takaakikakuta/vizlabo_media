/* リンクのみ（linkOnly）にした事例が、どの記事・記念日にどう残っているかを洗い出す。
   使い方: node scripts/link-only/check.mjs

   取り下げ依頼を「リンクのみ」で受けるときの手順:
   1. data/cases.json の該当事例に "linkOnly": true を付ける（データは消さない）
   2. このスクリプトを走らせ、出てきた記事を直す
      - 事例セレクションの item に linkOnly.body（企業名・規模を伏せた1〜2文）を書く。見出しに会社が分かる情報があれば linkOnly.headline も
      - タイトル・リード・背景・比べる表・まとめで企業名に触れている箇所を書き換える
      - 事例セレクション以外の型の記事は、リンクのみの表示を持たないので事例を差し替える
      - 記念日（content/days）は、書き出し（title/body。OGP・一覧に出る）と冒頭（intro）の企業名を書き換える。
        一言（note）に会社が分かる情報があれば、その item に linkOnly.note を書く
   ※ SNSに投稿済みのポストや配信済みのメルマガはここでは直せない。必要なら手で消す・編集する
   3. 何も出なくなったらコミットする */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const cases = JSON.parse(fs.readFileSync(path.join(root, "data/cases.json"), "utf-8"));
const linkOnly = new Map(cases.filter((c) => c.linkOnly && !c.hidden).map((c) => [c.id, c]));

/** 社名の照合用。法人格を外した中核部分と、その最初の語（「ゴンチャ ジャパン」→「ゴンチャ」）。
    短すぎるものは誤検知が多いので使わない。略称（日清食品HD など）は拾えないので、最後は目でも確かめる */
function nameKeys(name) {
  if (!name) return [];
  const core = name.replace(/(株式会社|有限会社|合同会社|一般社団法人|公益財団法人|一般財団法人|学校法人|医療法人|社会福祉法人|（株）|\(株\))/g, "").trim();
  const head = core.split(/[\s　・]/)[0];
  return [...new Set([name, core, head])].filter((k) => k.length >= 3);
}

const dir = path.join(root, "content/articles");
let problems = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const a = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  if (a.hidden) continue;
  const raw = JSON.stringify(a);
  const used = [...linkOnly.values()].filter((c) => raw.includes(c.id));
  if (used.length === 0) continue;

  const notes = [];
  for (const c of used) {
    if (a.format !== "sen") {
      notes.push(`${c.id}: 事例セレクション以外の型（${a.format}）。事例を差し替える`);
      continue;
    }
    const it = a.items.find((x) => x.caseId === c.id);
    if (!it?.linkOnly?.body) notes.push(`${c.id}: linkOnly.body が未設定（紹介文なしで出る）`);
    // 項目自身の読みどころは表に出ないので、それ以外の文面で社名を探す
    const shown = JSON.stringify({ ...a, items: a.items.map((x) => (x.caseId === c.id ? { linkOnly: x.linkOnly, headline: x.linkOnly?.headline ?? x.headline } : x)) });
    for (const k of nameKeys(c.customer?.name)) {
      if (shown.includes(k)) { notes.push(`${c.id}: 「${k}」が記事内に残っている`); break; }
    }
  }
  if (notes.length === 0) continue;
  problems += notes.length;
  console.log(`\n${f}（#${a.no} ${a.title.join("")}）`);
  for (const n of notes) console.log(`  - ${n}`);
}
const daysDir = path.join(root, "content/days");
for (const f of fs.readdirSync(daysDir).filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(daysDir, f), "utf-8"));
  const used = d.items.map((it) => ({ it, c: linkOnly.get(it.caseId) })).filter((x) => x.c);
  if (used.length === 0) continue;

  const notes = [];
  for (const { it, c } of used) {
    // 表に出る文面だけで社名を探す（note は linkOnly.note があればそちらが出る）
    const shown = JSON.stringify({
      title: d.title, body: d.body, intro: d.intro, theme: d.theme,
      items: d.items.map((x) => (x === it ? (x.linkOnly?.note ?? x.note) : x.note)),
    });
    for (const k of nameKeys(c.customer?.name)) {
      if (shown.includes(k)) { notes.push(`${c.id}: 「${k}」が記念日の文面に残っている`); break; }
    }
  }
  if (notes.length === 0) continue;
  problems += notes.length;
  console.log(`\n記念日 ${f}（${d.name}）`);
  for (const n of notes) console.log(`  - ${n}`);
}

console.log(problems ? `\n要対応 ${problems} 件` : `リンクのみの事例 ${linkOnly.size} 件。要対応なし`);
process.exitCode = problems ? 1 : 0;
