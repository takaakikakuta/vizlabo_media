/* 問い合わせフォームの型と検証。クライアント/サーバーの両方から使う（同じ規則で二重に検証する）。 */

export const TOPICS = [
  { value: "publish", label: "自社の事例を掲載してほしい" },
  { value: "produce", label: "事例の制作を依頼したい" },
  { value: "correction", label: "掲載内容の修正・削除の依頼" },
  { value: "other", label: "その他" },
] as const;

export type Topic = (typeof TOPICS)[number]["value"];

export type ContactInput = {
  topic: Topic;
  company: string;
  name: string;
  email: string;
  tel: string;
  dept: string;
  caseUrl: string;
  message: string;
};

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FIELD_LABEL: Record<keyof ContactInput, string> = {
  topic: "ご用件", company: "会社名", name: "お名前", email: "メールアドレス",
  tel: "電話番号", dept: "部署・役職", caseUrl: "事例ページのURL", message: "ご相談内容",
};

/** FormData から値を取り出して整形する（前後の空白は落とす）。 */
export function readContact(fd: FormData): ContactInput {
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  return {
    topic: (s("topic") || "publish") as Topic,
    company: s("company"), name: s("name"), email: s("email"),
    tel: s("tel"), dept: s("dept"), caseUrl: s("caseUrl"), message: s("message"),
  };
}

export function validateContact(v: ContactInput): FieldErrors {
  const e: FieldErrors = {};

  if (!TOPICS.some((t) => t.value === v.topic)) e.topic = "ご用件を選んでください。";
  if (!v.company) e.company = "会社名を入力してください。";
  else if (v.company.length > 100) e.company = "100文字以内で入力してください。";

  if (!v.name) e.name = "お名前を入力してください。";
  else if (v.name.length > 50) e.name = "50文字以内で入力してください。";

  if (!v.email) e.email = "メールアドレスを入力してください。";
  else if (!EMAIL.test(v.email)) e.email = "メールアドレスの形式が正しくありません。";
  else if (v.email.length > 200) e.email = "200文字以内で入力してください。";

  if (v.tel && !/^[\d+\-() 　]{6,20}$/.test(v.tel)) e.tel = "電話番号の形式が正しくありません。";
  if (v.dept.length > 100) e.dept = "100文字以内で入力してください。";

  if (v.caseUrl && !/^https?:\/\/\S+$/.test(v.caseUrl)) {
    e.caseUrl = "http:// または https:// から始まるURLを入力してください。";
  }
  // 修正・削除の依頼は、どのページのことか分からないと動けない
  if (v.topic === "correction" && !v.caseUrl) {
    e.caseUrl = "対象ページのURLを入力してください。";
  }

  if (!v.message) e.message = "ご相談内容を入力してください。";
  else if (v.message.length < 10) e.message = "10文字以上で入力してください。";
  else if (v.message.length > 2000) e.message = "2000文字以内で入力してください。";

  return e;
}

export const topicLabel = (t: string) => TOPICS.find((x) => x.value === t)?.label ?? t;

/* フォームの状態。Server Action のファイルは async 関数しか export できないので、
   状態の型と初期値はここに置く（"use server" ファイルから定数を export すると実行時に落ちる）。 */
export type ContactState = {
  status: "idle" | "ok" | "error";
  errors?: FieldErrors;
  formError?: string;
  values?: Partial<ContactInput>;   // 失敗時に入力を戻すため
};

export const initialContactState: ContactState = { status: "idle" };
