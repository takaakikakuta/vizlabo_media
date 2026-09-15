/* まとめて問い合わせ（記事に登場したサービスへの一括問い合わせ）の型と検証。
   クライアント/サーバーの両方から使う。状態の型と初期値もここに置く
   （"use server" ファイルから定数を export すると実行時に落ちる）。 */

export type InquiryInput = {
  services: string[];   // 問い合わせ対象のサービス（「サービス名（提供元）」の文字列）
  articleSlug: string;  // 出発点になった記事（取次時の文脈として使う）
  company: string;
  name: string;
  email: string;
  tel: string;
  message: string;
};

export type InquiryFieldErrors = Partial<Record<keyof InquiryInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const INQUIRY_FIELD_LABEL: Record<keyof InquiryInput, string> = {
  services: "問い合わせるサービス", articleSlug: "記事",
  company: "会社名", name: "お名前", email: "メールアドレス", tel: "電話番号",
  message: "検討状況・確認したいこと",
};

export function readInquiry(fd: FormData): InquiryInput {
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  return {
    services: fd.getAll("services").map((v) => String(v).trim()).filter(Boolean),
    articleSlug: s("articleSlug"),
    company: s("company"), name: s("name"), email: s("email"), tel: s("tel"),
    message: s("message"),
  };
}

export function validateInquiry(v: InquiryInput): InquiryFieldErrors {
  const e: InquiryFieldErrors = {};

  if (v.services.length === 0) e.services = "サービスを1つ以上選んでください。";
  else if (v.services.length > 30 || v.services.some((x) => x.length > 160)) {
    e.services = "選択内容が正しくありません。ページを開き直してお試しください。";
  }

  if (!v.company) e.company = "会社名を入力してください。";
  else if (v.company.length > 100) e.company = "100文字以内で入力してください。";

  if (!v.name) e.name = "お名前を入力してください。";
  else if (v.name.length > 50) e.name = "50文字以内で入力してください。";

  if (!v.email) e.email = "メールアドレスを入力してください。";
  else if (!EMAIL.test(v.email)) e.email = "メールアドレスの形式が正しくありません。";
  else if (v.email.length > 200) e.email = "200文字以内で入力してください。";

  if (v.tel && !/^[\d+\-() 　]{6,20}$/.test(v.tel)) e.tel = "電話番号の形式が正しくありません。";

  if (v.message.length > 2000) e.message = "2000文字以内で入力してください。";

  return e;
}

export type InquiryState = {
  status: "idle" | "ok" | "error";
  errors?: InquiryFieldErrors;
  formError?: string;
  values?: Partial<InquiryInput>;   // 失敗時に入力を戻すため
};

export const initialInquiryState: InquiryState = { status: "idle" };
