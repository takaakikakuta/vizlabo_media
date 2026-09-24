import Link from "next/link";
import { notFound } from "next/navigation";
import { allCases, getCase } from "../../../lib/cases";
import { industryLabel, productLabel } from "../../../lib/taxonomy";
import { hasDigit, parseStat, statSize } from "../../../lib/stat";
import type { CaseStudy } from "../../../lib/types";

/* ── 事例セレクション #001「分かれ道」（試作 v4） ─────────────────────────
   フォーマット：同じ悩みを抱えた2社が、正反対の解決策にたどり着いた。なぜか。
   ・素材（引用・数字・第三の事例）はすべて cases.json の実データ
   ・「なぜ分かれたか」の推理だけが編集部（＝Fable）の書き下ろし。推測であることを明示する
   ・検算（第三の事例でパターンを確認）まで行うのが、この連載の誠実さ  */

const A_ID = "www-fastaccounting-jp-case-20230427-11225";   // 日清食品HD（AI-OCR）
const B_ID = "www-freee-co-jp-cases-shinagawa-sakurakai";   // 社会福祉法人ふらい（電子契約）
const C_ID = "www-fastaccounting-jp-case-20230116-10010";   // 阪急アクトフォー（検算用）

export const metadata = {
  title: "事例セレクション #001｜同じ「紙とハンコ」で、道が分かれた",
  description: "同じ悩みを抱えた2社が正反対の解決策にたどり着いたのはなぜか。公開事例を突き合わせて読む連載の試作。",
};

/* それぞれの道を選んだ他の事例（読者の状況別リンク用） */
function pathExamples(cats: string[], mustTags: string[], exclude: string[], limit = 3) {
  return allCases()
    .filter((c) => !exclude.includes(c.id) && cats.includes(c.productCategory) &&
      (c.tags ?? []).some((t) => mustTags.includes(t)))
    .sort((a, b) => Number(b.hasNumbers) - Number(a.hasNumbers))
    .slice(0, limit);
}

export default function ProposalPage() {
  const a = getCase(A_ID);
  const b = getCase(B_ID);
  const c3 = getCase(C_ID);
  if (!a || !b || !c3) notFound();

  const readPath = pathExamples(["ai", "rpa"], ["紙の書類処理", "手作業の転記"], [A_ID, C_ID]);
  const erasePath = pathExamples(["saas"], ["押印・承認の遅れ", "紙の書類処理"], [B_ID]);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 提案メモ（記事の一部ではない） ── */}
      <aside className="mb-12 border-2 border-ink bg-soft p-5">
        <p className="label">ご提案：「事例セレクション」＝分かれ道フォーマット（試作 v4）</p>
        <p className="mt-3 text-[13px] leading-[1.95] text-body">
          <b className="text-ink">同じ課題 → 違う解決策 → なぜ分かれたのか</b>、を1本で解く形式です。
          引用・数字・第三の事例はすべて掲載データの実文。
          「なぜ」の推理だけが編集部の書き下ろしで、<b className="text-ink">推測であることを本文中に明示</b>しています。
          ペア候補はデータから機械的に発掘できるため（共有タグ×異なる解き方×対照的な規模）、連載として量産可能です。
        </p>
      </aside>

      {/* ── 扉 ── */}
      <header>
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">事例セレクション</span>
          <span className="num text-[13px] text-muted">#001</span>
        </div>
        <h1 className="font-display mt-6 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          同じ「紙とハンコ」に溺れた2社は、<br />
          なぜ正反対の道を選んだのか
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">
          年間30万枚と、月15時間。桁はまるで違うが、2つの組織は同じものに悩んでいた——紙とハンコである。
          そして片方は紙を<b className="text-ink">「読む機械」</b>を買い、
          もう片方は紙そのものを<b className="text-ink">「なくす契約」</b>を選んだ。
          どちらも成功事例として公開されている。では、道はどこで分かれたのか。2本の事例を突き合わせて読む。
        </p>
      </header>

      {/* ── 対面カルテ：2社を向かい合わせる ── */}
      <div className="mt-9 grid grid-cols-1 overflow-hidden border-2 border-ink sm:grid-cols-2">
        <VsCard c={a} path="読む機械" pathNote="AI-OCRで紙を読み取り、既存の承認システムへ流す" />
        <div className="border-t-2 border-ink sm:border-l-2 sm:border-t-0">
          <VsCard c={b} path="なくす契約" pathNote="契約を電子化し、紙の発生そのものを断つ" />
        </div>
      </div>

      {/* ── 一 同じ悩み ── */}
      <Sec no="一" title="同じ悩み — 2社の「導入前」を並べて読む">
        <div className="space-y-5">
          <Quote c={a} />
          <Quote c={b} />
        </div>
        <p className="mt-5 text-[13.5px] leading-[2.05] text-body">
          紙が届く。ハンコを押す。人が転記する。困りごとのタグはほぼ重なる
          （{sharedTags(a, b).map((t) => `#${t}`).join("、")}）。
          ここまでは同じ物語だ。
        </p>
      </Sec>

      {/* ── 二 分かれた決断 ── */}
      <Sec no="二" title="分かれた決断 — 読むか、なくすか">
        <div className="space-y-8">
          <Decision c={a} label="Aの道：紙を「読む」" body={a.actions} />
          <Decision c={b} label="Bの道：紙を「なくす」" body={b.actions} />
        </div>
      </Sec>

      {/* ── 三 なぜ分かれたか（編集部の読み） ── */}
      <Sec no="三" title="なぜ分かれたか — 編集部の読み">
        <p className="mb-6 border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※ここから先は、公開情報を突き合わせた編集部の推理です。両社の実際の意思決定過程は、当事者のみが知ります。
        </p>

        <Reason n="1" title="紙の「出どころ」が違った">
          最大の分岐点はここだと読む。日清食品HDの紙は<b className="text-ink">取引先から届く請求書</b>だ。
          相手のある紙は、自社の意思だけでは止められない。止められない紙は、読むしかない。
          一方、ふらいの紙は<b className="text-ink">自分たちで作る契約書</b>である。
          発生源が手の内にある紙は、なくすことができる。
          ——よそから来る紙は「読む」。自分で作る紙は「なくす」。同じ紙の悩みでも、出どころが道を決めた。
        </Reason>

        <Reason n="2" title="動かせるものの大きさが違った">
          1万4千人の基幹業務は、簡単には載せ替えられない。日清食品HDは既存の枠組みを軸に、
          入口の工程だけを機械化した。大組織の合理的な選択だ。
          対してふらいは、仕組みごと替える身軽さがあった。ただし専任のIT部門はない。
          事例には選定の決め手が明記されている——4社を比較し、
          <b className="text-ink">「既存のWordやPDFのフォーマットをそのまま流用でき、簡単な操作で署名押印ができる」</b>こと。
          読み取り精度で選んだ日清と、現場が使えるかで選んだふらい。選定基準そのものが、組織の形を映している。
        </Reason>

        <Reason n="3" title="成果の数字の「単位」が違う">
          結果の数字も対照的だ。日清は<b className="text-ink">年間約2万4千時間</b>——組織の数字。
          ふらいは<b className="text-ink">月15時間が7時間に</b>——担当者の手触りの数字。
          どちらが優れているという話ではない。読者が自社に引きつけるべきは、自社と同じ「単位」で語られた方だ。
        </Reason>
      </Sec>

      {/* ── 四 検算 ── */}
      <Sec no="四" title="検算 — 第三の会社は、どちらを選んだか">
        <p className="text-[13.5px] leading-[2.05] text-body">
          「出どころ」の読みが正しいなら、<b className="text-ink">よそから紙が届く組織</b>は規模を問わず「読む」道を選ぶはずだ。
          第三の事例で確かめる。{c3.customer.name}——グループ44社の経理業務を受託するシェアードサービス会社。
          届く紙は、まさに他社発の請求書の束である。
        </p>
        <Link href={`/cases/${c3.id}`}
          className="row group mt-5 flex items-center gap-4 border-y border-line px-2 py-4 no-underline">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] leading-snug text-ink group-hover:text-brand">{c3.title}</p>
            <p className="mt-1 text-[11.5px] text-muted">{industryLabel(c3.customer.industry)}／選んだ道：{c3.product}</p>
          </div>
          <span className="num shrink-0 text-[22px] leading-none text-accent">
            {parseStat(c3.results[0].value).head}
          </span>
        </Link>
        <p className="mt-4 text-[13.5px] leading-[2.05] text-body">
          選ばれたのはやはりAI-OCR——「読む」道だった。少なくともこの3社の範囲で、読みは崩れない。
        </p>
      </Sec>

      {/* ── 五 あなたの会社なら ── */}
      <Sec no="五" title="あなたの会社なら — 分かれ道の手前で問うこと">
        <div className="border-t border-line">
          <div className="border-b border-line2 py-5">
            <p className="font-display text-[16px] text-ink">問1. その紙は、どこから来るか</p>
            <p className="mt-2 text-[13px] leading-[1.95] text-body">
              よそから届く（請求書・納品書）なら「読む」道へ。自分たちで作る（契約書・申請書・帳票）なら「なくす」道へ。
            </p>
          </div>
          <div className="border-b border-line2 py-5">
            <p className="font-display text-[16px] text-ink">問2. 仕組みごと替えられるか</p>
            <p className="mt-2 text-[13px] leading-[1.95] text-body">
              基幹が動かせないなら入口の自動化（日清型）。身軽だが専任がいないなら、精度より「現場が使えるか」で選ぶ（ふらい型）。
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <PathList title="「読む」道を選んだ会社" cases={readPath} />
          <PathList title="「なくす」道を選んだ会社" cases={erasePath} />
        </div>
      </Sec>

      {/* ── 結び ── */}
      <section className="mt-14 border-t-2 border-ink pt-6">
        <h2 className="font-display text-[19px] text-ink">解体を終えて</h2>
        <p className="mt-4 text-[13.5px] leading-[2.05] text-body">
          ベンダーの事例は「なぜこの製品か」を語るが、「なぜ他の道ではないのか」は語らない。
          2本を向かい合わせて初めて、選択の理由が浮かび上がる。
          同じ悩みの分かれ道は、この2本の他にもデータの中に眠っている。次号も1つ、解体する。
        </p>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/tag/${encodeURIComponent("紙の書類処理")}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            #紙の書類処理 の事例をすべて見る
          </Link>
          <Link href="/contact"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            自社の事例も解体してほしい →
          </Link>
        </div>
      </section>
    </article>
  );
}

function sharedTags(a: CaseStudy, b: CaseStudy): string[] {
  const s = new Set(b.tags ?? []);
  return (a.tags ?? []).filter((t) => s.has(t));
}

/* 対面カルテの片翼 */
function VsCard({ c, path, pathNote }: { c: CaseStudy; path: string; pathNote: string }) {
  const r = c.results.find((x) => hasDigit(x.value)) ?? c.results[0];
  const st = r ? parseStat(r.value) : null;
  return (
    <div className="bg-white p-5">
      <p className="label">{industryLabel(c.customer.industry)}／{c.customer.size}</p>
      <p className="font-display mt-2 text-[17px] leading-snug text-ink">{c.customer.name}</p>
      <div className="mt-4 border-t border-line2 pt-3.5">
        <p className="text-[11px] text-muted">選んだ道</p>
        <p className="font-display mt-1 text-[16px] text-ink">{path}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{pathNote}</p>
      </div>
      {r && st && (
        <div className="mt-4 border-t border-line2 pt-3.5">
          <p className="label line-clamp-1">{r.metric}</p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className={`num leading-none text-accent ${statSize(st.head, "lg")}`}>{st.head}</span>
            {st.verb && <span className="text-[11px] font-bold text-accent/70">{st.verb}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* 導入前の実文引用 */
function Quote({ c }: { c: CaseStudy }) {
  return (
    <figure className="border-l border-line pl-5">
      <blockquote className="font-display text-[14.5px] leading-[2] text-ink2">「{c.challengeDetail}」</blockquote>
      <figcaption className="mt-2 text-[11.5px] text-muted">
        — {c.customer.name}（{c.customer.size}）の事例より
        <Link href={`/cases/${c.id}`} className="ml-2 no-underline hover:text-brand">資料 →</Link>
      </figcaption>
    </figure>
  );
}

function Decision({ c, label, body }: { c: CaseStudy; label: string; body?: string }) {
  return (
    <div>
      <h3 className="font-display text-[16.5px] text-ink">{label}</h3>
      <p className="mt-2.5 text-[13.5px] leading-[2.05] text-body">{body}</p>
      <p className="mt-2 text-[11.5px] text-muted">
        {c.customer.name}／製品：{c.product}（{productLabel(c.productCategory)}）
      </p>
    </div>
  );
}

function Reason({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 first:mt-0">
      <h3 className="flex items-baseline gap-3">
        <span className="num text-[13px] text-muted">読み{n}</span>
        <span className="font-display text-[17px] text-ink">{title}</span>
      </h3>
      <p className="mt-3 text-[13.5px] leading-[2.1] text-body">{children}</p>
    </div>
  );
}

function PathList({ title, cases }: { title: string; cases: CaseStudy[] }) {
  return (
    <div>
      <p className="label mb-3">{title}</p>
      <div className="border-t border-line2">
        {cases.map((c) => {
          const r = c.results.find((x) => hasDigit(x.value)) ?? c.results[0];
          const st = r ? parseStat(r.value) : null;
          return (
            <Link key={c.id} href={`/cases/${c.id}`}
              className="row group flex items-baseline gap-3 border-b border-line2 px-1 py-2.5 no-underline">
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-body group-hover:text-ink">
                {industryLabel(c.customer.industry)}／{c.customer.name || "非公開"}
              </span>
              {st && <span className="num max-w-[40%] shrink-0 truncate text-[13px] text-accent" title={r!.value}>{st.head}{st.verb}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Sec({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="flex items-baseline gap-3.5 border-b-2 border-ink pb-3.5">
        <span className="font-display text-[15px] text-muted">{no}</span>
        <span className="font-display text-[20px] leading-snug text-ink">{title}</span>
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
