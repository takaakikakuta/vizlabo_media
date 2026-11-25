import { cookies, headers } from "next/headers";
import { getCountableCase } from "../../../lib/cases";
import { recordArticleView, recordView, type ViewKind } from "../../../lib/views";
import { allow } from "../../../lib/ratelimit";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";
import { getArticle } from "../../../lib/articles";
import { classifyRef, recordRef } from "../../../lib/slots";

/* 事例ページの閲覧（components/ViewBeacon.tsx）と、出典リンクのクリック（components/SourceClickTracker.tsx）を
   1件数える。どちらも sendBeacon で {id, kind} を送ってくる。記事ページの閲覧は kind: "article"（id は記事の slug）。
   記事の閲覧には流入元の手がかり r: {u: utm_source, h: 参照元ホスト名, n: サイト内遷移} が付き、実在する記事なら
   流入元別の閲覧も数える（lib/slots.ts。広告枠の販売根拠の計測）。
   ページ本体はキャッシュ（ISR）なので、サーバー描画ではなくブラウザからの通知で数える。
   数えないもの: 存在しない事例ID / ボットらしいUA / 運営（管理画面ログイン中）/ 同じIPからの連打。
   レスポンスは常に 204（ブラウザ側は結果を見ない）。 */

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|axios/i;

export async function POST(request: Request) {
  const none = new Response(null, { status: 204 });
  let id = "";
  let kind: ViewKind | "article" = "view";
  let ref: { u?: unknown; h?: unknown; n?: unknown } | undefined;
  try {
    const body = JSON.parse(await request.text());
    id = typeof body?.id === "string" ? body.id.slice(0, 200) : "";
    if (body?.kind === "click" || body?.kind === "article") kind = body.kind;
    if (body?.r && typeof body.r === "object") ref = body.r;
  } catch {
    return none;
  }
  // 記事は slug の形だけ確かめる（記事データはファイルから読むので、API では引かない。表示側で実在する記事だけ出す）
  const isArticle = kind === "article" && /^[A-Za-z0-9-]{1,120}$/.test(id);
  const c = kind !== "article" && id ? getCountableCase(id) : undefined;
  if (!c && !isArticle) return none;

  const h = await headers();
  if (BOT_UA.test(h.get("user-agent") ?? "")) return none;
  if (isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) return none;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !allow(`views:ip:${ip}`, 120, 60 * 60 * 1000)) return none;

  try {
    if (c) await recordView(c.id, c.vendor, kind === "click" ? "click" : "view");
    else {
      await recordArticleView(id);
      if (ref && getArticle(id)) await recordRef(id, classifyRef(ref.u, ref.h, ref.n));
    }
  } catch (err) {
    console.error("[views] 記録に失敗", kind, id, err);
  }
  return none;
}
