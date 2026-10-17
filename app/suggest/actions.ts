"use server";

import { headers } from "next/headers";
import { guardForm } from "../../lib/ratelimit";
import { fetchSiteText, analyzeCompany, matchCases, buildSuggestMail, buildSuggestMailHtml } from "../../lib/suggest";
import { mailConfigured, sendMail } from "../../lib/mail";
import { notifySubscribe } from "../../lib/notify";
import { recordEvent } from "../../lib/analytics";

/* URLサジェスト（会社URL＋メール → AIが似た事例をメールで送る）のサーバー処理。
   同期実行（サイト取得6秒＋Haiku数秒＋メール送信）で、ユーザーは10秒前後待つ。 */

export type SuggestState = {
  status: "idle" | "ok" | "error";
  error?: string;
  matched?: number;    // 成功時に見つけた件数（画面表示用）
  subscribed?: boolean; // メルマガ登録も受け付けたか（画面表示用）
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitSuggest(_prev: SuggestState, fd: FormData): Promise<SuggestState> {
  // ハニーポット
  if (String(fd.get("website") ?? "").trim()) return { status: "ok", matched: 0 };

  let url = String(fd.get("url") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const wantsNewsletter = fd.get("newsletter") != null;
  const source = String(fd.get("source") ?? "suggest").trim();

  if (!url) return { status: "error", error: "会社サイトのURLを入力してください。" };
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  try { new URL(url); } catch { return { status: "error", error: "URLの形式が正しくありません。" }; }
  if (!email || !EMAIL.test(email)) return { status: "error", error: "メールアドレスの形式が正しくありません。" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const blocked = guardForm("suggest", ip, email);
  if (blocked) return { status: "error", error: blocked };

  try {
    const text = await fetchSiteText(url);
    const profile = await analyzeCompany(text);
    const suggestions = matchCases(profile);
    const total = suggestions.sameIndustry.length + suggestions.similar.length;

    // 一次データとして記録（入力サイト・AIの理解・推定した業種/タグ/課題・提示件数）。
    // 計測の失敗で本体を失敗にはしない
    try {
      await recordEvent({
        kind: "suggest",
        target: new URL(url).hostname.replace(/^www\./, ""),
        meta: {
          url, email, source,
          summary: profile.summary,
          industry: profile.industry,
          tags: profile.tags,
          keywords: profile.keywords,
          challenges: profile.challenges,
          matched: total,
          newsletter: wantsNewsletter,
        },
      });
    } catch (err) {
      console.error("[analytics] URL診断の記録に失敗", err);
    }

    if (total === 0) {
      return { status: "error", error: "近い事例を見つけられませんでした。業種やキーワードで直接お探しください。" };
    }

    if (mailConfigured()) {
      await sendMail("【事例マニア】貴社に近い導入事例をお送りします", buildSuggestMail(url, profile, suggestions), email, buildSuggestMailHtml(url, profile, suggestions));
      // 管理者にもリードとして通知
      await sendMail(
        `【事例マニア/URLサジェスト】${email}`,
        [
          "URLサジェスト機能が利用されました。",
          `【メール】${email}`,
          `【サイト】${url}`,
          `【AIの理解】${profile.summary}（業種: ${profile.industry}）`,
          `【推定タグ】${profile.tags.join("、") || "-"}`,
          `【提示事例数】${total}件`,
          `【メルマガ】${wantsNewsletter ? "登録希望あり（別途登録メールも送信）" : "希望なし"}`,
        ].join("\n"),
      );
    } else {
      console.info("[suggest] メール未設定のためログのみ", JSON.stringify({ email, url, total, wantsNewsletter }));
    }

    // メルマガ登録（サジェスト本体は成功しているので、登録の失敗で全体を失敗にしない）
    let subscribed = false;
    if (wantsNewsletter) {
      try {
        await notifySubscribe(email, `suggest:${source}`);
        subscribed = true;
      } catch (err) {
        console.error("[suggest] メルマガ登録通知に失敗", err);
      }
    }

    return { status: "ok", matched: total, subscribed };
  } catch (err) {
    console.error("[suggest] 失敗", err);
    return {
      status: "error",
      error: "サイトの読み取りに失敗しました。URLをご確認のうえ、時間をおいてお試しください。",
    };
  }
}
