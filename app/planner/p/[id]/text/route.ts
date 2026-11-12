import { buildPlanText } from "../../../../../lib/planner";
import { buildObjectionsText } from "../../../../../lib/plannerObjections";
import { loadPlan, planUntil } from "../../../../../lib/plannerStore";

/* 専用ページの「テキストで保存」。30日で消える前に、質問・想定回答・着地予想・虎の巻を手元に残すためのファイルを返す。 */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await loadPlan(id);
  if (!saved) return new Response("保存期間が終わったか、URLが正しくありません。", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

  const body = [
    "事例プランナー｜質問リストと着地予想",
    `（オンラインの保存期限：${planUntil(saved)}）`,
    "",
    buildPlanText(saved.plan),
    buildObjectionsText(saved.plan.purposes),
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="jirei-planner.txt"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
