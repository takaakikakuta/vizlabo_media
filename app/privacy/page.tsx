import Link from "next/link";

/* プライバシーポリシー。一括問い合わせ（リード取次・提供）の第三者提供条項が本体。
   文面を変えたら「制定・改定日」も更新すること。 */

export const metadata = {
  title: "プライバシーポリシー",
  description: "事例マニアにおける個人情報の取り扱いについて定めます。",
};

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. 取得する情報",
    body: (
      <>
        <p>当サイトは、各フォームの送信を通じて次の情報を取得します。</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>お問い合わせ・一括問い合わせ: 会社名、氏名、メールアドレス、電話番号（任意）、部署・役職（任意）、ご相談内容</li>
          <li>メルマガ登録: メールアドレス</li>
          <li>AI事例サジェスト: 会社サイトのURL、メールアドレス</li>
        </ul>
        <p className="mt-3">
          また、サービス改善のためGoogle タグマネージャー等を利用してアクセス情報（Cookie等）を取得します。
        </p>
      </>
    ),
  },
  {
    heading: "2. 利用目的",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>お問い合わせへの回答、受付確認のご連絡</li>
        <li>一括問い合わせの、対象サービス提供企業へのお取り次ぎ</li>
        <li>メルマガ「週刊 事例マニア」の配信</li>
        <li>AI事例サジェストのメール送付、および関連する事例のご案内</li>
        <li>サイトの利用状況の分析・改善</li>
      </ul>
    ),
  },
  {
    heading: "3. 第三者への提供",
    body: (
      <>
        <p>
          「まとめて問い合わせ」（一括問い合わせ）をご利用の場合、ご入力いただいた情報（会社名、氏名、メールアドレス、電話番号、ご相談内容）を、
          <strong className="font-bold text-ink">お客様が選択されたサービスの提供企業へ提供します</strong>。
          提供先の各企業から、ご入力の連絡先へ直接ご連絡が届くことがあります。
        </p>
        <p className="mt-3">
          上記のほかは、ご本人の同意がある場合または法令に基づく場合を除き、取得した個人情報を第三者に提供しません。
        </p>
      </>
    ),
  },
  {
    heading: "4. 委託先の利用",
    body: (
      <p>
        メール送信・サイト運営のため、業務に必要な範囲で外部サービス（メール配信、クラウドホスティング等）を利用します。
        これらの事業者には、目的の範囲内でのみ情報を取り扱わせます。
      </p>
    ),
  },
  {
    heading: "5. 開示・訂正・削除",
    body: (
      <p>
        ご自身の個人情報の開示・訂正・利用停止・削除をご希望の場合は、
        <Link href="/contact" className="underline hover:text-ink">お問い合わせフォーム</Link>
        からご連絡ください。ご本人であることを確認のうえ、速やかに対応します。
      </p>
    ),
  },
  {
    heading: "6. 改定",
    body: (
      <p>
        本ポリシーの内容は、必要に応じて改定することがあります。重要な変更がある場合は本ページでお知らせします。
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />Privacy Policy</p>
      <h1 className="font-display mt-4 text-[26px] leading-[1.5] text-ink">プライバシーポリシー</h1>
      <p className="mt-4 text-[13.5px] leading-[1.95] text-body">
        事例マニア（以下「当サイト」）は、ご利用者の個人情報を以下のとおり取り扱います。
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="border-b border-line pb-2.5 text-[15px] font-bold text-ink">{s.heading}</h2>
            <div className="mt-4 text-[13.5px] leading-[1.95] text-body">{s.body}</div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-5 text-[11.5px] text-muted">制定: 2026年9月30日</p>
    </div>
  );
}
