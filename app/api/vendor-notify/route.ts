import { timingSafeEqual } from "node:crypto";
import {
  accountsConfigured, getNotice, getOrCreateInvite, listUsers, saveNotice,
} from "../../../lib/accounts";
import { vendorCases } from "../../../lib/cases";
import { mailConfigured, sendMail } from "../../../lib/mail";
import { inviteUrl, SITE } from "../../../lib/vendorAuth";

/* 掲載通知（scripts/vendors/notify.mjs）から呼ぶ運営専用の API。
   提供元ごとに、
     - 会員が未登録 → 招待を返す（使い回せる有効な招待があればそれ、なければ新しく発行。60日有効）
     - 会員が登録済み → 文面は作らず、send: true なら会員全員に掲載通知のメールを送る（記事ごとに1回だけ）
   認証は Authorization: Bearer <NOTIFY_API_TOKEN>（next.config.ts で焼き込み）。 */

type Article = { slug: string; label: string; title: string; url: string };

export type VendorNotifyResult =
  | { domain: string; status: "invite"; code: string; url: string; expires: string; reused: boolean }
  | { domain: string; status: "registered"; emails: string[]; mail: "sent" | "already" | "not-sent" | "failed"; sentAt?: string }
  | { domain: string; status: "error"; error: string };

function authorized(req: Request): boolean {
  const want = process.env.NOTIFY_API_TOKEN || "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!want || !got) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

const jstDate = (sec: number) => new Date(sec * 1000 + 9 * 3600_000).toISOString().slice(0, 10);

function memberMail(article: Article, cust: string): string {
  return [
    "事例マニアのベンダー向けページにご登録いただき、ありがとうございます。",
    "",
    `このたび、編集記事にて貴社の${cust}を紹介させていただきました。`,
    "",
    `『${article.title}』`,
    `▼記事はこちら`,
    article.url,
    "",
    "掲載した事例の閲覧数と、貴社サイトへの送客数は、ベンダー向けページでご覧いただけます。",
    `${SITE}/vendor`,
    "",
    "掲載内容に誤りやご不都合がございましたら、すぐに修正・削除いたしますのでお知らせください。",
    "",
    "事例マニア 運営：角田崇明",
    SITE,
    "kakuta@vizlabo.net",
  ].join("\n");
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!accountsConfigured()) return Response.json({ error: "会員テーブルか VENDOR_SECRET が未設定" }, { status: 503 });

  let body: { article?: Article; vendors?: { domain: string; cust: string }[]; send?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const article = body.article;
  if (!article?.slug || !article.title || !article.url || !Array.isArray(body.vendors)) {
    return Response.json({ error: "article と vendors が必要" }, { status: 400 });
  }

  const users = (await listUsers()).filter((u) => u.status === "active");
  const results: VendorNotifyResult[] = [];
  for (const { domain, cust } of body.vendors.slice(0, 100)) {
    if (vendorCases(domain).length === 0) {
      results.push({ domain, status: "error", error: "事例がない提供元" });
      continue;
    }
    const members = users.filter((u) => u.domain === domain).map((u) => u.email);
    if (members.length === 0) {
      const { invite, reused } = await getOrCreateInvite(domain);
      results.push({ domain, status: "invite", code: invite.code, url: inviteUrl(invite.code), expires: jstDate(invite.exp), reused });
      continue;
    }
    const prev = await getNotice(domain, article.slug);
    if (prev) {
      results.push({ domain, status: "registered", emails: members, mail: "already", sentAt: prev.sentAt });
      continue;
    }
    if (!body.send || !mailConfigured()) {
      results.push({ domain, status: "registered", emails: members, mail: "not-sent" });
      continue;
    }
    const sent: string[] = [];
    for (const to of members) {
      try {
        await sendMail(`【事例マニア】貴社の事例を記事で紹介しました：${article.title}`, memberMail(article, cust), to);
        sent.push(to);
      } catch (err) {
        console.error("[vendor-notify] 送信に失敗", to, err);
      }
    }
    if (sent.length) {
      const sentAt = new Date().toISOString();
      await saveNotice({ domain, slug: article.slug, sentAt, to: sent });
      results.push({ domain, status: "registered", emails: members, mail: "sent", sentAt });
    } else {
      results.push({ domain, status: "registered", emails: members, mail: "failed" });
    }
  }
  return Response.json({ results });
}
