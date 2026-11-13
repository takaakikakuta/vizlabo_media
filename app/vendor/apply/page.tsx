import Link from "next/link";
import ApplyForm from "../../../components/vendor/ApplyForm";

/* 招待なしの利用申し込み。運営が /admin/vendors で確認し、事例の提供元と結びつけて承認する。 */
export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="label">ベンダー向け</p>
      <h1 className="font-display mt-2 text-[24px] leading-snug text-ink">利用を申し込む</h1>
      <p className="mt-4 text-[13.5px] leading-[1.9] text-body">
        事例マニアに事例が掲載されている提供元（ベンダー）の方向けです。
        御社の事例であることを確認のうえ、ご入力のメールアドレスにご連絡します。
      </p>
      <div className="mt-8"><ApplyForm /></div>
      <p className="mt-10 border-t border-line pt-6 text-[13px] text-body">
        登録済みの方は <Link href="/vendor">ログイン</Link>
      </p>
    </div>
  );
}
