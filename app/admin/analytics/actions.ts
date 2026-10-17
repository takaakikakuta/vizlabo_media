"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, setAdminCookie } from "../../../lib/admin";
import { allow } from "../../../lib/ratelimit";

export type LoginState = { error?: string };

/** 管理ダッシュボードのログイン。合えばクッキーを発行して同じ画面へ戻る */
export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // 総当たり対策：IPごとに1時間10回まで
  if (!allow(`admin-login:${ip}`, 10, 60 * 60 * 1000)) {
    return { error: "試行回数が多すぎます。しばらく時間をおいてください。" };
  }
  const pw = String(fd.get("password") ?? "");
  if (!checkPassword(pw)) return { error: "パスワードが違います。" };
  await setAdminCookie();
  const back = String(fd.get("back") ?? "");
  redirect(back.startsWith("/admin/") ? back : "/admin/analytics");
}

export async function logout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/analytics");
}
