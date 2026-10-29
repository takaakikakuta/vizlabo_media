/* リンクのみ（linkOnly）にした事例が、どの記事・記念日にどう残っているかを洗い出す。
   使い方: node scripts/link-only/check.mjs

   取り下げ依頼を「リンクのみ」で受けるときの手順:
   1. data/cases.json の該当事例に "linkOnly": true を付ける（データは消さない）
   2. このスクリプトを走らせ、出てきた記事を直す
      - 事例セレクションの item に linkOnly.body（企業名・規模を伏せた1〜2文）を書く。見出しに会社が分かる情報があれば linkOnly.headline も
      - タイトル・リード・背景・比べる表・まとめで、その会社の社名・規模・成果の数字に触れている箇所を書き換える
        （書き方は content/articles/WRITING-sen.md の8節「リンクのみに耐える書き方」）
      - 比べる表（compare）は列が items と同順の位置指定なので、1社だけ外せない。
        列の値に規模・数字が残っていれば列を書き直すか、表ごと外す
      - 事例セレクション以外の型の記事は、リンクのみの表示を持たないので事例を差し替える
      - 記念日（content/days）は、書き出し（title/body。OGP・一覧に出る）と冒頭（intro）の社名・数字を書き換える。
        一言（note）に会社が分かる情報があれば、その item に linkOnly.note を書く
   ※ SNSに投稿済みのポストや配信済みのメルマガはここでは直せない。必要なら手で消す・編集する
   3. 何も出なくなったらコミットする

   見るもの（表に出る文面だけ）:
   - 社名（法人格を外した中核部分と、その最初の語）
   - 規模（customer.size のうち数字を含むもの。「従業員数8名（導入後）」なら「8名」でも探す。「大企業」「従業員数不明」のような区分は見ない）
   - 成果の数字（results の値から「80%」「2週間」「3年」「6か月」のような数字＋単位を取り出して探す）
   数字は同じ値が別の事例の話として書かれていることもあるので、出たものは目で確かめる。
   略称（日清食品HD など）や、言い換えた数字（「3分の1」）は拾えない。 */
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

/** 数字の照合用に表記を揃える。全角数字→半角、桁区切りのカンマを外す、％→%、波ダッシュ各種→〜、ヶ月・カ月・ヵ月→か月 */
function norm(s) {
  return String(s ?? "")
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/(\d),(?=\d{3})/g, "$1")
    .replace(/％/g, "%")
    .replace(/[～~]/g, "〜")
    .replace(/[ヶカヵケ]月/g, "か月");
}

/** 文中の「数字＋単位」（約・およそ は外す）。「2週間→3日」なら 2週間 と 3日 に分かれる */
const UNIT = "(?:%|割|倍|億円|万円|千円|円|時間|分|秒|週間|か月|年|日|件|名|人|社|店舗|店|拠点|台|回|本|枚|校|床|坪|㎡|km|kg|t)";
const TOKEN = new RegExp(`\\d+(?:\\.\\d+)?${UNIT}`, "g");
/** 1桁の数字は、単位が強いもの（%・倍・金額・時間・期間）だけ見る。「3件」「1回」は普通の文にも出るので外す */
const STRONG_UNIT = /^(?:%|割|倍|億円|万円|千円|時間|週間|か月|年)$/;
function numberKeys(text) {
  const out = new Set();
  for (const m of norm(text).matchAll(TOKEN)) {
    const tok = m[0];
    const digits = tok.match(/^\d+(?:\.\d+)?/)[0];
    const unit = tok.slice(digits.length);
    if (digits.length === 1 && !STRONG_UNIT.test(unit)) continue;
    out.add(tok);
  }
  return [...out];
}

/** 規模の照合用。数字を含む規模だけ（「従業員20名」「400床以上」）。区分だけの規模は見ない */
function sizeKeys(c) {
  const s = c.customer?.size;
  if (!s || !/[\d０-９]/.test(s)) return [];
  // 規模は会社を絞る情報なので、「8名」のような1桁も拾う（結びの文に出る数ではない）
  return [...new Set([norm(s), ...[...norm(s).matchAll(TOKEN)].map((m) => m[0])])];
}

/** 成果の数字の照合用。results の値から数字＋単位を取り出す */
function resultKeys(c) {
  return [...new Set((c.results ?? []).flatMap((r) => numberKeys(r.value)))];
}

/** 表に出る文面（JSON文字列）に、その事例の社名・規模・成果の数字が残っていないか。残っていれば1件ずつ文にして返す */
function findLeaks(c, shownJson, where) {
  const notes = [];
  for (const k of nameKeys(c.customer?.name)) {
    if (shownJson.includes(k)) { notes.push(`${c.id}: 社名「${k}」が${where}に残っている`); break; }
  }
  const text = norm(shownJson);
  const size = sizeKeys(c).filter((k) => text.includes(k));
  if (size.length) notes.push(`${c.id}: 規模「${size[0]}」が${where}に残っている`);
  const nums = resultKeys(c).filter((k) => text.includes(k));
  if (nums.length) notes.push(`${c.id}: 成果の数字「${nums.join("」「")}」が${where}に残っている可能性（別の事例の数字なら残してよい）`);
  return notes;
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
    const j = a.items.findIndex((x) => x.caseId === c.id);
    const it = a.items[j];
    if (!it?.linkOnly?.body) notes.push(`${c.id}: linkOnly.body が未設定（紹介文なしで出る）`);
    // 項目自身の読みどころは表に出ないので、それ以外の文面（タイトル・リード・背景・他の項目・まとめ）で探す。比べる表は列ごとに別で見る
    const shown = JSON.stringify({
      ...a, compare: undefined,
      items: a.items.map((x) => (x.caseId === c.id ? { linkOnly: x.linkOnly, headline: x.linkOnly?.headline ?? x.headline } : x)),
    });
    notes.push(...findLeaks(c, shown, "記事内"));
    // 比べる表：その会社の列（items と同順）に数字か社名が残っていれば、列を書き直すか表ごと外す
    if (a.compare?.rows?.length && j >= 0) {
      const col = a.compare.rows.map((r) => r.values?.[j] ?? "").join(" ");
      const around = JSON.stringify({ title: a.compare.title, intro: a.compare.intro, fit: a.compare.fit, note: a.compare.note });
      const no = String(j + 1).padStart(2, "0");
      if (/[\d０-９]/.test(col)) notes.push(`${c.id}: 比べる表の列 ${no} に数字が残っている（列を書き直すか、表ごと外す）`);
      notes.push(...findLeaks(c, around, "比べる表の前後"));
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
    // 表に出る文面だけで探す（note は linkOnly.note があればそちらが出る）
    const shown = JSON.stringify({
      title: d.title, body: d.body, intro: d.intro, theme: d.theme,
      items: d.items.map((x) => (x === it ? (x.linkOnly?.note ?? x.note) : x.note)),
    });
    notes.push(...findLeaks(c, shown, "記念日の文面"));
  }
  if (notes.length === 0) continue;
  problems += notes.length;
  console.log(`\n記念日 ${f}（${d.name}）`);
  for (const n of notes) console.log(`  - ${n}`);
}

console.log(problems ? `\n要対応 ${problems} 件` : `リンクのみの事例 ${linkOnly.size} 件。要対応なし`);
process.exitCode = problems ? 1 : 0;
