import { randomBytes } from "node:crypto";
import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamo, awsKeysConfigured } from "./dynamo";
import type { Plan, PurposeChoice } from "./planner";

/* 事例プランナーで作ったプランの保存。テーブルは amplify/backend.ts（PlannerPlans。キーは pk だけ）。
   ・ID は推測できないランダムな文字列で、専用ページ（/planner/p/<id>）のURLになる。ログインは無い
   ・始めた日から30日で失効する。DynamoDB の ttl による削除は最大で2日ほど遅れるので、
     読み出し時にも期限を確かめ、過ぎていれば無いものとして扱う
   ・PLANS_TABLE か IAM キーが無い環境では、開発時だけメモリに持つ（再起動で消える）。
     本番で未設定なら保存せず、呼び出し側が全文メールに切り替える */

const TABLE = process.env.PLANS_TABLE || "";

export const PLAN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SavedPlan = {
  id: string;
  createdAt: number; // 作成時刻（ミリ秒）
  exp: number;       // 失効時刻（ミリ秒）
  email: string;     // 受け取ったメールアドレス（ページには出さない）
  url: string;       // 入力された製品ページのURL
  choice: PurposeChoice;
  plan: Plan;
};

// 開発サーバーはルートごとにモジュールを読み直すことがあるので、globalThis に置いて共有する
const g = globalThis as { __plannerPlans?: Map<string, SavedPlan> };
const memory = (g.__plannerPlans ??= new Map<string, SavedPlan>());
const memoryAllowed = () => process.env.NODE_ENV !== "production";

export function plannerStoreConfigured(): boolean {
  return (Boolean(TABLE) && awsKeysConfigured()) || memoryAllowed();
}

const ID = /^[A-Za-z0-9_-]{22}$/;

/** プランを保存して、失効日つきの記録を返す。保存できない環境・失敗時は throw。 */
export async function savePlan(input: Pick<SavedPlan, "email" | "url" | "choice" | "plan">): Promise<SavedPlan> {
  const now = Date.now();
  const saved: SavedPlan = { id: randomBytes(16).toString("base64url"), createdAt: now, exp: now + PLAN_DAYS * DAY_MS, ...input };

  if (TABLE && awsKeysConfigured()) {
    await dynamo().send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        pk: { S: `plan#${saved.id}` },
        data: { S: JSON.stringify(saved) },
        ttl: { N: String(Math.floor(saved.exp / 1000)) },
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  } else if (memoryAllowed()) {
    memory.set(saved.id, saved);
  } else {
    throw new Error("プランの保存先が設定されていません");
  }
  return saved;
}

/** 保存されたプランを読む。無い・期限切れ・IDの形が違う場合は null。 */
export async function loadPlan(id: string): Promise<SavedPlan | null> {
  if (!ID.test(id)) return null;
  let saved: SavedPlan | null = null;
  if (TABLE && awsKeysConfigured()) {
    const res = await dynamo().send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `plan#${id}` } } }));
    const data = res.Item?.data?.S;
    saved = data ? (JSON.parse(data) as SavedPlan) : null;
  } else if (memoryAllowed()) {
    saved = memory.get(id) ?? null;
  }
  if (!saved || saved.exp <= Date.now()) return null;
  return saved;
}

/** 失効日を「2026年12月12日」の形（日本時間）で返す。 */
export function planUntil(saved: Pick<SavedPlan, "exp">): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }).format(saved.exp);
}

/** 失効までの残り日数（切り上げ。当日は1）。 */
export function planDaysLeft(saved: Pick<SavedPlan, "exp">): number {
  return Math.max(1, Math.ceil((saved.exp - Date.now()) / DAY_MS));
}
