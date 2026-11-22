import { cookies, headers } from "next/headers";
import { getArticle } from "../../../lib/articles";
import { getCountableCase } from "../../../lib/cases";
import { recordSlot, emptyCounts, type SlotCounts, type SlotKey } from "../../../lib/slots";
import { allow } from "../../../lib/ratelimit";
import { ADMIN_COOKIE, isAdminToken } from "../../../lib/admin";

/* 事例セレクション・用語記事の「枠」の計測（components/SlotTracker.tsx と SourceClickTracker.tsx）。
   sendBeacon で {s: 記事slug, e: [{t, p, c, f}]} を送ってくる。
     t = imp（枠が画面に入った）/ case（事例ページへのクリック）/ src（元記事へのクリック）/ via（事例ページ経由の元記事クリック）
     p = 枠位置（1始まり）、c = 事例ID、f = その閲覧でこの枠の最初のクリックか（遷移数 trans に数えるか）
   記事の p 番目の枠に c が載っているかをサーバーで確かめ、ベンダーは事例データから引く（ブラウザの値は信じない）。
   数えないもの: 実在しない記事・枠・事例 / ボットらしいUA / 運営（管理画面ログイン中）/ 同じIPからの連打。
   レスポンスは常に 204。 */

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|axios/i;
const MAX_EVENTS = 20;

export async function POST(request: Request) {
  const none = new Response(null, { status: 204 });
  let slug = "";
  let events: unknown[] = [];
  try {
    const body = JSON.parse((await request.text()).slice(0, 4000));
    slug = typeof body?.s === "string" ? body.s.slice(0, 120) : "";
    events = Array.isArray(body?.e) ? body.e.slice(0, MAX_EVENTS) : [];
  } catch {
    return none;
  }
  const article = slug ? getArticle(slug) : undefined;
  if (!article || (article.format !== "sen" && article.format !== "yougo") || events.length === 0) return none;

  const h = await headers();
  if (BOT_UA.test(h.get("user-agent") ?? "")) return none;
  if (isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) return none;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && !allow(`slots:ip:${ip}`, 300, 60 * 60 * 1000)) return none;

  // 同じ枠の出来事は1行にまとめて書く
  const acc = new Map<string, { key: SlotKey; add: SlotCounts }>();
  for (const raw of events) {
    const ev = raw as { t?: unknown; p?: unknown; c?: unknown; f?: unknown };
    const pos = Number(ev?.p);
    const caseId = typeof ev?.c === "string" ? ev.c : "";
    if (!Number.isInteger(pos) || pos < 1 || pos > article.items.length) continue;
    if (article.items[pos - 1].caseId !== caseId) continue;
    const c = getCountableCase(caseId);
    if (!c) continue;
    const id = `${pos}|${caseId}`;
    const cur = acc.get(id) ?? { key: { slug, pos, caseId, vendor: c.vendor }, add: emptyCounts() };
    switch (ev.t) {
      case "imp": cur.add.imps += 1; break;
      case "case": cur.add.toCase += 1; if (ev.f) cur.add.trans += 1; break;
      case "src": cur.add.toSrc += 1; if (ev.f) cur.add.trans += 1; break;
      case "via": cur.add.via += 1; break;
      default: continue;
    }
    acc.set(id, cur);
  }

  try {
    await Promise.all([...acc.values()].map(({ key, add }) => recordSlot(key, add)));
  } catch (err) {
    console.error("[slots] 記録に失敗", slug, err);
  }
  return none;
}
