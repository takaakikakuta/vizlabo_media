"use server";

import { fetchSiteText, analyzeCompany, matchCases, buildSuggestMail } from "../../lib/suggest";
import { mailConfigured, sendMail } from "../../lib/mail";

/* URLサジェスト（会社URL＋メール → AIが似た事例をメールで送る）のサーバー処理。
   同期実行（サイト取得6秒＋Haiku数秒＋メール送信）で、ユーザーは10秒前後待つ。 */

export type SuggestState = {
  status: "idle" | "ok" | "error";
  error?: string;
  matched?: number;   // 成功時に見つけた件数（画面表示用）
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function submitSuggest(_prev: SuggestState, fd: FormData): Promise<SuggestState> {
  // ハニーポット
  if (String(fd.get("website") ?? "").trim()) return { status: "ok", matched: 0 };

  let url = String(fd.get("url") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();

  if (!url) return { status: "error", error: "会社サイトのURLを入力してください。" };
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  try { new URL(url); } catch { return { status: "error", error: "URLの形式が正しくありません。" }; }
  if (!email || !EMAIL.test(email)) return { status: "error", error: "メールアドレスの形式が正しくありません。" };

  try {
    const text = await fetchSiteText(url);
    const profile = await analyzeCompany(text);
    const suggestions = matchCases(profile);
    const total = suggestions.sameIndustry.length + suggestions.similar.length;
    if (total === 0) {
      return { status: "error", error: "近い事例を見つけられませんでした。業種やキーワードで直接お探しください。" };
    }

    if (mailConfigured()) {
      await sendMail("【事例マニア】貴社に近い導入事例をお送りします", buildSuggestMail(url, profile, suggestions), email);
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
        ].join("\n"),
      );
    } else {
      console.info("[suggest] メール未設定のためログのみ", JSON.stringify({ email, url, total }));
    }

    return { status: "ok", matched: total };
  } catch (err) {
    console.error("[suggest] 失敗", err);
    return {
      status: "error",
      error: "サイトの読み取りに失敗しました。URLをご確認のうえ、時間をおいてお試しください。",
    };
  }
}
