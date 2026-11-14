import { cookies, headers } from "next/headers";
import { parseSourceKey, recordSource, type SourceKind } from "../../../lib/sources";
import { allow } from "../../../lib/ratelimit";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";

/* 流入元の計測（components/SourceBeacon.tsx）。UTM つきで来た訪問と、そこからのメルマガ登録を1件数える。
   sendBeacon で {s, m, c, p, kind} を送ってくる（utm_source / utm_medium / utm_campaign / 着地ページのパス）。
   数えないもの: ボットらしいUA / 運営（管理画面ログイン中）/ 同じIPからの連打。
   レスポンスは常に 204（ブラウザ側は結果を見ない）。 */

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|axios/i;

export async function POST(request: Request) {
  const none = new Response(null, { status: 204 });
  let key: ReturnType<typeof parseSourceKey> = null;
  let kind: SourceKind = "visit";
  try {
    const body = JSON.parse((await request.text()).slice(0, 2000));
    key = parseSourceKey(body ?? {});
    if (body?.kind === "signup") kind = "signup";
  } catch {
    return none;
  }
  if (!key) return none;

  const h = await headers();
  if (BOT_UA.test(h.get("user-agent") ?? "")) return none;
  if (isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) return none;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !allow(`sources:ip:${ip}`, 60, 60 * 60 * 1000)) return none;

  try {
    await recordSource(key, kind);
  } catch (err) {
    console.error("[sources] 記録に失敗", err);
  }
  return none;
}
