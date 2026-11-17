import { QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamo, awsKeysConfigured } from "./dynamo";

/* 事例ページの閲覧数。テーブルは amplify/backend.ts（日別 × 事例の加算カウンタ）。
   記録は app/api/views/route.ts、集計表示は app/admin/views/page.tsx。
   VIEWS_TABLE か IAM キーが無い環境（ローカル開発など）では記録せず、読み出しは空を返す。 */

const TABLE = process.env.VIEWS_TABLE || "";

const db = dynamo;

export function viewsConfigured(): boolean {
  return Boolean(TABLE) && awsKeysConfigured();
}

/** JST の日付 "YYYY-MM-DD"。daysAgo 日前を返す */
export function jstDay(daysAgo = 0): string {
  const d = new Date(Date.now() + 9 * 3600_000 - daysAgo * 86400_000);
  return d.toISOString().slice(0, 10);
}

/** 計測の種類。view＝事例ページの閲覧、click＝出典（提供元の元記事）へのリンクのクリック＝送客 */
export type ViewKind = "view" | "click";

export async function recordView(caseId: string, vendor: string, kind: ViewKind = "view"): Promise<boolean> {
  if (!viewsConfigured()) {
    console.info("[views] 未設定のため記録しない", kind, caseId);
    return false;
  }
  await db().send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { day: { S: jstDay() }, caseId: { S: caseId } },
    UpdateExpression: "ADD #v :one SET vendor = :vendor",
    ExpressionAttributeNames: { "#v": kind === "click" ? "clicks" : "views" },
    ExpressionAttributeValues: { ":one": { N: "1" }, ":vendor": { S: vendor } },
  }));
  return true;
}

/* 記事ページの閲覧も同じテーブルに入れる。caseId を "article:<slug>"、vendor を ARTICLE_VENDOR にして事例と分ける
   （提供元で絞る読み出しには混ざらない） */
export const ARTICLE_PREFIX = "article:";
export const ARTICLE_VENDOR = "__article__";

export function recordArticleView(slug: string): Promise<boolean> {
  return recordView(ARTICLE_PREFIX + slug, ARTICLE_VENDOR, "view");
}

/** 直近 days 日の記事ごとの閲覧数（slug → 回数） */
export async function loadArticleViews(days: number): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const r of await loadViews(days, ARTICLE_VENDOR)) {
    const slug = r.caseId.slice(ARTICLE_PREFIX.length);
    out.set(slug, (out.get(slug) ?? 0) + r.views);
  }
  return out;
}

export type ViewRow = { day: string; caseId: string; vendor: string; views: number; clicks: number };

async function loadDay(day: string, vendor?: string): Promise<ViewRow[]> {
  const rows: ViewRow[] = [];
  let start: Record<string, import("@aws-sdk/client-dynamodb").AttributeValue> | undefined;
  do {
    const res = await db().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#d = :d",
      // 提供元で絞るときもその日の行は全部読む（読み出し量は同じ。返す量だけ減る）。
      // 会員が増えて読み出しが重くなったら vendor + day の GSI を足す
      ...(vendor ? { FilterExpression: "vendor = :v" } : {}),
      ExpressionAttributeNames: { "#d": "day" },
      ExpressionAttributeValues: { ":d": { S: day }, ...(vendor ? { ":v": { S: vendor } } : {}) },
      ExclusiveStartKey: start,
    }));
    for (const it of res.Items ?? []) {
      rows.push({
        day,
        caseId: it.caseId?.S ?? "",
        vendor: it.vendor?.S ?? "",
        views: Number(it.views?.N ?? 0),
        clicks: Number(it.clicks?.N ?? 0),
      });
    }
    start = res.LastEvaluatedKey;
  } while (start);
  return rows;
}

/** 直近 days 日（今日を含む）の行を返す。vendor を渡すとその提供元の行だけに絞る。日付ごとに Query するので期間に比例して読む */
export async function loadViews(days: number, vendor?: string): Promise<ViewRow[]> {
  if (!viewsConfigured()) return [];
  const list = Array.from({ length: days }, (_, i) => jstDay(i));
  const out: ViewRow[] = [];
  for (let i = 0; i < list.length; i += 10) {
    const chunk = await Promise.all(list.slice(i, i + 10).map((d) => loadDay(d, vendor)));
    for (const rows of chunk) out.push(...rows);
  }
  return out;
}
