import { QueryCommand, UpdateItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { dynamo, awsKeysConfigured } from "./dynamo";
import { jstDay } from "./views";

/* 流入元の計測。UTM つきの URL で来た訪問を「日 × 流入元 × 着地ページ」で数える。
   SNS（X・Threads・LinkedIn・YouTube）とメルマガのどれが、どの種類の記事に人を連れてきたかを /admin/sources で見る。
   テーブルは amplify/backend.ts（PK day、SK src）。記録は app/api/sources/route.ts、通知は components/SourceBeacon.tsx。
   SOURCES_TABLE か IAM キーが無い環境（ローカル開発など）では記録せず、読み出しは空を返す。 */

const TABLE = process.env.SOURCES_TABLE || "";

export function sourcesConfigured(): boolean {
  return Boolean(TABLE) && awsKeysConfigured();
}

/** 計測の種類。visit＝UTM つきでの来訪、signup＝その来訪からのメルマガ登録 */
export type SourceKind = "visit" | "signup";

export type SourceKey = { source: string; medium: string; campaign: string; path: string };

/** UTM の値を整える。区切りに使う | と制御文字を落とし、長すぎる値は切る。source・medium は小文字に揃える */
function clean(v: unknown, max: number, lower = false): string {
  const s = (typeof v === "string" ? v : "").replace(/[|\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
  return lower ? s.toLowerCase() : s;
}

/** ブラウザから届いた値を検査して整える。source か path が無ければ null（数えない） */
export function parseSourceKey(body: { s?: unknown; m?: unknown; c?: unknown; p?: unknown }): SourceKey | null {
  const source = clean(body.s, 60, true);
  const path = clean(body.p, 200).split(/[?#]/)[0];
  if (!source || !path.startsWith("/") || /\s/.test(path)) return null;
  return { source, medium: clean(body.m, 60, true), campaign: clean(body.c, 80), path };
}

export async function recordSource(k: SourceKey, kind: SourceKind): Promise<boolean> {
  if (!sourcesConfigured()) {
    console.info("[sources] 未設定のため記録しない", kind, JSON.stringify(k));
    return false;
  }
  await dynamo().send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { day: { S: jstDay() }, src: { S: [k.source, k.medium, k.campaign, k.path].join("|") } },
    UpdateExpression: "ADD #n :one",
    ExpressionAttributeNames: { "#n": kind === "signup" ? "signups" : "visits" },
    ExpressionAttributeValues: { ":one": { N: "1" } },
  }));
  return true;
}

export type SourceRow = SourceKey & { day: string; visits: number; signups: number };

async function loadDay(day: string): Promise<SourceRow[]> {
  const rows: SourceRow[] = [];
  let start: Record<string, AttributeValue> | undefined;
  do {
    const res = await dynamo().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "#d = :d",
      ExpressionAttributeNames: { "#d": "day" },
      ExpressionAttributeValues: { ":d": { S: day } },
      ExclusiveStartKey: start,
    }));
    for (const it of res.Items ?? []) {
      const [source = "", medium = "", campaign = "", path = ""] = (it.src?.S ?? "").split("|");
      rows.push({ day, source, medium, campaign, path, visits: Number(it.visits?.N ?? 0), signups: Number(it.signups?.N ?? 0) });
    }
    start = res.LastEvaluatedKey;
  } while (start);
  return rows;
}

/** 直近 days 日（今日を含む）の行を返す */
export async function loadSources(days: number): Promise<SourceRow[]> {
  if (!sourcesConfigured()) return [];
  const list = Array.from({ length: days }, (_, i) => jstDay(i));
  const out: SourceRow[] = [];
  for (let i = 0; i < list.length; i += 10) {
    const chunk = await Promise.all(list.slice(i, i + 10).map(loadDay));
    for (const rows of chunk) out.push(...rows);
  }
  return out;
}

/* ── 表示用のまとめ方 ── */

const KNOWN: [RegExp, string][] = [
  [/^(x|twitter|x\.com|twitter\.com|t\.co)$/, "X"],
  [/^threads(\.net|\.com)?$/, "Threads"],
  [/^(linkedin(\.com)?|lnkd\.in)$/, "LinkedIn"],
  [/^(youtube(\.com)?|youtu\.be|yt)$/, "YouTube"],
  [/^(newsletter|mail|email|benchmark)$/, "メルマガ"],
  [/^note(\.com)?$/, "note"],
  [/^(facebook(\.com)?|fb)$/, "Facebook"],
];

/** 媒体名。utm_source で分からなければ utm_medium も見る（source=sns, medium=x のような付け方に対応）。
    どちらも知らない値なら utm_source をそのまま出す */
export function sourceLabel(source: string, medium: string): string {
  for (const v of [source, medium]) {
    const hit = KNOWN.find(([re]) => re.test(v));
    if (hit) return hit[1];
  }
  return source;
}

export const CONTENT_KINDS = ["事例セレクション", "技術用語", "記念日", "事例ページ", "その他"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** 着地ページの種類 */
export function contentKind(path: string): ContentKind {
  if (path.startsWith("/articles/")) return "事例セレクション";
  if (path.startsWith("/terms/")) return "技術用語";
  if (path.startsWith("/days/")) return "記念日";
  if (path.startsWith("/cases/")) return "事例ページ";
  return "その他";
}
