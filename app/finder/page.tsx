import Link from "next/link";
import { siteStats } from "../../lib/cases";
import { AXES, SKIP, answerLabel, axisShort, finderHref, finderState, parseAnswers, type Answers } from "../../lib/finder";
import { SUGGEST_ENABLED } from "../../lib/flags";
import CaseGrid, { ListHead } from "../../components/CaseGrid";
import { TrackFinder } from "../../components/Track";

/* 事例ファインダー。質問に1つずつ答えると候補が絞られ、最後に自社に近い事例が並ぶ。
   状態はすべてURLクエリ（ind/sub/dept/eff/size/prod）に持つ：
   ・戻る・共有・リロードがそのまま効く
   ・事例データ（30MB超）をクライアントに送らずに済む（/cases と同じサーバー絞り込み）
   回答するたびにサーバーで候補を数え直し、0件になる選択肢は出さない。 */

export const metadata = {
  title: "事例ファインダー｜質問に答えるだけで、自社に近い事例へ",
  description: "業種・部門・ほしい成果・規模を順に選ぶだけ。掲載事例の中から、あなたの会社に近い導入事例を絞り込みます。",
};

const PER_PAGE = 50;

export default async function FinderPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const answers = parseAnswers(sp);
  const showResults = one(sp.r) === "1";
  const page = Math.max(1, parseInt(one(sp.p) ?? "1", 10) || 1);

  const st = finderState(answers);
  // 自動スキップされた軸もURLに反映しておく（戻る・共有で同じ画面になるように）
  const cur: Answers = Object.fromEntries(st.answered.map((a) => [a.key, a.value]));
  const s = siteStats();
  const done = !st.step;
  const started = st.answered.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      {/* 回答と結果到達を計測（「いま企業が困っていること」の一次データ）。
          自動スキップされた軸は数えないよう、URLにあった回答（answers）だけを渡す */}
      <TrackFinder answers={answers} showResults={done || showResults} count={st.candidates.length} />
      <ListHead eyebrow="事例ファインダー" title="質問に答えるだけで、自社に近い事例へ"
        sub={`業種・部門・ほしい成果・規模を順に選ぶだけ。${s.total.toLocaleString()}件の掲載事例から、あなたの会社に近い導入事例を絞り込みます。`} />

      {/* 進行状況：何問目か／残り候補／これまでの回答 */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line pb-5">
        <div className="flex items-end gap-8">
          <div>
            <p className="label">残り候補</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="num text-[34px] leading-none text-accent">{st.candidates.length.toLocaleString()}</span>
              <span className="text-[12px] text-muted">件</span>
            </p>
          </div>
          <div>
            <p className="label">質問</p>
            <p className="num mt-1 text-[20px] leading-none text-ink">
              {done ? st.total : st.no}<span className="text-[12px] text-muted"> / {st.total}</span>
            </p>
          </div>
        </div>
        {started && (
          <Link href="/finder" className="text-[12px] text-muted no-underline hover:text-ink">最初からやり直す ↺</Link>
        )}
      </div>

      {started && <AnswerChips cur={cur} />}

      {/* 質問（結果を先に見ているときは畳んで「続ける」リンクだけ） */}
      {st.step && !showResults && <Question st={st} cur={cur} />}
      {st.step && showResults && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border border-line bg-soft px-5 py-4">
          <p className="text-[13px] text-body">まだ質問が残っています。続けると、もっと絞れます。</p>
          <Link href={finderHref(cur)}
            className="border border-ink bg-ink px-4 py-2 text-[12.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            質問を続ける →
          </Link>
        </div>
      )}

      {/* 結果 */}
      {(done || showResults) && <Results st={st} cur={cur} page={page} showResults={showResults} />}
    </div>
  );
}

/* これまでの回答。チップの×でその回答だけ外せる（他の回答は保ったまま） */
function AnswerChips({ cur }: { cur: Answers }) {
  const items = AXES.filter((a) => cur[a.key] != null);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="label mr-1">回答</span>
      {items.map((a) => {
        const v = cur[a.key]!;
        const rest = { ...cur }; delete rest[a.key];
        // 業種を外したら細分も外す（細分は「その他」のときだけの質問）
        if (a.key === "ind") delete rest.sub;
        return (
          <Link key={a.key} href={finderHref(rest)} title="この回答を外す"
            className={`group inline-flex items-center gap-1.5 border px-2.5 py-1 text-[12px] no-underline transition hover:border-ink ${
              v === SKIP ? "border-line text-muted" : "border-ink2 text-ink"}`}>
            <span className="text-[10px] text-muted">{axisShort(a.key)}</span>
            <span className="font-bold">{answerLabel(a.key, v)}</span>
            <span className="text-muted group-hover:text-ink">×</span>
          </Link>
        );
      })}
    </div>
  );
}

function Question({ st, cur }: { st: ReturnType<typeof finderState>; cur: Answers }) {
  const step = st.step!;
  const max = step.options[0]?.count ?? 1;
  return (
    <section className="mt-9">
      <p className="label flex items-center gap-2.5">
        <span className="h-px w-5 bg-ink" />Q{st.no}
      </p>
      <h2 className="font-display mt-3 text-[24px] leading-[1.4] text-ink sm:text-[30px]">{step.axis.question}</h2>
      <p className="mt-2 text-[12.5px] text-muted">右の数字は、選ぶと残る事例の件数です。</p>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {step.options.map((o) => (
          <Link key={o.value} href={finderHref({ ...cur, [step.axis.key]: o.value })}
            className="group relative flex items-center justify-between gap-4 overflow-hidden border border-line bg-white px-4 py-3.5 no-underline transition hover:border-ink">
            {/* 件数の目安バー（最多を100%として、地色で薄く） */}
            <span aria-hidden className="absolute inset-y-0 left-0 bg-soft2 transition group-hover:bg-brand-soft"
              style={{ width: `${Math.max(4, Math.round((o.count / max) * 100))}%` }} />
            <span className="relative min-w-0">
              <span className="block text-[14px] font-bold text-ink group-hover:text-brand">{o.label}</span>
              {o.desc && <span className="mt-0.5 block text-[11px] text-muted">{o.desc}</span>}
            </span>
            <span className="relative shrink-0 text-right">
              <span className="num text-[16px] leading-none text-ink2">{o.count.toLocaleString()}</span>
              <span className="ml-0.5 text-[10px] text-muted">件</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-4 text-[12.5px]">
        <Link href={finderHref({ ...cur, [step.axis.key]: SKIP })}
          className="border-b border-ink pb-0.5 font-bold text-ink no-underline hover:border-brand hover:text-brand">
          この質問は問わない（スキップ）→
        </Link>
        {st.answered.length > 0 && (
          <Link href={finderHref(cur, { r: "1" })} className="text-muted no-underline hover:text-ink">
            ここまでの候補 <span className="num text-ink">{st.candidates.length.toLocaleString()}</span> 件を先に見る
          </Link>
        )}
      </div>
    </section>
  );
}

function Results({ st, cur, page, showResults }: {
  st: ReturnType<typeof finderState>; cur: Answers; page: number; showResults: boolean;
}) {
  const total = st.candidates.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const p = Math.min(page, totalPages);
  const slice = st.candidates.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  const href = (n: number) => finderHref(cur, { r: showResults ? "1" : undefined, p: n > 1 ? String(n) : undefined });

  return (
    <section className="mt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />結果</p>
          <h2 className="font-display mt-3 text-[22px] leading-[1.4] text-ink sm:text-[26px]">
            {total > 0 ? <>あなたの会社に近い事例 <span className="num text-accent">{total.toLocaleString()}</span> 件</> : "一致する事例がありませんでした"}
          </h2>
          {total > 0 && <p className="mt-1.5 text-[12.5px] text-muted">成果の数字がある事例を先に並べています。</p>}
        </div>
        {total > 0 && st.step == null && (
          <p className="text-[12px] text-muted">多すぎるときは、上の回答チップの「問わない」を具体的な答えに変えると絞れます。</p>
        )}
      </div>

      {total > 0 ? <CaseGrid cases={slice} /> : (
        <div className="border-y border-line py-14 text-center">
          <p className="text-[14px] text-body">この組み合わせの事例はまだ掲載されていません。</p>
          <p className="mt-2 text-[12px] text-muted">上の回答チップから条件をひとつ外してみてください。</p>
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="ページ送り" className="mt-8 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6">
          <p className="text-[12px] text-muted">
            <span className="num text-[13px] text-ink">{(p - 1) * PER_PAGE + 1}–{Math.min(p * PER_PAGE, total)}</span> 件 / 全
            <span className="num ml-1 text-[13px] text-ink">{total}</span> 件
          </p>
          <div className="flex items-center gap-2">
            {p > 1
              ? <Link href={href(p - 1)} className="border border-ink px-4 py-2 text-[12.5px] font-bold text-ink no-underline transition hover:bg-ink hover:text-white">← 前の{PER_PAGE}件</Link>
              : <span className="border border-line px-4 py-2 text-[12.5px] text-muted/50">← 前の{PER_PAGE}件</span>}
            {p < totalPages
              ? <Link href={href(p + 1)} className="border border-ink bg-ink px-4 py-2 text-[12.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">次の{PER_PAGE}件 →</Link>
              : <span className="border border-line px-4 py-2 text-[12.5px] text-muted/50">次の{PER_PAGE}件 →</span>}
          </div>
        </nav>
      )}

      {/* ピンと来なかったときの逃げ道 */}
      <div className="mt-12 grid gap-4 border-t border-ink pt-8 sm:grid-cols-2">
        {SUGGEST_ENABLED && (
          <Link href="/suggest" className="group border border-line bg-soft px-5 py-5 no-underline transition hover:border-ink">
            <p className="label">もっと自社に合わせて探す</p>
            <p className="font-display mt-2 text-[16px] text-ink group-hover:text-brand">AI事例サジェスト（無料）→</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">会社サイトのURLを入れるだけ。AIが事業を読み取り、近い事例をメールで届けます。</p>
          </Link>
        )}
        <Link href="/cases" className="group border border-line bg-soft px-5 py-5 no-underline transition hover:border-ink">
          <p className="label">キーワードで探す</p>
          <p className="font-display mt-2 text-[16px] text-ink group-hover:text-brand">すべての事例から検索 →</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">製品名・困りごとの一言・業種名などで全文検索できます。</p>
        </Link>
      </div>
    </section>
  );
}
