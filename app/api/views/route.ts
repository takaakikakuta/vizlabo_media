import { cookies, headers } from "next/headers";
import { getCountableCase } from "../../../lib/cases";
import { recordView, type ViewKind } from "../../../lib/views";
import { allow } from "../../../lib/ratelimit";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";

/* 事例ページの閲覧（components/ViewBeacon.tsx）と、出典リンクのクリック（components/SourceClickTracker.tsx）を
   1件数える。どちらも sendBeacon で {id, kind} を送ってくる。
   ページ本体はキャッシュ（ISR）なので、サーバー描画ではなくブラウザからの通知で数える。
   数えないもの: 存在しない事例ID / ボットらしいUA / 運営（管理画面ログイン中）/ 同じIPからの連打。
   レスポンスは常に 204（ブラウザ側は結果を見ない）。 */

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|axios/i;

export async function POST(request: Request) {
  const none = new Response(null, { status: 204 });
  let id = "";
  let kind: ViewKind = "view";
  try {
    const body = JSON.parse(await request.text());
    id = typeof body?.id === "string" ? body.id.slice(0, 200) : "";
    if (body?.kind === "click") kind = "click";
  } catch {
    return none;
  }
  const c = id ? getCountableCase(id) : undefined;
  if (!c) return none;

  const h = await headers();
  if (BOT_UA.test(h.get("user-agent") ?? "")) return none;
  if (isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) return none;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !allow(`views:ip:${ip}`, 120, 60 * 60 * 1000)) return none;

  try {
    await recordView(c.id, c.vendor, kind);
  } catch (err) {
    console.error("[views] 記録に失敗", c.id, err);
  }
  return none;
}
