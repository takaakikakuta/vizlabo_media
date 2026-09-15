import type { ContactInput } from "./contact";

/* 問い合わせの通知先。実際のメール送信はここだけを差し替える。

   いまは受信内容をサーバーログに出すだけ（送信は未実装）。
   本番化するときの候補:
   - Resend / SendGrid などのAPIを呼ぶ（vizlabo_x では RESEND_* を使っている）
   - 併せて DB や S3 に保存して取りこぼしを防ぐ
   送信先アドレスは環境変数 CONTACT_TO で差し替えられるようにしてある。 */

export type NotifyResult = { delivered: boolean };

export async function notifyContact(input: ContactInput): Promise<NotifyResult> {
  const to = process.env.CONTACT_TO ?? "(未設定)";

  // TODO: ここでメール送信を実装する。実装するまでは受信内容をログに残す。
  console.info(
    "[contact] 新しい問い合わせ",
    JSON.stringify({ to, receivedAt: new Date().toISOString(), ...input }, null, 2),
  );

  return { delivered: false };
}

/* ── まとめて問い合わせ（記事に登場したサービスへの一括問い合わせ） ──
   実際の取次（各サービスの提供企業への連絡）とメール送信はここだけを差し替える。
   いまは受信内容をサーバーログに出すだけ（送信・取次は未実装）。 */
import type { InquiryInput } from "./inquiry";

export async function notifyInquiry(input: InquiryInput): Promise<NotifyResult> {
  const to = process.env.CONTACT_TO ?? "(未設定)";

  // TODO: ここでメール送信と各ベンダーへの取次を実装する。実装するまでは受信内容をログに残す。
  console.info(
    "[inquiry] まとめて問い合わせ",
    JSON.stringify({ to, receivedAt: new Date().toISOString(), ...input }, null, 2),
  );

  return { delivered: false };
}

/* ── メルマガ購読 ──
   実際の購読者リスト管理はここだけを差し替える。
   本番化の候補: Resend Audiences / ConvertKit / DBに保存。
   いまは受付内容をサーバーログに出すだけ（リスト保存は未実装）。 */
export async function notifySubscribe(email: string, source: string): Promise<NotifyResult> {
  // TODO: 購読者リストへの保存を実装する。実装するまでは受付をログに残す。
  console.info("[newsletter] 購読申込", JSON.stringify({
    email, source, receivedAt: new Date().toISOString(),
  }));
  return { delivered: false };
}
