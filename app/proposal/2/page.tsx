import Link from "next/link";
import { notFound } from "next/navigation";
import { allCases, getCase } from "../../../lib/cases";
import { challengeLabel, industryLabel, productLabel } from "../../../lib/taxonomy";
import { challengeStyle, primaryChallenge } from "../../../lib/visuals";
import { vendorLabel } from "../../../components/Adoption";
import CoverImg from "../../../components/CoverImg";

/* ── 提案2：タイアップ（広告）フォーマット「導入の現場から」 v2 ──────────
   役割分担：
     ・成果の数字・導入の経緯 → 事例記事（/cases/[id]）に任せる。ここでは書かない。
     ・この記事が書くのは、メディアにしか書けないこと＝
       「似た課題は他にもあった。解き方も複数あった。それでも、この会社には◯◯の必然があった」
   背景 → 選択肢の存在 → 必然性の論証 → あなたにもその必然があるか（診断） の4章。 */

const AXIS_ID = "andpad-jp-cases-11321";

export const metadata = {
  title: "導入の現場から｜月300枚の請求書と、現場監督の消えた3日間",
  description: "似た課題を抱えた会社は51社。解き方も複数あった。それでも佐藤工業にはANDPADの必然があった——その理由を掲載データから読み解くタイアップ企画の試作。",
};

export default function Proposal2Page() {
  const axis = getCase(AXIS_ID);
  if (!axis) notFound();

  const pc = primaryChallenge(axis);
  const color = challengeStyle(pc).solid;
  const provider = axis.product || vendorLabel(axis.vendor);
  const brand = vendorLabel(axis.vendor);
  const customer = axis.customer.name || "導入企業（非公開）";

  // 同じ悩み（共有タグ）を持つ事例の「解き方」分布——選んだ道も含めた全体地図
  const axisTags = new Set(axis.tags ?? []);
  const dist = new Map<string, number>();
  let painPool = 0;
  for (const c of allCases()) {
    if (c.id === axis.id) continue;
    if ((c.tags ?? []).some((t) => axisTags.has(t))) {
      painPool++;
      dist.set(c.productCategory, (dist.get(c.productCategory) ?? 0) + 1);
    }
  }
  const paths = [...dist.entries()]
    .sort((a, b) =>
      Number(a[0] === "other-product") - Number(b[0] === "other-product") || b[1] - a[1]);

  // 必然性の証拠＝同じベンダーの掲載実績
  const vendorCases = allCases().filter((c) => c.vendor === axis.vendor && c.id !== axis.id);
  const vendorIndustries = new Set([axis, ...vendorCases].map((c) => c.customer.industry)).size;

  // 適合診断＝このベンダーの全事例に頻出する「導入前の症状」
  const tagFreq = new Map<string, number>();
  for (const c of [axis, ...vendorCases]) for (const t of c.tags ?? []) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
  const fitTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* ── 提案メモ（記事の一部ではない） ── */}
      <aside className="mb-12 border-2 border-ink bg-soft p-5">
        <p className="label">ご提案2：タイアップ「導入の現場から」（v2・必然性フォーマット）</p>
        <p className="mt-3 text-[13px] leading-[1.95] text-body">
          成果の数字と導入の経緯は<b className="text-ink">事例記事に任せ、ここでは書きません</b>。
          この記事が書くのはメディアにしか書けないこと——
          <b className="text-ink">「似た課題は他にもあった。解き方も複数あった。それでも、この会社には{brand}の必然があった」の論証</b>です。
          背景 → 選択肢の存在 → 必然性 → あなたにもその必然があるか、の4章構成。
        </p>
      </aside>

      {/* ── PR表記＋題字 ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display border-b-2 border-ink pb-1 text-[15px] tracking-[.24em] text-ink">導入の現場から</span>
          <span className="text-[11px] text-muted">supported by {brand}</span>
        </div>
        <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted">Sponsored</span>
      </div>

      {/* ── 扉 ── */}
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {challengeLabel(pc)}
          </span>
          <span className="text-line">|</span>
          <span>{industryLabel(axis.customer.industry)}</span>
          <span className="text-line">|</span>
          <span>{axis.customer.size}</span>
        </div>
        <h1 className="font-display mt-5 text-[27px] leading-[1.45] text-ink sm:text-[34px]">
          月300枚の請求書と、<br />
          現場監督の「消えた3日間」
        </h1>
        <p className="font-display mt-3 text-[15px] text-body">
          ——{customer}に、{provider}という必然があった理由
        </p>
        <p className="mt-6 text-[14px] leading-[2.1] text-body">
          同じ悩みを抱えた会社は、当サイトに掲載中の事例だけで{painPool}社。解き方も1つではなかった。
          それでもこの会社の状況を読み解くと、選ばれた道には必然がある。
          事例そのものではなく、<b className="text-ink">「なぜこの会社には、この道だったのか」</b>を掲載データから読む。
        </p>
      </header>

      {axis.image && (
        <figure className="mt-8">
          <div className="relative h-[220px] w-full overflow-hidden border border-line sm:h-[300px]"
            style={{ background: `${color}10` }}>
            <CoverImg src={axis.image} />
          </div>
          <figcaption className="mt-2 text-[11px] text-muted">
            出典：<a href={axis.sourceUrl} target="_blank" rel="noopener noreferrer" className="no-underline hover:underline">{provider}導入事例（{customer}）</a>
          </figcaption>
        </figure>
      )}

      {/* ── 一 背景 ── */}
      <Sec no="一" title="背景 — この現場で何が起きていたか">
        <p className="text-[14px] leading-[2.1] text-body">{axis.challengeDetail}</p>
        <div className="mt-5 border-l border-line pl-5">
          <p className="label mb-2">この現場にあった症状</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(axis.tags ?? []).map((t) => (
              <Link key={t} href={`/tag/${encodeURIComponent(t)}`}
                className="border-b border-line text-[13px] text-ink no-underline hover:border-ink">#{t}</Link>
            ))}
          </div>
        </div>
        <p className="mt-5 text-[12.5px] text-muted">
          導入の経緯と成果の数字は
          <Link href={`/cases/${axis.id}`} className="mx-1 border-b border-line pb-0.5 font-bold text-ink no-underline hover:border-ink">
            事例記事
          </Link>
          に詳しい。本稿では「選択の理由」だけを掘る。
        </p>
      </Sec>

      {/* ── 二 選択肢はあった ── */}
      <Sec no="二" title={`選択肢はあった — 同じ悩みに、${paths.length}通りの道`}>
        <p className="text-[13.5px] leading-[2.05] text-body">
          {customer}と症状を共有する掲載事例{painPool}件の「選んだ道」を数えると、こうなる。
        </p>
        <div className="mt-5 border-t border-line">
          {paths.map(([cat, n]) => (
            <div key={cat} className="flex items-baseline gap-4 border-b border-line2 px-2 py-3">
              <span className={`text-[14px] ${cat === axis.productCategory ? "font-display text-ink" : "text-body"}`}>
                {productLabel(cat)}
                {cat === axis.productCategory && <span className="ml-2 text-[10.5px] font-bold text-ink2">← この会社が選んだ道</span>}
              </span>
              <span className="num ml-auto shrink-0 text-[14px] text-ink2">{n}<span className="ml-0.5 text-[10px] text-muted">社</span></span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-[1.95] text-muted">
          道は分かれている。つまり「どれでもよかった」わけではなく、それぞれの会社の事情が道を決めている。
          では、{customer}の事情は何を指していたのか。
        </p>
      </Sec>

      {/* ── 三 必然性の論証（この記事の心臓部） ── */}
      <Sec no="三" title={`それでも、${brand}の必然だった`}>
        <p className="border-l border-line pl-4 text-[11.5px] leading-relaxed text-muted">
          ※以下は、公開情報と掲載データから編集部が読み解いた「見立て」です。
        </p>

        <div className="mt-6 space-y-7">
          <div>
            <h3 className="flex items-baseline gap-3">
              <span className="num text-[13px] text-muted">必然1</span>
              <span className="font-display text-[16.5px] text-ink">悩みが「工程の一部」ではなく「流れ全体」にあった</span>
            </h3>
            <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">
              読み取りや転記を速くする道（RPA／AI-OCR）は、工程の一点を機械化する解き方だ。
              だがこの会社の時間は、受領 → 査定 → 承認 → 保管という<b className="text-ink">流れの全体</b>と、
              現場と本社の往復に溶けていた。一点を速くしても、流れは残る。
              流れごと載せ替えられる道具が要った——ここが最初の分岐である。
            </p>
          </div>

          <div>
            <h3 className="flex items-baseline gap-3">
              <span className="num text-[13px] text-muted">必然2</span>
              <span className="font-display text-[16.5px] text-ink">「経理の悩み」ではなく「現場の悩み」だった</span>
            </h3>
            <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">
              消えていた3日間は現場監督のものだ。経理側の道具（会計・経理システム）では、現場の時間は戻らない。
              経理と現場をひとつの流れでつなぐ、<b className="text-ink">建設業の商流に合った仕組み</b>が条件になる。
              この時点で、汎用の道具は候補から外れていく。
            </p>
          </div>

          <div>
            <h3 className="flex items-baseline gap-3">
              <span className="num text-[13px] text-muted">必然3</span>
              <span className="font-display text-[16.5px] text-ink">同じ業種で、実績が厚かった</span>
            </h3>
            <p className="mt-2.5 text-[13.5px] leading-[2.1] text-body">
              当サイトの掲載事例で見ても、{brand}の導入事例は<b className="num text-ink">{vendorCases.length + 1}</b>件。
              その大半が建設・不動産に集中し、隣の会社の成功が積み上がっている。
              従業員45名でIT専任を置けない会社にとって、<b className="text-ink">「同業で枯れている」ことは機能より重い選定基準</b>になる。
            </p>
          </div>
        </div>

        <p className="mt-7 border-t border-line pt-5 text-[13.5px] leading-[2.05] text-body">
          まとめれば——<b className="text-ink">流れ全体 × 現場起点 × 同業の実績</b>。
          この3条件が揃う会社にとって、{brand}は「選択肢の1つ」ではなく必然に近い。
          逆に条件が揃わなければ、二で見た別の道のほうが合う。それを確かめるのが次の章だ。
        </p>
      </Sec>

      {/* ── 四 診断 ── */}
      <Sec no="四" title="その必然は、あなたの会社にもあるか">
        <p className="text-[13.5px] leading-[2.05] text-body">
          {brand}の掲載事例{vendorCases.length + 1}件（{vendorIndustries}業種）に頻出する「導入前の症状」。
          心当たりが多いほど、あなたの会社にも同じ必然がある。
        </p>
        <div className="mt-5 border-t border-line">
          {fitTags.map(([t, n]) => (
            <div key={t} className="flex items-baseline gap-4 border-b border-line2 px-2 py-3.5">
              <span className="font-display text-[15px] text-ink">□ {t}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">
                掲載事例のうち<span className="num mx-1 text-[13px] text-ink2">{n}</span>件で言及
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-6">
          <Link href={`/cases/${axis.id}`}
            className="border border-ink bg-ink px-6 py-3 text-[13.5px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            この会社の事例記事を読む
          </Link>
          <a href={axis.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="self-center border-b border-ink pb-0.5 text-[13.5px] font-bold text-ink no-underline hover:border-brand hover:text-brand">
            一次情報（{brand}）↗
          </a>
        </div>
      </Sec>

      {/* ── PRポリシー表記 ── */}
      <footer className="mt-14 border-t border-line pt-5">
        <p className="text-[11px] leading-[1.9] text-muted">
          本記事はタイアップ広告です（提供：{brand}）。
          編集ポリシー：タイアップ記事でも、引用・件数はすべて公開事例と当サイトの掲載データに基づきます。
          「必然性」の読み解きは編集部の見立てであり、本文中にその旨を明示しています。
        </p>
        <p className="mt-4 text-[12px]">
          <Link href="/contact" className="border-b border-line pb-0.5 text-ink no-underline hover:border-ink">
            自社製品の事例で「導入の現場から」を制作したい方はこちら →
          </Link>
        </p>
      </footer>
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
