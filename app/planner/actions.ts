"use server";

import { headers } from "next/headers";
import { guardForm } from "../../lib/ratelimit";
import { fetchSiteText } from "../../lib/suggest";
import { buildPlan, buildPlanMail, buildPlanMailHtml, countQuestions, customizePlan, parsePurposes, purposeLine, type Plan } from "../../lib/planner";
import { productLabel, challengeLabel } from "../../lib/taxonomy";
import { mailConfigured, sendMail } from "../../lib/mail";
import { notifySubscribe } from "../../lib/notify";

/* 事例プランナー（目的＋製品ページのURL＋メール → その製品向けに書き換えた取材質問と着地予想をメールで送る）のサーバー処理。
   同期実行（サイト取得6秒＋AIの書き換え十数秒＋メール送信）。
   AIの書き換えに失敗しても、製品を問わない標準の質問リストは送る（リードを取りこぼさない）。 */

export type PlannerState = {
  status: "idle" | "ok" | "error";
  error?: string;
  questions?: number;   // 送った質問の数（画面表示用）
  customized?: boolean; // 製品に合わせて書き換えられたか
  summary?: string;     // AIが理解した製品の一言
  subscribed?: boolean; // メルマガ登録も受け付けたか
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitPlanner(_prev: PlannerState, fd: FormData): Promise<PlannerState> {
  // ハニーポット
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" };

  let url = String(fd.get("url") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const wantsNewsletter = fd.get("newsletter") != null;

  const purposes = parsePurposes(String(fd.get("m") ?? ""), fd.getAll("s").map(String));
  if (!purposes) return { status: "error", error: "目的を読み取れませんでした。お手数ですが、最初からやり直してください。" };
  if (!url) return { status: "error", error: "製品ページのURLを入力してください。" };
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  try { new URL(url); } catch { return { status: "error", error: "URLの形式が正しくありません。" }; }
  if (!email || !EMAIL.test(email)) return { status: "error", error: "メールアドレスの形式が正しくありません。" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const blocked = guardForm("planner", ip, email);
  if (blocked) return { status: "error", error: blocked };

  let text: string;
  try {
    text = await fetchSiteText(url);
  } catch (err) {
    console.error("[planner] サイト取得に失敗", url, err);
    return { status: "error", error: "製品ページの読み取りに失敗しました。URLをご確認のうえ、時間をおいてお試しください。" };
  }

  const base = buildPlan(purposes);
  let plan: Plan = base;
  try {
    plan = await customizePlan(base, text);
  } catch (err) {
    console.error("[planner] AIの書き換えに失敗（標準の質問リストを送る）", err);
  }
  const pr = plan.profile;

  try {
    if (mailConfigured()) {
      await sendMail("【事例マニア】事例づくりの質問リストと着地予想をお送りします", buildPlanMail(plan), email, buildPlanMailHtml(plan));
      // 管理者にもリードとして通知
      await sendMail(
        `【事例マニア/事例プランナー】${email}`,
        [
          "事例プランナーが利用されました。",
          `【メール】${email}`,
          `【製品ページ】${url}`,
          `【目的】${purposeLine(plan)}`,
          pr
            ? `【AIの理解】${pr.summary}（製品: ${pr.productCategory ? productLabel(pr.productCategory) : "-"} / 成果: ${pr.challenge ? challengeLabel(pr.challenge) : "-"}）`
            : "【AIの理解】書き換えに失敗。標準の質問リストを送信",
          `【メルマガ】${wantsNewsletter ? "登録希望あり（別途登録メールも送信）" : "希望なし"}`,
        ].join("\n"),
      );
    } else {
      console.info("[planner] メール未設定のためログのみ", JSON.stringify({ email, url, purposes, profile: pr ?? null, wantsNewsletter }));
    }
  } catch (err) {
    console.error("[planner] 失敗", err);
    return { status: "error", error: "メールの送信に失敗しました。時間をおいてお試しください。" };
  }

  // メルマガ登録（本体は成功しているので、登録の失敗で全体を失敗にしない）
  let subscribed = false;
  if (wantsNewsletter) {
    try {
      await notifySubscribe(email, "planner");
      subscribed = true;
    } catch (err) {
      console.error("[planner] メルマガ登録通知に失敗", err);
    }
  }

  return { status: "ok", questions: countQuestions(plan), customized: Boolean(pr), summary: pr?.summary, subscribed };
}
