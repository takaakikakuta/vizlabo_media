import { createHash } from "node:crypto";

/* blastengine（https://app.engn.jp）でメールを送る。vizlabo本体と同じアカウントを使う。

   認証: sha256(ログインID + APIキー) の16進をBase64にしたBearerトークン。
   認証情報はリポジトリが公開のためコードに書かず、Amplifyコンソールの環境変数から渡す。
   コンソールのENVはSSR実行時には届かない（ビルドにだけ届く）ので、
   next.config.ts の env: でビルド時に焼き込む。値を変えたら再ビルドが必要。 */

const ENDPOINT = "https://app.engn.jp/api/v1/deliveries/transaction";

/** 送信に必要な設定が揃っているか（未設定ならログのみのフォールバックに落とす）。 */
export function mailConfigured(): boolean {
  return Boolean(
    process.env.BLASTENGINE_LOGIN_ID &&
    process.env.BLASTENGINE_API_KEY &&
    process.env.CONTACT_TO,
  );
}

function bearerToken(): string {
  const hash = createHash("sha256")
    .update(`${process.env.BLASTENGINE_LOGIN_ID}${process.env.BLASTENGINE_API_KEY}`)
    .digest("hex")
    .toLowerCase();
  return Buffer.from(hash).toString("base64");
}

/** 管理者宛（CONTACT_TO）に通知メールを1通送る。失敗は throw する。 */
export async function sendMail(subject: string, text: string): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: process.env.MAIL_FROM_EMAIL || "vizlabo@update",
        name: process.env.MAIL_FROM_NAME || "事例ナビ",
      },
      to: process.env.CONTACT_TO,
      subject,
      text_part: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`blastengine ${res.status}: ${body.slice(0, 500)}`);
  }
}
