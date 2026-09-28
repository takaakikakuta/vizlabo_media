import { createHash } from "node:crypto";

/* メール送信。Resend優先、なければblastengineにフォールバック。
   - Resend: vizlabo_xと同じアカウント（send.vizlabo.com 認証済み）。任意の宛先に送れる。
   - blastengine: 正式契約前のため登録済みアドレス（管理者宛）にしか届かない。予備。
   認証情報はコンソールENV→next.config.tsのビルド時焼き込みで渡す（変更したら再ビルド）。 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BLASTENGINE_ENDPOINT = "https://app.engn.jp/api/v1/deliveries/transaction";

function resendKey(): string | undefined {
  const k = process.env.RESEND_API_KEY?.trim().replace(/^"|"$/g, "");
  return k || undefined;
}

/** 送信に必要な設定が揃っているか（未設定ならログのみのフォールバックに落とす）。 */
export function mailConfigured(): boolean {
  const hasResend = Boolean(resendKey());
  const hasBlast = Boolean(process.env.BLASTENGINE_LOGIN_ID && process.env.BLASTENGINE_API_KEY);
  return (hasResend || hasBlast) && Boolean(process.env.CONTACT_TO);
}

function fromAddress(): string {
  const f = process.env.RESEND_FROM?.trim().replace(/^"|"$/g, "");
  return f || "事例マニア <noreply@send.vizlabo.com>";
}

/** メールを1通送る。宛先省略時は管理者（CONTACT_TO）。失敗は throw する。 */
export async function sendMail(subject: string, text: string, to?: string): Promise<void> {
  const dest = to || process.env.CONTACT_TO!;
  const key = resendKey();

  if (key) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [dest], subject, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`resend ${res.status}: ${body.slice(0, 500)}`);
    }
    return;
  }

  // フォールバック: blastengine（管理者宛のみ届く）
  const hash = createHash("sha256")
    .update(`${process.env.BLASTENGINE_LOGIN_ID}${process.env.BLASTENGINE_API_KEY}`)
    .digest("hex")
    .toLowerCase();
  const token = Buffer.from(hash).toString("base64");
  const res = await fetch(BLASTENGINE_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { email: process.env.MAIL_FROM_EMAIL || "vizlabo@update", name: process.env.MAIL_FROM_NAME || "事例マニア" },
      to: dest,
      subject,
      text_part: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`blastengine ${res.status}: ${body.slice(0, 500)}`);
  }
}
