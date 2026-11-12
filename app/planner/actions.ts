"use server";

import { headers } from "next/headers";
import { guardForm } from "../../lib/ratelimit";
import { buildPlan, buildPlanMail, buildPlanMailHtml, parsePlanAnswers } from "../../lib/planner";
import { mailConfigured, sendMail } from "../../lib/mail";
import { notifySubscribe } from "../../lib/notify";

/* 事例プランナー（目的・業種・成果の回答＋メール → 取材質問と着地予想をメールで送る）のサーバー処理。
   質問と想定回答の全文はメールでだけ渡す（画面には目的別の構成と質問の一部だけを出す）。 */

export type PlannerState = {
  status: "idle" | "ok" | "error";
  error?: string;
  questions?: number;   // 送った質問の数（画面表示用）
  subscribed?: boolean; // メルマガ登録も受け付けたか
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitPlanner(_prev: PlannerState, fd: FormData): Promise<PlannerState> {
  // ハニーポット
  if (String(fd.get("website") ?? "").trim()) return { status: "ok" };

  const email = String(fd.get("email") ?? "").trim();
  const company = String(fd.get("company") ?? "").trim().slice(0, 100);
  const wantsNewsletter = fd.get("newsletter") != null;

  const answers = parsePlanAnswers({
    g: fd.getAll("g").map(String),
    ind: String(fd.get("ind") ?? ""),
    ch: String(fd.get("ch") ?? ""),
    num: String(fd.get("num") ?? ""),
  });
  if (!answers) return { status: "error", error: "回答を読み取れませんでした。お手数ですが、最初からやり直してください。" };
  if (!email || !EMAIL.test(email)) return { status: "error", error: "メールアドレスの形式が正しくありません。" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const blocked = guardForm("planner", ip, email);
  if (blocked) return { status: "error", error: blocked };

  const plan = buildPlan(answers);
  const questions = plan.common.length + 1 + plan.purposes.reduce((n, p) => n + p.questions.length, 0);

  try {
    if (mailConfigured()) {
      await sendMail("【事例マニア】事例づくりの質問リストと着地予想をお送りします", buildPlanMail(plan), email, buildPlanMailHtml(plan));
      // 管理者にもリードとして通知
      await sendMail(
        `【事例マニア/事例プランナー】${company ? `${company} ` : ""}${email}`,
        [
          "事例プランナーが利用されました。",
          `【メール】${email}`,
          `【会社名】${company || "-"}`,
          `【目的】${plan.purposes.map((p) => p.label).join("・")}`,
          `【顧客の業種】${plan.industryLabel}`,
          `【伝えたい成果】${plan.challengeLabel}`,
          `【数字の見込み】${answers.num}`,
          `【メルマガ】${wantsNewsletter ? "登録希望あり（別途登録メールも送信）" : "希望なし"}`,
        ].join("\n"),
      );
    } else {
      console.info("[planner] メール未設定のためログのみ", JSON.stringify({ email, company, answers, wantsNewsletter }));
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

  return { status: "ok", questions, subscribed };
}
