import { createHash, timingSafeEqual } from "node:crypto";

/* 運営用ページ（/admin/*）の簡易ログイン。ADMIN_PASSWORD（next.config.ts で焼き込み）と照合し、
   通ったらパスワード由来のトークンを httpOnly クッキーに入れる。パスワードを変えると全員ログアウトになる。
   同じクッキーを閲覧数の記録でも見て、運営自身の閲覧は数えない（app/api/views/route.ts）。 */

export const ADMIN_COOKIE = "jm_admin";

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function adminToken(): string {
  return createHash("sha256").update(`jirei-mania-admin:${process.env.ADMIN_PASSWORD ?? ""}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isAdminToken(value: string | undefined): boolean {
  return adminConfigured() && Boolean(value) && same(value!, adminToken());
}

export function checkPassword(input: string): boolean {
  return adminConfigured() && same(input, process.env.ADMIN_PASSWORD!);
}
