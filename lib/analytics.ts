import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, TransactWriteCommand, type TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "node:crypto";
import { CHALLENGE_MAP } from "./taxonomy";
import type { CaseStudy } from "./types";

/* 課題別の計測（自前の一次データ）。
   「どの課題ページ・事例が何回見られたか」「ファインダー／URL診断でどの課題が何回選ばれたか」を
   DynamoDB に貯める。GTM/GA とは別に自前で持つ理由：
     ・スポンサー営業の根拠（課題カテゴリ別の閲覧・選択数）と、掲載企業への特典データ（自社事例の閲覧数）に
       そのまま使える形で、生データごと手元に残す
     ・2つのアプリ（ファインダー／URL診断）の入力は「いま企業が困っていること」の一次データ

   ── テーブル設計（1テーブル・pk/sk） ──────────────────────────────
   1) 生イベント（追記のみ・再集計の元データ）
        pk = "ev#<kind>#<YYYY-MM-DD>"（JST）   sk = "<ISO時刻>#<乱数>"
        kind / target / meta（JSON）
        種別ごとに分けるのは、閲覧（多い）に埋もれずにアプリの入力（少ない・価値が高い）だけを安く読むため
   2) 集計カウンタ（ダッシュボード用。UpdateItem の ADD で原子的に加算）
        pk = "cnt#<metric>#<YYYY-MM>" と "cnt#<metric>#all"   sk = <target>   n = 件数
        pk = "cnt#<kind>#day"                                  sk = <YYYY-MM-DD>  n = 件数（種別ごとの日次推移）
   1イベント = 生1件 + カウンタ数件を TransactWrite で1往復・原子的に書く。

   ── 設定 ──
   ANALYTICS_TABLE が空なら無効（ログのみ）。本番は next.config.ts でビルド時に焼き込む。
   認証は Bedrock と同じ APP_AWS_*（SSRランタイムに既定チェーンが無いため）。
   テーブル自体は amplify/backend.ts が作る（名前は vizlabo-media-analytics-<ブランチ>）。 */

export const TZ = "Asia/Tokyo";

/* ── イベント種別 ─────────────────────────────────────────────── */

export type EventKind =
  | "view:challenge"   // 課題ページの閲覧（target = 課題slug）
  | "view:case"        // 事例ページの閲覧（target = 事例id）
  | "finder:answer"    // ファインダーで選択肢を1つ選んだ（target = "軸=値"）
  | "finder:result"    // ファインダーで結果一覧に到達（target = 回答の組み合わせ）
  | "suggest";         // URL診断を実行（target = 入力サイトのホスト名）

export const EVENT_KINDS: EventKind[] = ["view:challenge", "view:case", "finder:answer", "finder:result", "suggest"];

export const KIND_LABEL: Record<EventKind, string> = {
  "view:challenge": "課題ページ閲覧",
  "view:case": "事例ページ閲覧",
  "finder:answer": "ファインダー回答",
  "finder:result": "ファインダー結果到達",
  suggest: "URL診断",
};

/* 集計カウンタの名前（metric）。target と組で件数を持つ。 */
export type Metric =
  | "view:challenge"     // 課題slug → 課題ページの閲覧数
  | "view:case"          // 事例id → 事例ページの閲覧数
  | "view:vendor"        // ベンダー名 → そのベンダーの事例ページ閲覧数（掲載企業への特典データ）
  | "case:challenge"     // 課題slug → その課題を持つ事例ページの閲覧数
  | "finder:answer"      // "軸=値" → 選ばれた回数
  | "finder:challenge"   // 課題slug → ファインダーの「ほしい成果」から対応づけた課題の選択数
  | "suggest:industry"   // 業種slug → URL診断でAIが推定した業種
  | "suggest:tag"        // 困りごとタグ → URL診断でAIが推定したタグ
  | "suggest:challenge"; // 課題slug → URL診断でAIが推定した課題

export type AnalyticsEvent = {
  kind: EventKind;
  target: string;
  meta?: Record<string, unknown>;
};

/* ファインダーの「いちばん手に入れたい成果」→ 課題カテゴリ。
   軸の値は lib/finder.ts の EFFECTS。ダッシュボードで課題ごとに横並びにするための対応表。 */
export const EFFECT_TO_CHALLENGE: Record<string, string> = {
  time: "efficiency",
  cost: "cost",
  quality: "quality",
  staffing: "labor",
  standard: "standardize",
  visibility: "data",
  sales: "sales",
  cx: "cs",
  people: "hr",
  risk: "security",
  environment: "sustainability",
};

/* ── 日付（JST） ─────────────────────────────────────────────── */

const ymdFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** JSTの YYYY-MM-DD */
export function jstDay(d: Date = new Date()): string {
  return ymdFmt.format(d);
}
/** JSTの YYYY-MM */
export function jstMonth(d: Date = new Date()): string {
  return jstDay(d).slice(0, 7);
}
/** 月 "YYYY-MM" の日付一覧（未来の日は含めない） */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const today = jstDay();
  const out: string[] = [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    const s = `${month}-${String(d).padStart(2, "0")}`;
    if (s > today) break;
    out.push(s);
  }
  return out;
}
/** 今日から n 日分の日付（古い順） */
export function recentDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(jstDay(new Date(now - i * 86400_000)));
  return out;
}

/* ── クライアント ─────────────────────────────────────────────── */

const REGION = process.env.ANALYTICS_REGION || "ap-northeast-1";
// ローカル検証用（DynamoDB Local 等）。本番では使わないので next.config.ts には焼き込まない
const ENDPOINT = process.env.ANALYTICS_ENDPOINT || undefined;

export function analyticsTable(): string | undefined {
  return process.env.ANALYTICS_TABLE?.trim() || undefined;
}

/** 計測が有効か（テーブル名が設定されているか） */
export function analyticsEnabled(): boolean {
  return Boolean(analyticsTable());
}

let _doc: DynamoDBDocumentClient | undefined;
function doc(): DynamoDBDocumentClient {
  if (_doc) return _doc;
  const id = process.env.APP_AWS_ACCESS_KEY_ID;
  const secret = process.env.APP_AWS_SECRET_ACCESS_KEY;
  const client = new DynamoDBClient({
    region: REGION,
    ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
    ...(id && secret ? { credentials: { accessKeyId: id, secretAccessKey: secret } } : {}),
  });
  _doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  return _doc;
}

/* ── 書き込み ─────────────────────────────────────────────────── */

/** イベントから加算すべき (metric, target) の一覧を導く。
    事例閲覧は「事例id」「ベンダー」「その事例の課題」に、ファインダーの成果は課題にも展開する。 */
export function countersFor(ev: AnalyticsEvent, c?: CaseStudy): [Metric, string][] {
  const out: [Metric, string][] = [];
  switch (ev.kind) {
    case "view:challenge":
      out.push(["view:challenge", ev.target]);
      break;
    case "view:case":
      out.push(["view:case", ev.target]);
      if (c) {
        out.push(["view:vendor", c.vendor]);
        for (const ch of c.challenges) out.push(["case:challenge", ch]);
      }
      break;
    case "finder:answer": {
      out.push(["finder:answer", ev.target]);
      const [axis, value] = ev.target.split("=");
      const ch = axis === "eff" ? EFFECT_TO_CHALLENGE[value] : undefined;
      if (ch) out.push(["finder:challenge", ch]);
      break;
    }
    case "finder:result":
      break;
    case "suggest": {
      const m = ev.meta ?? {};
      if (typeof m.industry === "string" && m.industry) out.push(["suggest:industry", m.industry]);
      if (Array.isArray(m.tags)) for (const t of m.tags) if (typeof t === "string" && t) out.push(["suggest:tag", t]);
      if (Array.isArray(m.challenges)) {
        for (const ch of m.challenges) if (typeof ch === "string" && CHALLENGE_MAP[ch]) out.push(["suggest:challenge", ch]);
      }
      break;
    }
  }
  return out;
}

/** 1イベントを記録する。無効時はログのみ。失敗は throw（呼び出し側で握りつぶす）。 */
export async function recordEvent(ev: AnalyticsEvent, c?: CaseStudy): Promise<void> {
  const table = analyticsTable();
  const now = new Date();
  const ts = now.toISOString();
  const day = jstDay(now);
  const month = day.slice(0, 7);

  if (!table) {
    console.info("[analytics] ANALYTICS_TABLE 未設定のためログのみ", JSON.stringify({ ts, ...ev }));
    return;
  }

  const add = (pk: string, sk: string) => ({
    Update: {
      TableName: table,
      Key: { pk, sk },
      UpdateExpression: "ADD #n :one SET #u = :ts",
      ExpressionAttributeNames: { "#n": "n", "#u": "updatedAt" },
      ExpressionAttributeValues: { ":one": 1, ":ts": ts },
    },
  });

  // 同じ (pk, sk) を1トランザクションで2回更新できないので重複を除く
  const seen = new Set<string>();
  const items: NonNullable<TransactWriteCommandInput["TransactItems"]> = [
    {
      Put: {
        TableName: table,
        Item: {
          pk: `ev#${ev.kind}#${day}`,
          sk: `${ts}#${randomBytes(4).toString("hex")}`,
          kind: ev.kind,
          target: ev.target,
          meta: ev.meta ?? {},
          ts,
        },
      },
    },
    add(`cnt#${ev.kind}#day`, day),
  ];
  for (const [metric, target] of countersFor(ev, c)) {
    for (const period of [month, "all"]) {
      const pk = `cnt#${metric}#${period}`;
      const key = `${pk}|${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(add(pk, target));
    }
  }

  await doc().send(new TransactWriteCommand({ TransactItems: items }));
}

/* ── 読み出し（ダッシュボード用） ─────────────────────────────── */

export type Count = { target: string; n: number };

async function queryAll(pk: string): Promise<Record<string, unknown>[]> {
  const table = analyticsTable();
  if (!table) return [];
  const out: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc().send(new QueryCommand({
      TableName: table,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk },
      ExclusiveStartKey,
    }));
    out.push(...((res.Items ?? []) as Record<string, unknown>[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return out;
}

/** metric の target 別件数（多い順）。period は "YYYY-MM" か "all" */
export async function readCounts(metric: Metric, period: string): Promise<Count[]> {
  const items = await queryAll(`cnt#${metric}#${period}`);
  return items
    .map((i) => ({ target: String(i.sk), n: Number(i.n ?? 0) }))
    .sort((a, b) => b.n - a.n || a.target.localeCompare(b.target));
}

/** kind の日次件数（日付→件数）。範囲は days で指定 */
export async function readDaily(kind: EventKind, days: string[]): Promise<Record<string, number>> {
  const items = await queryAll(`cnt#${kind}#day`);
  const want = new Set(days);
  const out: Record<string, number> = {};
  for (const d of days) out[d] = 0;
  for (const i of items) {
    const d = String(i.sk);
    if (want.has(d)) out[d] = Number(i.n ?? 0);
  }
  return out;
}

export type StoredEvent = { ts: string; kind: EventKind; target: string; meta: Record<string, unknown> };

/** 指定日・指定種別の生イベント（古い順） */
export async function readEvents(kind: EventKind, day: string): Promise<StoredEvent[]> {
  const items = await queryAll(`ev#${kind}#${day}`);
  return items.map((i) => ({
    ts: String(i.ts ?? ""),
    kind: i.kind as EventKind,
    target: String(i.target ?? ""),
    meta: (i.meta ?? {}) as Record<string, unknown>,
  }));
}

/** 複数日×複数種別の生イベントをまとめて読む（新しい順）。並列数は控えめにする */
export async function readEventsRange(kinds: EventKind[], days: string[]): Promise<StoredEvent[]> {
  const jobs: [EventKind, string][] = [];
  for (const k of kinds) for (const d of days) jobs.push([k, d]);
  const out: StoredEvent[] = [];
  const CHUNK = 8;
  for (let i = 0; i < jobs.length; i += CHUNK) {
    const part = await Promise.all(jobs.slice(i, i + CHUNK).map(([k, d]) => readEvents(k, d)));
    for (const p of part) out.push(...p);
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts));
}
