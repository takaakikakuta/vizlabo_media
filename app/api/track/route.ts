import type { NextRequest } from "next/server";
import { AXES, SKIP, type AxisKey } from "../../../lib/finder";
import { getCase } from "../../../lib/cases";
import { CHALLENGE_MAP } from "../../../lib/taxonomy";
import { allow } from "../../../lib/ratelimit";
import { recordEvent, type AnalyticsEvent } from "../../../lib/analytics";

/* ページ閲覧・ファインダー操作のビーコン受け口（components/Track.tsx から fetch で叩く）。
   課題ページ・事例ページは ISR（24時間キャッシュ）なので、サーバー描画時には数えられない。
   ブラウザで表示されたタイミングで1回だけここに届く。

   いたずら対策：種別と対象を実在するものに限定し、ボットのUAを落とし、IPごとに回数を制限する。
   失敗しても画面には影響しないので、応答は常に 204（本文なし）。 */

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl\/|wget\/|python-requests|httpclient|monitor/i;

const AXIS_KEYS = new Set<string>(AXES.map((a) => a.key));

/** 受信JSONを検証し、記録して良いイベントに整える。不正なら null */
function parse(body: unknown): { ev: AnalyticsEvent; caseId?: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const kind = typeof b.kind === "string" ? b.kind : "";
  const target = typeof b.target === "string" ? b.target.trim().slice(0, 200) : "";

  if (kind === "view:challenge") {
    if (!CHALLENGE_MAP[target]) return null;
    return { ev: { kind, target } };
  }
  if (kind === "view:case") {
    if (!getCase(target)) return null;
    return { ev: { kind, target }, caseId: target };
  }
  if (kind === "finder:answer") {
    // target = "軸=値"。値は実在する選択肢に限る（スキップは数えない）
    const [axis, value] = target.split("=");
    if (!AXIS_KEYS.has(axis) || !value || value === SKIP) return null;
    const ax = AXES.find((a) => a.key === axis)!;
    if (!ax.options.some((o) => o.value === value)) return null;
    return { ev: { kind, target, meta: { answers: cleanAnswers(b.answers) } } };
  }
  if (kind === "finder:result") {
    const answers = cleanAnswers(b.answers);
    if (Object.keys(answers).length === 0) return null;
    const count = typeof b.count === "number" && Number.isFinite(b.count) ? Math.max(0, Math.floor(b.count)) : undefined;
    const t = AXES.map((a) => (answers[a.key] ? `${a.key}=${answers[a.key]}` : "")).filter(Boolean).join("&");
    return { ev: { kind, target: t, meta: { answers, count } } };
  }
  return null;
}

/** 回答オブジェクトから実在する軸・値だけを残す（スキップ "-" は残す＝結果の条件として意味がある） */
function cleanAnswers(v: unknown): Partial<Record<AxisKey, string>> {
  const out: Partial<Record<AxisKey, string>> = {};
  if (!v || typeof v !== "object") return out;
  for (const a of AXES) {
    const val = (v as Record<string, unknown>)[a.key];
    if (typeof val !== "string") continue;
    if (val === SKIP || a.options.some((o) => o.value === val)) out[a.key] = val;
  }
  return out;
}

export async function POST(req: NextRequest): Promise<Response> {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  // 1分に60回まで（通常の閲覧では到底届かない。連打・スクリプトだけ落とす）
  if (ip && !allow(`track:${ip}`, 60, 60_000)) return new Response(null, { status: 204 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const parsed = parse(body);
  if (!parsed) return new Response(null, { status: 204 });

  try {
    await recordEvent(parsed.ev, parsed.caseId ? getCase(parsed.caseId) : undefined);
  } catch (err) {
    console.error("[analytics] 記録に失敗", parsed.ev.kind, parsed.ev.target, err);
  }
  return new Response(null, { status: 204 });
}
