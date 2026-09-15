/* メルマガ購読の型と検証。クライアント／サーバー両方から使う。 */

export type SubscribeState = {
  status: "idle" | "ok" | "error";
  error?: string;
  email?: string;   // 失敗時に入力を戻す
};

export const initialSubscribeState: SubscribeState = { status: "idle" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email) return "メールアドレスを入力してください。";
  if (!EMAIL.test(email)) return "メールアドレスの形式が正しくありません。";
  if (email.length > 200) return "200文字以内で入力してください。";
  return null;
}
