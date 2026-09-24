import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allCases, getCase } from "../../../lib/cases";
import { recommendCases } from "../../../lib/recommend";
import { challengeLabel, industryLabel, productLabel } from "../../../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../../../lib/visuals";
import { parseStat, statSize } from "../../../lib/stat";
import Adoption from "../../../components/Adoption";
import CoverImg from "../../../components/CoverImg";

/* ビルド出力の肥大化対策（Amplifyの220MB制限）:
   事前生成をやめ、初回アクセス時に生成してキャッシュするオンデマンドISRにする。
   revalidate 後は再生成されるので、データ更新はデプロイ or 24時間で反映される。 */
export const revalidate = 86400; // 24時間
export const dynamicParams = true;

export function generateStaticParams() {
  return []; // ビルド時は生成しない（オンデマンドで生成）
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = getCase(id);
  if (!c) return {};
  return { title: c.title, description: c.summary };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCase(id);
  if (!c) notFound();
  const recs = recommendCases(c, 5);
  const color = challengeStyle(primaryChallenge(c)).solid;

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* 見出し周り＝記事の扉 */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 font-bold text-ink2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {challengeLabel(primaryChallenge(c))}
        </span>
        <span className="text-line">|</span>
        <Link href={`/industry/${c.customer.industry}`} className="text-body no-underline hover:text-brand">
          {industryLabel(c.customer.industry)}
        </Link>
        <span className="text-line">|</span>
        <Link href={`/product/${c.productCategory}`} className="text-body no-underline hover:text-brand">
          {productLabel(c.productCategory)}
        </Link>
        {c.sample && <><span className="text-line">|</span><span className="text-muted">サンプル(仮)</span></>}
      </div>

      <h1 className="font-display mt-5 text-[27px] leading-[1.42] text-ink sm:text-[36px] sm:leading-[1.38]">
        {c.title}
      </h1>

      <p className="mt-6 border-l-2 border-ink pl-5 text-[15px] leading-[2.05] text-body">
        {c.summary}
      </p>

      {/* 出典画像があれば扉の写真として。無い事例も成立する組みにしてある */}
      {c.image && (
        <figure className="mt-8">
          <div className="relative h-[220px] w-full overflow-hidden border border-line sm:h-[300px]"
            style={{ background: `${color}10` }}>
            <CoverImg src={c.image} />
          </div>
          <figcaption className="mt-2 text-[11px] text-muted">出典ページより</figcaption>
        </figure>
      )}

      {/* 提供（製品）→ 導入（顧客） */}
      <div className="mt-9">
        <Adoption c={c} size="detail" />
      </div>

      {/* 導入企業の諸元＝奥付のような表 */}
      <dl className="mt-10 border-t border-line text-[13px]">
        <Row k="導入企業" v={c.customer.name || "（非公開）"} />
        <Row k="業種" v={industryLabel(c.customer.industry)} />
        {c.customer.size && <Row k="規模" v={c.customer.size} />}
        {c.customer.dept && <Row k="部門" v={c.customer.dept} />}
        <Row k="解決した製品" v={`${c.product}（${c.vendor}）`} />
        {c.period && <Row k="期間" v={c.period} />}
        {/* 導入規模＝成果ではない数値。奥付側に置き、成果の数字と混ぜない */}
        {c.scale?.map((s, i) => <Row key={`scale-${i}`} k={s.metric} v={s.value} />)}
      </dl>

      <Section no="01" title="課題">
        <p>{c.challengeDetail}</p>
        {c.background && <p className="mt-3 text-muted">{c.background}</p>}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {c.challenges.map((ch) => (
            <Link key={ch} href={`/challenge/${ch}`}
              className="border-b border-line text-[13px] font-bold text-ink no-underline hover:border-ink">
              {challengeLabel(ch)}の事例
            </Link>
          ))}
        </div>
      </Section>

      <Section no="02" title="やったこと">
        <p>{c.actions}</p>
        {c.alternatives && (
          <p className="mt-4 border-l border-line pl-4 text-[13px] text-muted">
            <b className="text-body">他に検討した選択肢：</b>{c.alternatives}
          </p>
        )}
      </Section>

      {/* 成果＝この記事の山。数字を大きく並べる */}
      <Section no="03" title="成果">
        {c.results.length > 0 && (
          <div className="grid gap-x-8 gap-y-7 border-y border-line py-7 sm:grid-cols-2">
            {c.results.map((r, i) => {
              const st = parseStat(r.value);
              return (
                <div key={i}>
                  <div className="label">{r.metric}</div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className={`num leading-none text-accent ${statSize(st.head, "xl")}`}>{st.head}</span>
                    {st.verb && <span className="text-[13px] font-bold text-accent/70">{st.verb}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {c.resultsQualitative && <p className="mt-5">{c.resultsQualitative}</p>}
      </Section>

      {/* 出典 */}
      <div className="mt-12 border-t border-line pt-5">
        <div className="label">この事例の出典（掲載元）</div>
        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="mt-2.5 block break-all border-b border-line pb-1 text-[13.5px] font-bold text-brand no-underline hover:border-brand">
          {c.sourceUrl} ↗
        </a>
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
          本ページは掲載元の公開事例の要約です。詳細・一次情報は出典元をご確認ください。
          掲載内容の修正・削除のご依頼は
          <Link href="/contact?topic=correction" className="border-b border-line no-underline hover:border-ink hover:text-ink">こちらの窓口</Link>
          へ。
        </p>
      </div>

      {/* 関連事例（なぜ付き） */}
      {recs.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display border-b border-ink pb-4 text-[21px] text-ink">この事例に興味があるなら</h2>
          <p className="mt-3 text-[12.5px] text-muted">似た悩み・別の解き方の事例を、おすすめの理由つきで。</p>
          <div className="mt-5 border-t border-line">
            {recs.map((r) => {
              const rs = r.c.results[0] ? parseStat(r.c.results[0].value) : null;
              return (
                <Link key={r.c.id} href={`/cases/${r.c.id}`}
                  className="row group block border-b border-line2 px-2 py-5 no-underline">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
                    <span>{industryLabel(r.c.customer.industry)}</span>
                    <span className="text-line">|</span>
                    <span>{productLabel(r.c.productCategory)}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-5">
                    <h3 className="font-display flex-1 text-[16px] leading-[1.5] text-ink group-hover:text-brand">
                      {r.c.title}
                    </h3>
                    {rs && (
                      /* 「2021年度1676件→2024年度3685件」のような長い値も来るので幅を制限する */
                      <span className="num max-w-[42%] shrink-0 truncate text-[20px] leading-none text-accent"
                        title={r.c.results[0].value}>
                        {rs.head}
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-[1.9] text-body">{r.reason}</p>
                  {/* 共通点はチップで見せる（困りごとタグ／業界／解き方の対比） */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.chips.map((chip) => (
                      <span key={chip.label} className={`border px-2 py-0.5 text-[11px] ${
                        chip.kind === "tag" ? "border-ink font-bold text-ink"
                        : chip.kind === "solution" ? "border-line bg-soft text-ink2"
                        : "border-line2 text-muted"}`}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-14 border border-ink bg-ink px-7 py-10 text-center text-white">
        <p className="label text-white/50">事例制作代行</p>
        <h2 className="font-display mt-3.5 text-[19px] leading-[1.6] sm:text-[22px]">
          こんな“伝わる事例”を、自社でもつくりたい方へ
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[13px] leading-[1.95] text-white/60">
          課題と成果が伝わる導入事例は、比較検討で選ばれる最強の営業資料。取材から執筆まで代行します。
        </p>
        <Link href="/produce"
          className="mt-7 inline-block border border-white bg-white px-6 py-2.5 text-[13.5px] font-bold text-ink no-underline transition hover:bg-transparent hover:text-white">
          事例制作を相談する
        </Link>
      </div>

      {/* メルマガ（読者向けの最後のコンバージョン）。入力はさせず、内容説明つきの登録ページへ渡す */}
      <div className="mt-10 border-y-2 border-ink py-9">
        <div className="mx-auto max-w-xl text-center">
          <p className="label">週刊 事例ナビ</p>
          <h2 className="font-display mt-3 text-[19px] leading-[1.6] text-ink">
            こうした解決事例を、週1回メールで
          </h2>
          <p className="mt-3 text-[12.5px] leading-[1.95] text-muted">
            毎週金曜配信。今週の事例セレクション2本と、新着の解決事例をお届けします。
          </p>
          <Link href="/newsletter"
            className="mt-6 inline-block border border-ink bg-ink px-7 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            メルマガの内容を見て登録する
          </Link>
        </div>
      </div>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-5 border-b border-line2 py-3">
      <dt className="w-24 shrink-0 text-muted">{k}</dt>
      <dd className="font-bold text-ink">{v}</dd>
    </div>
  );
}

function Section({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="flex items-baseline gap-3.5 border-b border-ink pb-3.5">
        <span className="num text-[12px] text-muted">{no}</span>
        <span className="font-display text-[20px] text-ink">{title}</span>
      </h2>
      <div className="mt-5 text-[14.5px] leading-[2.05] text-body">{children}</div>
    </section>
  );
}
