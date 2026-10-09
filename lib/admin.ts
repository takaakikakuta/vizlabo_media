import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* 管理画面（/admin/analytics）の簡易認証。
   ANALYTICS_ADMIN_PASSWORD（next.config.ts でビルド時に焼き込み）を知っている人だけ入れる。
   ログインすると、パスワードから導いた HMAC を httpOnly クッキーに持たせる（パスワード自体は置かない）。
   パスワードを変えると全員ログアウトになる。未設定なら管理画面は閉じる。 */

export const ADMIN_COOKIE = "vz_admin";
const MAX_AGE = 30 * 24 * 60 * 60; // 30日

function password(): string | undefined {
  return process.env.ANALYTICS_ADMIN_PASSWORD?.trim() || undefined;
}

export function adminConfigured(): boolean {
  return Boolean(password());
}

/** クッキーに入れる値（パスワードの HMAC）。 */
function token(pw: string): string {
  return createHmac("sha256", "vizlabo-media-admin").update(pw).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** 入力パスワードが正しいか */
export function checkPassword(input: string): boolean {
  const pw = password();
  return Boolean(pw) && safeEqual(input, pw!);
}

/** クッキー文字列（Route Handler で request.cookies から読んだ値）を検証 */
export function isAdminToken(value: string | undefined): boolean {
  const pw = password();
  return Boolean(pw && value && safeEqual(value, token(pw)));
}

/** 現在のリクエストが管理者としてログイン済みか（Server Component / Server Action 用） */
export async function isAdmin(): Promise<boolean> {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** ログイン用クッキーを発行 */
export async function setAdminCookie(): Promise<void> {
  const pw = password();
  if (!pw) return;
  (await cookies()).set({
    name: ADMIN_COOKIE,
    value: token(pw),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  // path を揃えて期限切れで上書きする（path 違いのクッキーは消えないため）
  (await cookies()).set({ name: ADMIN_COOKIE, value: "", path: "/admin", maxAge: 0 });
}
