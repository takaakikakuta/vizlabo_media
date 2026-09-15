import Link from "next/link";
import { allCases, getCase } from "../../../lib/cases";
import { industryLabel, productLabel } from "../../../lib/taxonomy";

/* ── 提案3：集客フォーマット「導入前の日本」 ─────────────────────────
   成功談の集積から「導入前」の記述だけを抜き出すと、日本の職場の記録になる。
   1テーマ（困りごとタグ）につき1本。Fableが全事例の課題文を読み、
   繰り返し現れる「型」と「声」を編む。共感 → 拡散 → タグページへの導線が役割。
   引用はすべて掲載事例の実文。型の分類は編集部（Fable）が全文を読んで行った。 */

const AXIS_TAG = "業務の属人化";

export const metadata = {
  title: "導入前の日本｜「あの人しか分からない」——属人化に悩んだ83社の記録",
  description: "成功事例の「導入前」だけを83本読むと、日本の職場に繰り返し現れる4つの型が見えてくる。",
};

/* 編集部が83本を読んで分類した「4つの型」。代表の声は事例IDで指す（実文を描画する） */
const TYPES: { title: string; body: string; quoteIds: string[] }[] = [
  {
    title: "その人が休むと、止まる",
    body: "最も多い型。業務は回っている——その人がいる限りは。不在の一日が、リスクの棚卸しになる。",
    quoteIds: ["service-shippio-io-case-kyowa", "service-shippio-io-case-shiono-chemical"],
  },
  {
    title: "辞めて初めて、見える",
    body: "属人化は在職中には姿を見せない。退職・異動・引き継ぎの瞬間に、業務が個人のものだったことが発覚する。",
    quoteIds: ["service-shippio-io-case-tts", "www-consist-jp-casestudy-case09-html"],
  },
  {
    title: "同じ仕事のやり方が、人数分ある",
    body: "誰も怠けていない。全員が自分のやり方で真面目に働いている。だから直しにくい。",
    quoteIds: ["andpad-jp-cases-giken", "www-system-exe-co-jp-case"],
  },
  {
    title: "会社の記憶が、個人のExcelにある",
    body: "帳簿と、個人PCの表計算と、本人の記憶。会社の中核データの保管場所として、事例は繰り返しこの3つを挙げる。",
    quoteIds: ["andpad-jp-cases-takarabe", "www-freee-co-jp-cases-hamano"],
  },
];

/* 決まり文句＝課題文に繰り返し現れる言い回し（機械的に数える） */
const PHRASES: { label: string; re: RegExp }[] = [
  { label: "「担当者ごとに・バラバラ」", re: /ごとに異な|バラバラ|人によって/ },
  { label: "「担当者不在時に」", re: /不在/ },
  { label: "「ブラックボックス」", re: /ブラックボックス/ },
  { label: "「退職・離職・引き継ぎ」", re: /退職|離職|引き継|継承/ },
  { label: "「勘と経験」", re: /勘|経験と|経験に基づ/ },
  { label: "「Excel・表計算」", re: /Excel|エクセル|表計算|スプレッドシート/ },
];

export default function Proposal3Page() {
  const cases = allCases().filter((c) => (c.tags ?? []).includes(AXIS_TAG));
  const industries = new Set(cases.map((c) => c.customer.industry));

  const phraseCounts = PHRASES.map((p) => ({
    label: p.label,
    n: cases.filter((c) => p.re.test(c.challengeDetail ?? "")).length,
  })).filter((p) => p.n >= 3).sort((a, b) => b.n - a.n);

  // それでも抜け出した83社＝解き方の分布（タグページへの導線）
  const dist = new Map<string, number>();
  for (const c of cases) dist.set(c.productCategory, (dist.get(c.productCategory) ?? 0) + 1);
  const paths = [...dist.entries()]
    .filter(([cat]) => cat !== "other-product")
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 提案メモ（記事の一部ではない） ── */}
      <aside className="mb-12 border-2 border-ink bg-soft p-5">
        <p className="label">ご提案3：集客フォーマット「導入前の日本」</p>
        <p className="mt-3 text-[13px] leading-[1.95] text-body">
          役割は<b className="text-ink">共感と拡散（トップファネル）</b>。1テーマにつき、該当する全事例の
          「導入前」の記述だけをFableが読み、繰り返し現れる型と声を編みます。
          製品もベンダーも主役にしない、読者が「うちのことだ」と人に送りたくなる読み物。
          引用は実文、言い回しの件数は機械集計、型の分類だけが編集部の読みです。
          末尾でタグページへ送客します。
        </p>
      </aside>

      {/* ── 扉 ── */}
      <header>
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">導入前の日本</span>
          <span className="num text-[13px] text-muted">#001</span>
        </div>
        <h1 className="font-display mt-6 text-[27px] leading-[1.5] text-ink sm:text-[34px]">
          「あの人しか分からない」<br />
          ——属人化に悩んだ{cases.length}社の記録
        </h1>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">
          当サイトには400本の成功事例が載っている。だが今回は、成功の話をしない。
          事例の前半分——<b className="text-ink">「導入前」の記述だけ</b>を、{cases.length}本ぶん読んだ。
          そこに残っていたのは、従業員5名の会社から18万人の会社まで、
          {industries.size}の業種が驚くほど同じ言葉で語る、日本の職場の記録である。
        </p>
      </header>

      {/* ── 一 決まり文句 ── */}
      <Sec no="一" title={`決まり文句 — ${cases.length}本に繰り返し現れる言い回し`}>
        <p className="text-[13.5px] leading-[2.05] text-body">
          課題文に登場する言い回しを数えた。業種が違っても、症状の語彙は共通している。
        </p>
        <div className="mt-5 border-t border-line">
          {phraseCounts.map((p) => (
            <div key={p.label} className="flex items-baseline gap-4 border-b border-line2 px-2 py-3">
              <span className="font-display text-[15px] text-ink">{p.label}</span>
              <span className="num ml-auto shrink-0 text-[14px] text-ink2">{p.n}<span className="ml-0.5 text-[10px] text-muted">本</span></span>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 二 四つの型 ── */}
      <Sec no="二" title="四つの型 — 属人化は、こう姿を現す">
        <div className="space-y-10">
          {TYPES.map((t, i) => (
            <div key={t.title}>
              <h3 className="flex items-baseline gap-3 border-t-2 border-ink pt-4">
                <span className="num text-[13px] text-muted">型{i + 1}</span>
                <span className="font-display text-[18px] text-ink">{t.title}</span>
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[2.05] text-body">{t.body}</p>
              <div className="mt-4 space-y-4">
                {t.quoteIds.map((id) => {
                  const c = getCase(id);
                  if (!c) return null;
                  return (
                    <figure key={id} className="border-l border-line pl-5">
                      <blockquote className="font-display text-[13.5px] leading-[2] text-ink2">
                        「{c.challengeDetail}」
                      </blockquote>
                      <figcaption className="mt-1.5 text-[11px] text-muted">
                        — {industryLabel(c.customer.industry)}{c.customer.size && `／${c.customer.size}`}
                        <Link href={`/cases/${c.id}`} className="ml-2 no-underline hover:text-brand">事例 →</Link>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Sec>

      {/* ── 三 規模は関係ない ── */}
      <Sec no="三" title="規模は、関係ない">
        <p className="text-[13.5px] leading-[2.1] text-body">
          {cases.length}本の中で最も小さい組織は従業員5名、最も大きい組織は約18万人だった。
          属人化は中小企業の病気だと思われがちだが、記録はそれを否定する。
          大企業では「6名の担当者による個別対応」が、大学では「100以上の部門に分散した伝票処理」が、
          同じ顔をして現れる。<b className="text-ink">変わるのは規模ではなく、止まったときに困る人の数</b>だけである。
        </p>
      </Sec>

      {/* ── 四 それでも、抜け出した記録でもある ── */}
      <Sec no="四" title={`それでも — これは、抜け出した${cases.length}社の記録でもある`}>
        <p className="text-[13.5px] leading-[2.05] text-body">
          忘れてはいけないのは、ここに引いた言葉がすべて<b className="text-ink">「解決した会社」の回想</b>だということだ。
          {cases.length}社は実際に抜け出している。その道は1つではない。
        </p>
        <div className="mt-5 border-t border-line">
          {paths.map(([cat, n]) => (
            <div key={cat} className="flex items-baseline gap-4 border-b border-line2 px-2 py-3">
              <span className="text-[14px] text-body">{productLabel(cat)}で抜け出した</span>
              <span className="num ml-auto shrink-0 text-[14px] text-ink2">{n}<span className="ml-0.5 text-[10px] text-muted">社</span></span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/tag/${encodeURIComponent(AXIS_TAG)}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            #{AXIS_TAG} の事例{cases.length}件をすべて見る
          </Link>
          <Link href="/tags"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            他の困りごとを探す →
          </Link>
        </div>
      </Sec>

      {/* ── 結び ── */}
      <section className="mt-14 border-t-2 border-ink pt-6">
        <p className="font-display text-[15px] leading-[2.2] text-ink">
          あなたの会社の「あの人」は、今日も一人で回している。<br />
          それが美談で済んでいるのは、まだ誰も休んでいないからだ。
        </p>
      </section>
    </article>
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
