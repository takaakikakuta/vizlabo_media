import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "../../../../lib/admin";
import { buildSlotsReport, slotsCsv, CSV_TYPES, type CsvType } from "../../../../lib/slotsReport";
import { jstDay } from "../../../../lib/views";

/* 運営用: 枠の計測の CSV（/admin/slots/csv?type=articles&days=7）。type は lib/slotsReport.ts の CSV_TYPES。
   運営ログイン（/admin/slots と同じクッキー）が無ければ 401。 */

export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90];

export async function GET(request: NextRequest) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return new Response("運営ログインが必要です（/admin/slots）", { status: 401 });
  }
  const q = request.nextUrl.searchParams;
  const days = PERIODS.find((p) => String(p) === q.get("days")) ?? 7;
  const t = q.get("type") ?? "articles";
  const type = (t in CSV_TYPES ? t : "articles") as CsvType;
  const report = await buildSlotsReport(days);
  const name = `jirei-mania-slots-${type}-${jstDay(days - 1)}_${jstDay(0)}.csv`;
  return new Response(slotsCsv(report, type), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
