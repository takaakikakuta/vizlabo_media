"use server";

import { validateEmail, type SubscribeState } from "../../lib/newsletter";
import { notifySubscribe } from "../../lib/notify";

export async function subscribe(_prev: SubscribeState, fd: FormData): Promise<SubscribeState> {
  // ハニーポット: ボットが埋めたら黙って成功扱いで捨てる
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" };

  const email = String(fd.get("email") ?? "").trim();
  const source = String(fd.get("source") ?? "unknown").slice(0, 40);

  const err = validateEmail(email);
  if (err) return { status: "error", error: err, email };

  try {
    await notifySubscribe(email, source);
  } catch (e) {
    console.error("[newsletter] 受付に失敗", e);
    return { status: "error", email, error: "登録に失敗しました。時間をおいて再度お試しください。" };
  }
  return { status: "ok" };
}
