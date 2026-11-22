import { QueryCommand, UpdateItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { dynamo, awsKeysConfigured } from "./dynamo";
import { jstDay } from "./views";

/* 事例セレクション（と事例でわかる技術用語）の「枠」の計測。広告枠の販売根拠（月間PV・枠位置別の遷移率）を貯める。
   テーブルは amplify/backend.ts（PK day、SK k、日別の加算カウンタ）。個人を特定する値は持たず、集計値だけ。
   行は2種類:
     slot|<slug>|<枠位置>|<事例ID>  … imps（枠の表示）/ trans（遷移＝枠のどちらかのリンクのクリック。1閲覧1回）/
                                      toCase（事例ページへ）/ toSrc（元記事へ直接）/ via（事例ページ経由で元記事へ）、vendor
     ref|<slug>|<流入元>            … pv（記事の閲覧を流入元で分けたもの。記事PVの本体は lib/views.ts）
   記録は app/api/slots/route.ts（枠）と app/api/views/route.ts（流入元）、集計は lib/slotsReport.ts。
   SLOTS_TABLE か IAM キーが無い環境（ローカル開発など）では記録せず、読み出しは空を返す。 */

const TABLE = process.env.SLOTS_TABLE || "";

export function slotsConfigured(): boolean {
  return Boolean(TABLE) && awsKeysConfigured();
}

export const SLOT_COUNTERS = ["imps", "trans", "toCase", "toSrc", "via"] as const;
export type SlotCounter = (typeof SLOT_COUNTERS)[number];
export type SlotCounts = Record<SlotCounter, number>;

export function emptyCounts(): SlotCounts {
  return { imps: 0, trans: 0, toCase: 0, toSrc: 0, via: 0 };
}

/* ── 流入元 ── */

export const REF_CATEGORIES = [
  "search", "ai", "x", "threads", "youtube", "linkedin", "facebook", "instagram", "note", "newsletter",
  "internal", "direct", "other",
] as const;
export type RefCategory = (typeof REF_CATEGORIES)[number];

export const REF_LABELS: Record<RefCategory, string> = {
  search: "検索", ai: "AI", x: "X", threads: "Threads", youtube: "YouTube", linkedin: "LinkedIn",
  facebook: "Facebook", instagram: "Instagram", note: "note", newsletter: "メルマガ",
  internal: "サイト内", direct: "直接・不明", other: "その他",
};

const UTM_MAP: [RegExp, RefCategory][] = [
  [/^(newsletter|mail|email|benchmark)/, "newsletter"],
  [/^(x|twitter)$/, "x"],
  [/^threads/, "threads"],
  [/^(youtube|yt)$/, "youtube"],
  [/^linkedin/, "linkedin"],
  [/^(facebook|fb)$/, "facebook"],
  [/^(instagram|ig)$/, "instagram"],
  [/^note$/, "note"],
  [/^(google|yahoo|bing)$/, "search"],
  [/^(chatgpt|chatgpt\.com|openai|perplexity|gemini|copilot|claude)/, "ai"],
];

const HOST_MAP: [RegExp, RefCategory][] = [
  [/(^|\.)vizlabo\.com$/, "internal"],
  [/(^|\.)(google\.[a-z.]+|bing\.com|yahoo\.co\.jp|yahoo\.com|duckduckgo\.com|ecosia\.org|baidu\.com|naver\.com|yandex\.[a-z]+|search\.brave\.com)$/, "search"],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai)$/, "ai"],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "x"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)note\.com$/, "note"],
];

/** 流入元を決める。utm_source があればそれを優先（/admin/sources の UTM 計測と同じ値の扱い）、無ければ参照元のホスト名だけで分類する。
    internal は「サイト内の画面遷移で来た」（ブラウザ側で判定）。gemini.google.com は検索より先に AI として拾う */
export function classifyRef(utmSource: unknown, refHost: unknown, internal: unknown): RefCategory {
  if (internal) return "internal";
  const u = typeof utmSource === "string" ? utmSource.trim().toLowerCase().slice(0, 60) : "";
  if (u) return UTM_MAP.find(([re]) => re.test(u))?.[1] ?? "other";
  const h = typeof refHost === "string" ? refHost.trim().toLowerCase().slice(0, 200) : "";
  if (!h) return "direct";
  if (/(^|\.)gemini\.google\.com$/.test(h)) return "ai";
  return HOST_MAP.find(([re]) => re.test(h))?.[1] ?? "other";
}

/* ── 記録 ── */

export type SlotKey = { slug: string; pos: number; caseId: string; vendor: string };

export async function recordSlot(k: SlotKey, add: Partial<SlotCounts>): Promise<boolean> {
  const fields = SLOT_COUNTERS.filter((f) => (add[f] ?? 0) > 0);
  if (fields.length === 0) return false;
  if (!slotsConfigured()) {
    console.info("[slots] 未設定のため記録しない", JSON.stringify(k), JSON.stringify(add));
    return false;
  }
  const names: Record<string, string> = {};
  const values: Record<string, AttributeValue> = { ":vendor": { S: k.vendor } };
  fields.forEach((f, i) => {
    names[`#c${i}`] = f;
    values[`:c${i}`] = { N: String(add[f]) };
  });
  await dynamo().send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { day: { S: jstDay() }, k: { S: `slot|${k.slug}|${k.pos}|${k.caseId}` } },
    UpdateExpression: `ADD ${fields.map((_, i) => `#c${i} :c${i}`).join(", ")} SET vendor = :vendor`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
  return true;
}

export async function recordRef(slug: string, ref: RefCategory): Promise<boolean> {
  if (!slotsConfigured()) {
    console.info("[slots] 未設定のため記録しない", "ref", slug, ref);
    return false;
  }
  await dynamo().send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { day: { S: jstDay() }, k: { S: `ref|${slug}|${ref}` } },
    UpdateExpression: "ADD pv :one",
    ExpressionAttributeValues: { ":one": { N: "1" } },
  }));
  return true;
}

/* ── 読み出し ── */

export type SlotRow = SlotKey & SlotCounts & { day: string };
export type RefRow = { day: string; slug: string; ref: RefCategory; pv: number };

async function loadDay(day: string): Promise<{ slots: SlotRow[]; refs: RefRow[] }> {
  const slots: SlotRow[] = [];
  const refs: RefRow[] = [];
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
      const [type, slug = "", a = "", b = ""] = (it.k?.S ?? "").split("|");
      if (type === "slot") {
        const n = (f: SlotCounter) => Number(it[f]?.N ?? 0);
        slots.push({
          day, slug, pos: Number(a), caseId: b, vendor: it.vendor?.S ?? "",
          imps: n("imps"), trans: n("trans"), toCase: n("toCase"), toSrc: n("toSrc"), via: n("via"),
        });
      } else if (type === "ref" && (REF_CATEGORIES as readonly string[]).includes(a)) {
        refs.push({ day, slug, ref: a as RefCategory, pv: Number(it.pv?.N ?? 0) });
      }
    }
    start = res.LastEvaluatedKey;
  } while (start);
  return { slots, refs };
}

/** 直近 days 日（今日を含む）の行を返す。日付ごとに Query するので期間に比例して読む */
export async function loadSlots(days: number): Promise<{ slots: SlotRow[]; refs: RefRow[] }> {
  const out = { slots: [] as SlotRow[], refs: [] as RefRow[] };
  if (!slotsConfigured()) return out;
  const list = Array.from({ length: days }, (_, i) => jstDay(i));
  for (let i = 0; i < list.length; i += 10) {
    const chunk = await Promise.all(list.slice(i, i + 10).map(loadDay));
    for (const r of chunk) {
      out.slots.push(...r.slots);
      out.refs.push(...r.refs);
    }
  }
  return out;
}
