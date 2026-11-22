import Link from "next/link";
import ContactForm from "../../components/ContactForm";

/* ツール製作代行。見込み客に答えてもらう Web ツール（診断・シミュレーター・試算）を作る。
   未公開のため、サイト内の導線・サイトマップには載せず、検索にも出さない（URLを知っている人だけが開ける）。
   公開するときは robots を外し、layout のフッター・sitemap・lib/contact.ts の hidden を見直す。 */
export const metadata = {
  robots: { index: false, follow: false },
  title: "ツール製作代行｜診断・シミュレーターを企画から制作まで",
  description: "製品診断、料金シミュレーター、ROI試算。見込み客に答えてもらい、その答えを次の提案につなげるWebツールを、質問の設計から制作・計測まで代行します。",
};

const CONTACT = "#apply";

export default function ToolPage() {
  return (
    <div>
      {/* 扉 */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="label flex items-center justify-center gap-2.5">
            <span className="h-px w-6 bg-ink" />ツール製作代行
          </p>
          <h1 className="font-display mt-6 text-[28px] leading-[1.45] text-ink sm:text-[38px] sm:leading-[1.4]">
            答えてもらう診断・シミュレーターを、<br />代わりにつくります
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[14.5px] leading-[2] text-body">
            製品の説明を並べても、読まれるのは一部です。「あなたに合うのはどれか」「いくら安くなるか」と聞かれると、
            見込み客は自分の条件を入れてくれます。その答えは、営業が次に出す提案の材料になります。
            質問の設計から画面の制作、公開後の計測まで一貫して代行します。
          </p>
          <Link href={CONTACT}
            className="mt-9 inline-block border border-ink bg-ink px-7 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            無料で相談する
          </Link>
        </div>
      </section>

      {/* なぜ効くか */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">
          読ませるより、答えてもらう
        </h2>
        <div className="mt-2 border-t border-line">
          {[
            ["説明より入りやすい", "質問に答える、数字を入れる、といった操作は、長い説明文を読むより手間がかかりません。製品にまだ詳しくない人でも始められます。"],
            ["答えが商談の材料になる", "業種、規模、困っていること、予算。ツールに入れてもらった内容を営業に渡せば、最初の打ち合わせから相手に合わせた話ができます。"],
            ["相手ごとに次の連絡を変えられる", "診断の結果ごとに、送る資料やメールを分けられます。全員に同じ資料を送るより、読まれる内容になります。"],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-5 border-b border-line2 py-5">
              <span className="num shrink-0 pt-1 text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-display text-[16.5px] text-ink">{t}</div>
                <p className="mt-2 text-[13.5px] leading-[1.95] text-body">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 作れるもの */}
      <section className="border-y border-line bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">つくれるもの</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["製品・プラン診断", "いくつかの質問に答えると、合う製品やプランを理由つきで返します。"],
              ["料金シミュレーター", "人数や利用量を入れると、月額や年額の目安を出します。見積もり依頼の前の不安を減らせます。"],
              ["ROI・削減効果の試算", "今の作業時間やコストを入れると、導入後にどれだけ減るかを数字で示します。稟議の資料にも使われます。"],
              ["課題チェックリスト", "当てはまる項目を選ぶと、今の状態と優先して直すべき点を返します。"],
            ].map(([t, d]) => (
              <div key={t} className="border border-line bg-white px-5 py-5">
                <div className="font-display text-[16px] text-ink">{t}</div>
                <p className="mt-2 text-[13px] leading-[1.9] text-body">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] leading-[1.95] text-body">
            このサイトの
            <Link href="/finder" className="border-b border-line no-underline hover:border-ink hover:text-ink">事例ファインダー</Link>
            も、質問に順に答えると自社に近い事例が絞り込まれるツールです。同じ考え方で、御社の製品向けに設計します。
          </p>
        </div>
      </section>

      {/* 制作の流れ */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">制作の流れ</h2>
        <ol className="mt-2 border-t border-line">
          {[
            ["ヒアリング", "見込み客が製品を選ぶときに、最初に迷う点を一緒に洗い出します。"],
            ["質問と結果の設計", "何を聞き、どんな結果を返すかを決めます。答えを営業やメールでどう使うかもここで決めます。"],
            ["制作", "スマートフォンでも答えやすい画面をつくります。自社サイトへの埋め込みや、別ページでの公開に対応します。"],
            ["公開・計測", "回答数、途中でやめた質問、結果ごとの問い合わせ数を計測し、質問や結果の文面を直します。"],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-5 border-b border-line2 py-5">
              <span className="num shrink-0 pt-1 text-[12px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-display text-[16.5px] text-ink">{t}</div>
                <p className="mt-1.5 text-[13.5px] leading-[1.95] text-body">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 相談フォーム */}
      <section id="apply" className="scroll-mt-20 border-t border-ink bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display text-[24px] leading-[1.5] text-ink">制作の相談・お申し込み</h2>
          <p className="mt-4 max-w-xl text-[13.5px] leading-[2] text-body">
            「うちの製品なら何を聞けばいいか」から一緒に考えます。質問と結果の案を1つお出しすることもできます。
            内容を確認のうえ、通常2〜3営業日以内にご連絡します。
          </p>
          <div className="mt-8">
            <ContactForm topic="tool" />
          </div>
        </div>
      </section>
    </div>
  );
}
