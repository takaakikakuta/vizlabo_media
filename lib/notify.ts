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

const ACK_FOOTER = [
  "",
  "────────────────────",
  "事例マニア（導入事例の専門メディア）",
  "https://vizlabo.com",
  "",
  "※このメールは送信専用アドレスから自動送信しています。",
  "　ご返信は届きませんので、ご用の際はお問い合わせフォームをご利用ください。",
  "　https://vizlabo.com/contact",
].join("\n");

/* 送信者本人への受付確認（自動返信）。
   管理者宛が唯一の記録なのに対し、こちらは失敗しても全体を失敗にしない。 */
async function sendAck(to: string, subject: string, body: string): Promise<void> {
  try {
    await sendMail(subject, body + ACK_FOOTER, to);
  } catch (err) {
    console.error("[ack] 受付確認メールの送信に失敗", to, err);
  }
}

export async function notifyContact(input: ContactInput): Promise<NotifyResult> {
  if (!mailConfigured()) return logOnly("contact", input);

  const text = [
    "事例マニアのお問い合わせフォームから送信がありました。",
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

  await sendMail(`【事例マニア/${topicLabel(input.topic)}】${input.company} ${input.name}様`, text);

  await sendAck(input.email, "【事例マニア】お問い合わせを受け付けました", [
    `${input.name} 様`,
    "",
    "事例マニアへのお問い合わせありがとうございます。",
    "以下の内容で受け付けました。担当より順次ご連絡いたします。",
    "",
    "----------------------------",
    `【ご用件】${topicLabel(input.topic)}`,
    `【会社名】${input.company}`,
    `【お名前】${input.name}`,
    "【ご相談内容】",
    input.message,
    "----------------------------",
  ].join("\n"));

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
    "事例マニアの「この記事のサービスすべてに問い合わせる」から送信がありました。",
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

  await sendMail(`【事例マニア/一括問い合わせ】${input.company} ${input.name}様（${input.services.length}サービス）`, text);

  await sendAck(input.email, "【事例マニア】一括問い合わせを受け付けました", [
    `${input.name} 様`,
    "",
    "事例マニアの「この記事のサービスすべてに問い合わせる」をご利用いただき、ありがとうございます。",
    "以下の内容で受け付けました。編集部より各サービスへお取り次ぎのうえ、順次ご連絡いたします。",
    "",
    "----------------------------",
    `【対象サービス】${input.services.length}件`,
    ...input.services.map((s) => `  ・${s}`),
    `【会社名】${input.company}`,
    `【お名前】${input.name}`,
    "----------------------------",
  ].join("\n"));

  return { delivered: true };
}

/* ── メルマガ購読 ──
   購読者リストはまだ無いので、このメールが唯一の記録。取りこぼさないよう失敗は throw。 */
export async function notifySubscribe(email: string, source: string): Promise<NotifyResult> {
  if (!mailConfigured()) return logOnly("newsletter", { email, source });

  const text = [
    "事例マニアのメルマガ購読フォームから登録がありました。",
    "----------------------------",
    `【メールアドレス】${email}`,
    `【登録元】${source}`,
    `【受付日時】${new Date().toISOString()}`,
    "----------------------------",
    "※購読者リストは未整備。このメールが登録記録です。",
  ].join("\n");

  await sendMail(`【事例マニア/メルマガ登録】${email}`, text);

  await sendAck(email, "【事例マニア】メルマガのご登録ありがとうございます", [
    "メルマガ「週刊 事例マニア」にご登録いただき、ありがとうございます。",
    "毎週金曜に、事例セレクション5本とnote連載「この事例がスゴイ」「事例コラム」をお届けします。",
    "",
    "配信までの間は、サイトで最新の事例セレクションをご覧いただけます。",
    "https://vizlabo.com/articles",
    "",
    "配信の停止をご希望の場合は、お手数ですがお問い合わせフォームからご連絡ください。",
  ].join("\n"));

  return { delivered: true };
}
