"use server";

import { readContact, validateContact, type ContactState } from "../../lib/contact";
import { notifyContact } from "../../lib/notify";

export async function submitContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // ハニーポット: 人間には見えない項目。埋まっていたら黙って成功として捨てる。
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" };

  const values = readContact(fd);
  const errors = validateContact(values);
  if (Object.keys(errors).length) {
    return { status: "error", errors, values };
  }

  try {
    await notifyContact(values);
  } catch (err) {
    console.error("[contact] 通知に失敗", err);
    return {
      status: "error",
      values,
      formError: "送信に失敗しました。時間をおいて再度お試しください。",
    };
  }

  return { status: "ok" };
}
