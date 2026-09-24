import Link from "next/link";
import { ListHead } from "../../components/CaseGrid";

/* 記事フォーマットの提案置き場。採用が決まったものから本番ルートへ移す。 */

export const metadata = { title: "【社内】記事フォーマット提案" };

const PROPOSALS = [
  {
    no: "1",
    series: "事例セレクション",
    title: "分かれ道 — 同じ課題、違う解決策。なぜ分かれたのか",
    desc: "同じ悩みを抱えた2社を向かい合わせ、分かれた理由を編集部が推理し、第三の事例で検算する編集記事。媒体の看板・信頼を作る枠。",
    kind: "編集記事（非広告）",
  },
  {
    no: "2",
    series: "導入の現場から",
    title: "タイアップ — 広告主の事例1本を、データの文脈で増幅する",
    desc: "比較・相対化はせず、〈課題の大きさ／実績の広がり／向いている会社の診断〉という横断データで主役を立てる。PR表記・編集ポリシー明示。収益枠。",
    kind: "タイアップ広告",
  },
  {
    no: "3",
    series: "導入前の日本",
    title: "アンソロジー — 成功談の「前半分」だけを、全部読む",
    desc: "1つの困りごとに該当する全事例の「導入前」をFableが読み、繰り返し現れる型と声を編む。製品もベンダーも主役にしない共感の読み物。集客（拡散・SEO）枠。",
    kind: "編集記事（集客）",
  },
];

export default function ProposalIndex() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="社内資料" title="記事フォーマット提案"
        sub="オリジナル記事の型の試作置き場。番号のページで実データによる完成イメージが見られます。" />
      <div className="border-t border-line">
        {PROPOSALS.map((p) => (
          <Link key={p.no} href={`/proposal/${p.no}`}
            className="row group block border-b border-line2 px-2 py-6 no-underline">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[13px] text-muted">案{p.no}</span>
              <span className="font-display text-[18px] text-ink group-hover:text-brand">{p.title}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-[1.9] text-body">{p.desc}</p>
            <p className="mt-2 text-[11px] text-muted">連載名：{p.series}／位置づけ：{p.kind}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
