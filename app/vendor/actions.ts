"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  accountsConfigured, addUser, createInvite, getApplication, getUser, getValidInvite, issueOtp,
  markInviteUsed, normDomain, normEmail, saveApplication, sessionToken, userFromSession, validEmail, verifyOtp,
  OTP_MINUTES, SESSION_DAYS, VENDOR_COOKIE,
} from "../../lib/accounts";
import { mailConfigured, sendMail } from "../../lib/mail";
import { allow, guardForm } from "../../lib/ratelimit";
import { inviteUrl, SITE, type ApplyState, type AuthState, type TeamInviteState } from "../../lib/vendorAuth";

const HOUR = 60 * 60 * 1000;

async function clientIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function sendCode(email: string, code: string): Promise<void> {
  const body = [
    "事例マニアのベンダー向けページのログインコードです。",
    "",
    `　${code}`,
    "",
    `${OTP_MINUTES}分以内に、ログイン画面に入力してください。`,
    "このメールに心当たりがない場合は、破棄してください。",
    "",
    "────────────────────",
    "事例マニア（導入事例の専門メディア）",
    SITE,
  ].join("\n");
  if (!mailConfigured()) {
    console.info("[vendor] メール未設定のためログのみ", email, code);
    return;
  }
  await sendMail(`【事例マニア】ログインコード ${code}`, body, email);
}

/** ログインと招待からの登録。1つ目の画面でメールアドレス → コードを送る、2つ目でコードを照合する */
export async function vendorAuth(prev: AuthState, fd: FormData): Promise<AuthState> {
  if (!accountsConfigured()) return { step: "email", error: "現在ご利用いただけません。時間をおいてお試しください。" };
  const mode = fd.get("mode") === "join" ? "join" : "login";
  const inviteCode = String(fd.get("invite") ?? "");

  if (fd.get("step") !== "code" || fd.get("back")) {
    if (fd.get("back")) return { step: "email" };
    const email = normEmail(String(fd.get("email") ?? ""));
    if (!validEmail(email)) return { step: "email", email, error: "メールアドレスを確認してください。" };
    if (!allow(`vendor-otp:mail:${email}`, 5, HOUR) || !allow(`vendor-otp:ip:${await clientIp()}`, 20, HOUR)) {
      return { step: "email", email, error: "短時間に送信が集中しています。しばらく時間をおいてお試しください。" };
    }
    const user = await getUser(email);
    if (mode === "login") {
      if (!user || user.status !== "active") {
        return { step: "email", email, error: "このメールアドレスは登録されていません。招待をお持ちでない方は、利用申し込みからお申し込みください。" };
      }
    } else {
      const inv = await getValidInvite(inviteCode);
      if (!inv) return { step: "email", email, error: "招待の有効期限が切れているか、無効になっています。" };
      if (user && user.domain !== inv.domain) {
        return { step: "email", email, error: "このメールアドレスは別の提供元で登録されています。" };
      }
      if (user && user.status !== "active") return { step: "email", email, error: "このメールアドレスは利用を停止しています。" };
    }
    try {
      await sendCode(email, await issueOtp(email, mode, mode === "join" ? inviteCode : undefined));
    } catch (err) {
      console.error("[vendor] コードの送信に失敗", email, err);
      return { step: "email", email, error: "コードを送れませんでした。時間をおいてお試しください。" };
    }
    return { step: "code", email };
  }

  // コードの照合
  const email = normEmail(String(fd.get("email") ?? ""));
  const res = await verifyOtp(email, String(fd.get("code") ?? ""));
  if (!res.ok) return { step: "code", email, error: res.error };

  if (res.purpose === "join") {
    const inv = await getValidInvite(res.invite ?? "");
    if (!inv) return { step: "email", email, error: "招待の有効期限が切れているか、無効になっています。" };
    const user = await getUser(email);
    if (!user) {
      await addUser(email, inv.domain, "invite");
      await markInviteUsed(inv);
    } else if (user.domain !== inv.domain || user.status !== "active") {
      return { step: "email", email, error: "このメールアドレスでは登録できません。" };
    }
  } else {
    const user = await getUser(email);
    if (!user || user.status !== "active") return { step: "email", email, error: "このメールアドレスは登録されていません。" };
  }

  (await cookies()).set(VENDOR_COOKIE, sessionToken(email), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
  });
  redirect("/vendor");
}

/** 招待なしの利用申し込み。運営（/admin/vendors）が承認すると登録者になる */
export async function applyVendor(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" }; // ハニーポット
  if (!accountsConfigured()) return { status: "error", error: "現在お申し込みを受け付けられません。時間をおいてお試しください。" };

  const email = normEmail(String(fd.get("email") ?? ""));
  const company = String(fd.get("company") ?? "").trim().slice(0, 100);
  const person = String(fd.get("person") ?? "").trim().slice(0, 60);
  const site = String(fd.get("site") ?? "").trim().slice(0, 200);
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (!validEmail(email)) return { status: "error", error: "メールアドレスを確認してください。" };
  if (!company || !person || !site) return { status: "error", error: "会社名・お名前・事例を掲載している自社サイトを入力してください。" };

  const blocked = guardForm("vendor-apply", await clientIp(), email);
  if (blocked) return { status: "error", error: blocked };

  if (await getUser(email)) return { status: "error", error: "このメールアドレスはすでに登録されています。ログイン画面からお入りください。" };
  const existing = await getApplication(email);
  if (existing?.status === "pending") return { status: "ok" };

  await saveApplication({
    email, company, person, site, note, createdAt: new Date().toISOString(), status: "pending", domain: normDomain(site),
  });
  const text = [
    "ベンダー向けページの利用申し込みがありました。",
    "",
    `会社名: ${company}`, `お名前: ${person}`, `メール: ${email}`, `サイト: ${site}`, `備考: ${note || "（なし）"}`,
    "",
    `承認はこちら: ${SITE}/admin/vendors`,
  ].join("\n");
  try {
    if (mailConfigured()) await sendMail(`【事例マニア】ベンダー利用申し込み：${company}`, text);
    else console.info("[vendor-apply] メール未設定のためログのみ\n" + text);
  } catch (err) {
    console.error("[vendor-apply] 運営への通知に失敗", err); // 申し込み自体は保存済みなので成功扱い
  }
  return { status: "ok" };
}

/** 登録者（owner）が同じ会社の同僚を招待する */
export async function inviteTeammate(): Promise<TeamInviteState> {
  const user = await userFromSession((await cookies()).get(VENDOR_COOKIE)?.value);
  if (!user) return { error: "ログインし直してください。" };
  if (user.role !== "owner") return { error: "同僚の招待は、最初に登録された方（管理者）だけが行えます。" };
  if (!allow(`vendor-team:${user.email}`, 10, 24 * HOUR)) return { error: "本日の招待の上限に達しました。" };
  const inv = await createInvite(user.domain);
  return { code: inv.code, url: inviteUrl(inv.code) };
}

export async function vendorLogout(): Promise<void> {
  (await cookies()).delete(VENDOR_COOKIE);
  redirect("/vendor");
}
