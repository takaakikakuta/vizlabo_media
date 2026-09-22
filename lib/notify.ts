import type { ContactInput } from "./contact";
import { topicLabel } from "./contact";
import type { InquiryInput } from "./inquiry";
import { getArticle } from "./articles";
import { mailConfigured, sendMail } from "./mail";

/* フォーム受付の通知。blastengine（lib/mail.ts）で管理者（CONTACT_TO）へメールを送る。

   環境変数（BLASTENGINE_LOGIN_ID / BLASTENGINE_API_KEY / CONTACT_TO）が未設定の環境では
   ログに残すだけのフォールバックで動く（ローカル開発など）。
   設定済みの環境で送信に失敗した場合は throw し、フォーム側でエラー表示になる
   （現状メールが唯一の記録なので、黙って成功にしない）。 */

export type NotifyResult = { delivered: boolean };

function logOnly(kind: string, payload: unknown): NotifyResult {
  console.info(`[${kind}] メール未設定のためログのみ`, JSON.stringify({
    receivedAt: new Date().toISOString(), payload,
  }, null, 2));
  return { delivered: false };
}

export async function notifyContact(input: ContactInput): Promise<NotifyResult> {
  if (!mailConfigured()) return logOnly("contact", input);

  const text = [
    "事例ナビのお問い合わせフォームから送信がありました。",
    "----------------------------",
    `【ご用件】${topicLabel(input.topic)}`,
    `【会社名】${input.company}`,
    `【お名前】${input.name}`,
    `【メール】${input.email}`,
    `【電話番号】${input.tel || "-"}`,
    `【部署・役職】${input.dept || "-"}`,
    `【事例ページのURL】${input.caseUrl || "-"}`,
    "【ご相談内容】",
    input.message,
    "----------------------------",
  ].join("\n");

  await sendMail(`【事例ナビ/${topicLabel(input.topic)}】${input.company} ${input.name}様`, text);
  return { delivered: true };
}

/* ── まとめて問い合わせ（記事に登場したサービスへの一括問い合わせ） ──
   各ベンダーへの実際の取次は手動運用。メールはその材料をすべて含める。 */
export async function notifyInquiry(input: InquiryInput): Promise<NotifyResult> {
  if (!mailConfigured()) return logOnly("inquiry", input);

  const article = getArticle(input.articleSlug);
  const articleLine = article
    ? `${article.title.join(" ")}（/articles/${article.slug}）`
    : input.articleSlug || "-";

  const text = [
    "事例ナビの「この記事のサービスすべてに問い合わせる」から送信がありました。",
    "----------------------------",
    `【出発点の記事】${articleLine}`,
    `【対象サービス】${input.services.length}件`,
    ...input.services.map((s) => `  ・${s}`),
    `【会社名】${input.company}`,
    `【お名前】${input.name}`,
    `【メール】${input.email}`,
    `【電話番号】${input.tel || "-"}`,
    "【検討状況・確認したいこと】",
    input.message || "-",
    "----------------------------",
  ].join("\n");

  await sendMail(`【事例ナビ/一括問い合わせ】${input.company} ${input.name}様（${input.services.length}サービス）`, text);
  return { delivered: true };
}

/* ── メルマガ購読 ──
   購読者リストはまだ無いので、このメールが唯一の記録。取りこぼさないよう失敗は throw。 */
export async function notifySubscribe(email: string, source: string): Promise<NotifyResult> {
  if (!mailConfigured()) return logOnly("newsletter", { email, source });

  const text = [
    "事例ナビのメルマガ購読フォームから登録がありました。",
    "----------------------------",
    `【メールアドレス】${email}`,
    `【登録元】${source}`,
    `【受付日時】${new Date().toISOString()}`,
    "----------------------------",
    "※購読者リストは未整備。このメールが登録記録です。",
  ].join("\n");

  await sendMail(`【事例ナビ/メルマガ登録】${email}`, text);
  return { delivered: true };
}
