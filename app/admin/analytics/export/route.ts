import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "../../../../lib/admin";
import {
  EVENT_KINDS, TZ, analyticsEnabled, daysOfMonth, jstMonth, readEventsRange, type EventKind, type StoredEvent,
} from "../../../../lib/analytics";
import { getCase } from "../../../../lib/cases";
import { AXES, answerLabel } from "../../../../lib/finder";
import { challengeLabel, industryLabel } from "../../../../lib/taxonomy";

/* 生イベントのCSV出力（管理者のみ）。
   /admin/analytics/export?m=YYYY-MM&kind=suggest|finder|views|all
   スポンサー向け資料・掲載企業への特典レポートの材料として、そのまま表計算ソフトで開ける形にする。 */

export const dynamic = "force-dynamic";

const GROUPS: Record<string, EventKind[]> = {
  suggest: ["suggest"],
  finder: ["finder:answer", "finder:result"],
  views: ["view:challenge", "view:case"],
  all: EVENT_KINDS,
};

const HEAD = [
  "日時(JST)", "種別", "対象", "名称", "ベンダー",
  "URL", "メール", "AIの理解", "業種", "タグ", "キーワード", "課題", "提示件数", "メルマガ",
  "回答", "候補件数", "流入元",
];

const tsFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function cell(v: unknown): string {
  const s = v == null ? "" : Array.isArray(v) ? v.join(" / ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(e: StoredEvent): string[] {
  const m = e.meta ?? {};
  let name = "";
  let vendor = "";
  if (e.kind === "view:case") {
    const c = getCase(e.target);
    name = c?.title ?? "";
    vendor = c?.vendor ?? "";
  } else if (e.kind === "view:challenge") {
    name = challengeLabel(e.target);
  } else if (e.kind === "finder:answer") {
    const [k, v] = e.target.split("=");
    const ax = AXES.find((a) => a.key === k);
    name = ax ? `${ax.short}: ${answerLabel(ax.key, v)}` : e.target;
  } else if (e.kind === "suggest") {
    name = String(m.summary ?? "");
  }
  const answers = (m.answers ?? {}) as Record<string, string>;
  const answerText = AXES.filter((a) => answers[a.key]).map((a) => `${a.short}=${answerLabel(a.key, answers[a.key])}`).join(" / ");
  const industry = typeof m.industry === "string" && m.industry ? industryLabel(m.industry) : "";
  const challenges = Array.isArray(m.challenges) ? m.challenges.map((c) => challengeLabel(String(c))) : [];

  return [
    e.ts ? tsFmt.format(new Date(e.ts)) : "",
    e.kind, e.target, name, vendor,
    m.url, m.email, e.kind === "suggest" ? "" : m.summary, industry, m.tags, m.keywords, challenges, m.matched,
    m.newsletter == null ? "" : m.newsletter ? "希望" : "",
    answerText, m.count, m.source,
  ].map(cell);
}

export async function GET(req: NextRequest): Promise<Response> {
  if (!isAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) return new Response("Unauthorized", { status: 401 });
  if (!analyticsEnabled()) return new Response("ANALYTICS_TABLE が未設定です", { status: 503 });

  const sp = req.nextUrl.searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.get("m") ?? "") ? sp.get("m")! : jstMonth();
  const group = sp.get("kind") ?? "all";
  const kinds = GROUPS[group];
  if (!kinds) return new Response("kind が不正です", { status: 400 });

  const events = await readEventsRange(kinds, daysOfMonth(month));
  const lines = [HEAD.map(cell).join(","), ...events.map((e) => row(e).join(","))];
  // 先頭のBOMはExcelで文字化けさせないため
  const body = "﻿" + lines.join("\r\n") + "\r\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vizlabo-analytics-${group}-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
