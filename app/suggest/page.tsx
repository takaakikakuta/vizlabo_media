import { siteStats } from "../../lib/cases";
import { ListHead } from "../../components/CaseGrid";
import SuggestForm from "../../components/SuggestForm";

/* URLサジェストの専用LP。トップのバナーと記事内の枠から流入する。 */

export const metadata = {
  title: "AI事例サジェスト｜貴社に近い導入事例をメールでお届け",
  description: "会社サイトのURLを入れるだけ。AIが貴社の事業を読み取り、同じ業界・同じ困りごとの導入事例を選んでメールでお届けします（無料）。",
};

export default function SuggestPage() {
  const s = siteStats();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <ListHead eyebrow="AI事例サジェスト" title="貴社に近い事例を、AIが探して届けます"
        sub={`会社サイトのURLを入れるだけ。AIが貴社の事業を読み取り、${s.total.toLocaleString()}件の掲載事例から「同じ業界の事例」と「同じ困りごとを解決した事例」を選んで、その場でメールにまとめてお送りします。無料・1通だけ。`} />

      <SuggestForm source="suggest-lp" />

      {/* 仕組みの説明（安心材料） */}
      <section className="mt-14">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />どうやって選んでいるか</p>
        <ol className="space-y-3.5 border-t border-line pt-5 text-[13.5px] leading-[1.95] text-body">
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">01</span>
            AIが貴社サイトの公開ページを1度だけ読み、事業内容・業界・抱えていそうな業務課題を推定します</li>
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">02</span>
            当サイトの掲載事例{s.total.toLocaleString()}件（{s.vendors}社）から、業界の一致・困りごとの一致でスコアリングします</li>
          <li className="flex gap-3"><span className="num shrink-0 text-[15px] text-muted">03</span>
            数値成果のある事例を優先して最大8本を選び、成果の数字と一緒にメールでお届けします</li>
        </ol>
      </section>

      <section className="mt-12">
        <p className="label mb-4 flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />よくある質問</p>
        <dl className="space-y-5 border-t border-line pt-5 text-[13.5px] leading-[1.95]">
          <div>
            <dt className="font-bold text-ink">費用はかかりますか？</dt>
            <dd className="mt-1 text-body">かかりません。メールも入力いただいたアドレスに1回お送りするだけです。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">営業の電話やメールが来ませんか？</dt>
            <dd className="mt-1 text-body">来ません。届いたメールに返信いただいた場合のみ、こちらからご連絡します。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">入力した情報はどう扱われますか？</dt>
            <dd className="mt-1 text-body">サジェストの生成と、事例マニアからのご案内以外には使用しません。</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
