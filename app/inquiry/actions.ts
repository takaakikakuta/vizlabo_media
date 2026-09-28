"use server";

import { readInquiry, validateInquiry, type InquiryState } from "../../lib/inquiry";
import { notifyInquiry } from "../../lib/notify";
import { headers } from "next/headers";
import { guardForm } from "../../lib/ratelimit";

export async function submitInquiry(_prev: InquiryState, fd: FormData): Promise<InquiryState> {
  // ハニーポット: 人間には見えない項目。埋まっていたら黙って成功として捨てる。
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" };

  const values = readInquiry(fd);
  const errors = validateInquiry(values);
  if (Object.keys(errors).length) {
    return { status: "error", errors, values };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const blocked = guardForm("inquiry", ip, values.email);
  if (blocked) return { status: "error", values, formError: blocked };

  try {
    await notifyInquiry(values);
  } catch (err) {
    console.error("[inquiry] 通知に失敗", err);
    return {
      status: "error",
      values,
      formError: "送信に失敗しました。時間をおいて再度お試しください。",
    };
  }

  return { status: "ok" };
}
