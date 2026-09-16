import Link from "next/link";
import ContactForm from "../../components/ContactForm";
import NoteBanner, { NOTE_URL } from "../../components/NoteBanner";

export const metadata = {
  title: "事例制作代行",
  description: "比較検討で選ばれる導入事例を、取材・構成・執筆まで代行します。課題と成果が伝わる事例づくりをお手伝いします。",
};

const CONTACT = "#apply";

export default function ProducePage() {
  return (
    <div>
      {/* 扉 */}
      <section className="border-b border-ink">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <p className="label flex items-center justify-center gap-2.5">
            <span className="h-px w-6 bg-ink" />事例制作代行
          </p>
          <h1 className="font-display mt-6 text-[28px] leading-[1.45] text-ink sm:text-[38px] sm:leading-[1.4]">
            比較されて選ばれる導入事例を、<br />代わりにつくります
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[14.5px] leading-[2] text-body">
            買い手は「同じ課題を、何でどう解決したか」で比べています。課題と成果（数字）が伝わる事例は、
            それ自体が最強の営業資料。取材から執筆・図解まで一貫して代行します。
          </p>
          <Link href={CONTACT}
            className="mt-9 inline-block border border-ink bg-ink px-7 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            無料で相談する
          </Link>
          
        </div>
      </section>

      {/* なぜ良い事例が効くか */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">
          なぜ「良い事例」が受注を左右するのか
        </h2>
        <div className="mt-2 border-t border-line">
          {[
            ["検討フェーズで一番読まれる", "BtoBの買い手は問い合わせ前にじっくり情報収集します。導入事例は自分ごと化できる数少ないコンテンツです。"],
            ["数字が信頼をつくる", "「◯%削減」「◯倍」といった成果の数字が、抽象的な機能説明より雄弁に価値を伝えます。"],
            ["課題起点だと刺さる", "製品名ではなく課題から書かれた事例は、同じ悩みを持つ見込み客の検索・比較にヒットします。"],
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

      {/* 制作の流れ */}
      <section className="border-y border-line bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">制作の流れ</h2>
          <ol className="mt-2 border-t border-line">
            {[
              ["ヒアリング", "対象の顧客・課題・成果の当たりをつけます。"],
              ["取材", "導入企業・担当者に取材し、課題→施策→成果を引き出します。"],
              ["構成・執筆", "課題起点で、成果の数字が伝わる構成に落とし込みます。"],
              ["納品・掲載", "Webページ／PDF／本メディアへの掲載まで対応します。"],
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
        </div>
      </section>

      {/* noteでの発信 */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-display border-b border-ink pb-4 text-[22px] text-ink">
          事例の効果とノウハウを、noteで発信しています
        </h2>
        <p className="mt-5 text-[13.5px] leading-[2] text-body">
          「この事例がスゴイ」では成果につながった事例を理由つきで解剖し、
          「事例コラム」では事例の作り方・読ませ方のノウハウを公開しています。
          制作をご検討中の方の判断材料としてもお使いください。
        </p>
        <div className="mt-6">
          <NoteBanner />
        </div>
        <p className="mt-4 text-[13px]">
          <a href={NOTE_URL} target="_blank" rel="noopener noreferrer"
            className="border-b border-ink pb-0.5 font-bold text-ink no-underline hover:border-brand hover:text-brand">
            noteで連載を読む ↗
          </a>
        </p>
      </section>

      {/* 応募フォーム */}
      <section id="apply" className="scroll-mt-20 border-t border-ink bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display text-[24px] leading-[1.5] text-ink">制作の相談・お申し込み</h2>
          <p className="mt-4 max-w-xl text-[13.5px] leading-[2] text-body">
            「どの顧客の事例を作るべきか」から一緒に考えます。1本のサンプル構成のご提案も可能です。
            内容を確認のうえ、通常2〜3営業日以内にご連絡します。
          </p>
          <div className="mt-8">
            <ContactForm topic="produce" />
          </div>
        </div>
      </section>
    </div>
  );
}
