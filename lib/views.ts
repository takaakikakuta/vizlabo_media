import { DynamoDBClient, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/* 事例ページの閲覧数。テーブルは amplify/backend.ts（日別 × 事例の加算カウンタ）。
   記録は app/api/views/route.ts、集計表示は app/admin/views/page.tsx。
   VIEWS_TABLE か IAM キーが無い環境（ローカル開発など）では記録せず、読み出しは空を返す。 */

const TABLE = process.env.VIEWS_TABLE || "";

let client: DynamoDBClient | null = null;
function db(): DynamoDBClient {
  if (!client) {
    const id = process.env.APP_AWS_ACCESS_KEY_ID;
    const secret = process.env.APP_AWS_SECRET_ACCESS_KEY;
    client = new DynamoDBClient({
      region: "ap-northeast-1",
      // ローカル開発で DynamoDB Local などに向けるとき用（本番では未設定）
      ...(process.env.VIEWS_DYNAMODB_ENDPOINT ? { endpoint: process.env.VIEWS_DYNAMODB_ENDPOINT } : {}),
      ...(id && secret ? { credentials: { accessKeyId: id, secretAccessKey: secret } } : {}),
    });
  }
  return client;
}

export function viewsConfigured(): boolean {
  return Boolean(TABLE && process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY);
}

/** JST の日付 "YYYY-MM-DD"。daysAgo 日前を返す */
export function jstDay(daysAgo = 0): string {
  const d = new Date(Date.now() + 9 * 3600_000 - daysAgo * 86400_000);
  return d.toISOString().slice(0, 10);
}

export async function recordView(caseId: string, vendor: string): Promise<boolean> {
  if (!viewsConfigured()) {
    console.info("[views] 未設定のため記録しない", caseId);
    return false;
  }
  await db().send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { day: { S: jstDay() }, caseId: { S: caseId } },
    UpdateExpression: "ADD #v :one SET vendor = :vendor",
    ExpressionAttributeNames: { "#v": "views" },
    ExpressionAttributeValues: { ":one": { N: "1" }, ":vendor": { S: vendor } },
  }));
  return true;
}

export type ViewRow = { day: string; caseId: string; vendor: string; views: number };

async function loadDay(day: string): Promise<ViewRow[]> {
  const rows: ViewRow[] = [];
  let start: Record<string, import("@aws-sdk/client-dynamodb").AttributeValue> | undefined;
  do {
    const res = await db().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#d = :d",
      ExpressionAttributeNames: { "#d": "day" },
      ExpressionAttributeValues: { ":d": { S: day } },
      ExclusiveStartKey: start,
    }));
    for (const it of res.Items ?? []) {
      rows.push({
        day,
        caseId: it.caseId?.S ?? "",
        vendor: it.vendor?.S ?? "",
        views: Number(it.views?.N ?? 0),
      });
    }
    start = res.LastEvaluatedKey;
  } while (start);
  return rows;
}

/** 直近 days 日（今日を含む）の行を返す。日付ごとに Query するので期間に比例して読む */
export async function loadViews(days: number): Promise<ViewRow[]> {
  if (!viewsConfigured()) return [];
  const list = Array.from({ length: days }, (_, i) => jstDay(i));
  const out: ViewRow[] = [];
  for (let i = 0; i < list.length; i += 10) {
    const chunk = await Promise.all(list.slice(i, i + 10).map(loadDay));
    for (const rows of chunk) out.push(...rows);
  }
  return out;
}
