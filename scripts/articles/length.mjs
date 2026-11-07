// 事例セレクション（sen）の lead・body・outro の字数を一覧し、上限超過に印を付ける。
// 使い方: node scripts/articles/length.mjs            # 全記事
//        node scripts/articles/length.mjs 54 55      # 記事番号で絞る
// 上限は WRITING-sen.md の規定（lead 200字・body 150字・outro 400字前後）。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIMIT = { lead: 200, body: 150, outro: 450 };
const dir = join(import.meta.dirname, "../../content/articles");
const only = new Set(process.argv.slice(2).map(Number).filter(Boolean));
const len = (s) => [...(s ?? "")].length;
let over = 0;

for (const f of readdirSync(dir).filter((f) => /^sen-\d+-.*\.json$/.test(f)).sort()) {
  const a = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (only.size && !only.has(a.no)) continue;
  const mark = (n, lim) => (n > lim ? `${n}!` : String(n));
  const bodies = a.items.map((it) => len(it.linkOnly?.body ?? it.body));
  const bad = bodies.filter((n) => n > LIMIT.body).length;
  over += bad + (len(a.lead) > LIMIT.lead ? 1 : 0) + (len(a.outro) > LIMIT.outro ? 1 : 0);
  console.log(
    `#${String(a.no).padStart(2, "0")} lead=${mark(len(a.lead), LIMIT.lead).padEnd(4)} outro=${mark(len(a.outro), LIMIT.outro).padEnd(4)} body=[${bodies.map((n) => mark(n, LIMIT.body)).join(" ")}]`,
  );
}
console.log(over ? `\n上限超過 ${over} か所` : "\n上限超過なし");
process.exit(over ? 1 : 0);
