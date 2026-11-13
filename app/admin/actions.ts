"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, checkPassword, isAdminToken } from "../../lib/admin";
import { allow } from "../../lib/ratelimit";
import {
  addUser, createInvite, getAccount, getApplication, getUser, normDomain, normEmail, revokeInvite,
  saveAccount, saveApplication, saveUser,
} from "../../lib/accounts";
import { vendorCases } from "../../lib/cases";
import { mailConfigured, sendMail } from "../../lib/mail";
import { SITE } from "../../lib/vendorAuth";

export async function login(fd: FormData): Promise<void> {
  const next = String(fd.get("next") ?? "/admin/views");
  const dest = next.startsWith("/admin/") ? next : "/admin/views";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(`admin:ip:${ip}`, 10, 60 * 60 * 1000) || !checkPassword(String(fd.get("password") ?? ""))) {
    redirect(`${dest}${dest.includes("?") ? "&" : "?"}error=1`);
  }
  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180,
  });
  redirect(dest);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}

// ─── ベンダー会員の管理（/admin/vendors）。どの操作も運営ログインを確かめてから行う ───

async function requireAdmin(): Promise<void> {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) redirect("/admin/vendors");
}

function back(params: Record<string, string>): never {
  redirect(`/admin/vendors?${new URLSearchParams(params)}`);
}

export async function approveApplication(fd: FormData): Promise<void> {
  await requireAdmin();
  const email = normEmail(String(fd.get("email") ?? ""));
  const domain = normDomain(String(fd.get("domain") ?? ""));
  const app = await getApplication(email);
  if (!app || app.status !== "pending") back({ error: "申し込みが見つかりません" });
  if (vendorCases(domain).length === 0) back({ error: `${domain} の事例がありません。提供元のドメインを確認してください` });
  if (await getUser(email)) back({ error: `${email} はすでに登録されています` });
  await addUser(email, domain, "apply");
  await saveApplication({ ...app, status: "approved", domain });
  const text = [
    `${app.company} ${app.person} 様`,
    "",
    "事例マニアのベンダー向けページのお申し込みを承認しました。",
    `下記からお申し込みのメールアドレス（${email}）でログインすると、${domain} の事例の閲覧数をご覧いただけます。`,
    "",
    `${SITE}/vendor`,
    "",
    "ログインのたびに、メールで6桁のコードをお送りします（パスワードは不要です）。",
    "",
    "────────────────────",
    "事例マニア（導入事例の専門メディア）",
    SITE,
  ].join("\n");
  if (!mailConfigured()) {
    console.info("[admin] メール未設定のためログのみ\n" + text);
    back({ done: `${email} を ${domain} で承認しました（メール未設定のため通知は送っていません）` });
  }
  try {
    await sendMail("【事例マニア】ベンダー向けページのご利用を承認しました", text, email);
  } catch (err) {
    console.error("[admin] 承認メールの送信に失敗", err);
    back({ done: `${email} を承認しました（承認メールの送信に失敗。手動で連絡してください）` });
  }
  back({ done: `${email} を ${domain} で承認し、メールで知らせました` });
}

export async function rejectApplication(fd: FormData): Promise<void> {
  await requireAdmin();
  const app = await getApplication(String(fd.get("email") ?? ""));
  if (app) await saveApplication({ ...app, status: "rejected" });
  back({ done: "申し込みを却下しました（メールは送っていません）" });
}

export async function issueInvite(fd: FormData): Promise<void> {
  await requireAdmin();
  const domain = normDomain(String(fd.get("domain") ?? ""));
  if (!domain || vendorCases(domain).length === 0) back({ error: `${domain || "（空）"} の事例がありません。提供元のドメインを確認してください` });
  const inv = await createInvite(domain);
  back({ issued: inv.code });
}

export async function cancelInvite(fd: FormData): Promise<void> {
  await requireAdmin();
  await revokeInvite(String(fd.get("code") ?? ""));
  back({ done: "招待を取り消しました" });
}

export async function setUserStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const u = await getUser(String(fd.get("email") ?? ""));
  if (!u) back({ error: "登録者が見つかりません" });
  const status = fd.get("status") === "disabled" ? "disabled" : "active";
  await saveUser({ ...u, status });
  back({ done: `${u.email} を${status === "disabled" ? "停止" : "再開"}しました` });
}

export async function setPaidUntil(fd: FormData): Promise<void> {
  await requireAdmin();
  const domain = normDomain(String(fd.get("domain") ?? ""));
  const until = String(fd.get("paidUntil") ?? "").trim();
  if (!domain) back({ error: "ドメインを入力してください" });
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) back({ error: "期限は YYYY-MM-DD で入力してください" });
  const acc = await getAccount(domain);
  await saveAccount({ ...acc, paidUntil: until || undefined });
  back({ done: until ? `${domain} を ${until} まで有料にしました` : `${domain} を無料に戻しました` });
}
