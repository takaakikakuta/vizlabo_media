import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  DeleteItemCommand, GetItemCommand, PutItemCommand, ScanCommand, type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { dynamo, awsKeysConfigured } from "./dynamo";
import { jstDay } from "./views";

/* ベンダー（提供元）会員。テーブルは amplify/backend.ts（キーは pk だけの1テーブル）。
   1件ずつ JSON で持つ。種類は pk の接頭辞で分ける:
     user#<email>    登録者。提供元ドメイン（domain）に紐づく。role は owner（最初の1人）か member
     otp#<email>     ログイン用の6桁コード（10分で失効。ttl で DynamoDB が自動削除）
     invite#<CODE>   招待コード。運営が /admin/vendors で発行し、掲載連絡の返信に URL を貼る
     apply#<email>   招待なしの申し込み。運営が承認すると user ができる
     account#<domain> 提供元ごとの契約。paidUntil まで有料（直近14日より前のデータも見られる）
   ログイン状態は署名付きクッキー（jm_vendor）で持ち、毎回 user を読み直して停止を反映する。 */

const TABLE = process.env.ACCOUNTS_TABLE || "";
const SECRET = process.env.VENDOR_SECRET || "";

export const VENDOR_COOKIE = "jm_vendor";
export const SESSION_DAYS = 30;
export const INVITE_DAYS = 60;
export const OTP_MINUTES = 10;
/** 無料で見られる期間（日）。これより前は有料 */
export const FREE_DAYS = 14;

export function accountsConfigured(): boolean {
  return Boolean(TABLE && SECRET) && awsKeysConfigured();
}

// ─── 型 ───

export type VendorUser = {
  email: string;
  domain: string;
  role: "owner" | "member";
  status: "active" | "disabled";
  createdAt: string;
  via: "invite" | "apply" | "admin";
};

type Otp = { email: string; hash: string; exp: number; attempts: number; purpose: "login" | "join"; invite?: string };

export type Invite = { code: string; domain: string; exp: number; createdAt: string; uses: number; revoked?: boolean };

export type Application = {
  email: string;
  company: string;
  person: string;
  site: string;
  note: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  domain?: string;
};

export type Account = { domain: string; paidUntil?: string; memo?: string };

// ─── 低レベル ───

async function getItem<T>(pk: string): Promise<T | null> {
  const res = await dynamo().send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: pk } }, ConsistentRead: true }));
  const data = res.Item?.data?.S;
  return data ? (JSON.parse(data) as T) : null;
}

async function putItem(pk: string, value: unknown, ttl?: number): Promise<void> {
  const item: Record<string, AttributeValue> = {
    pk: { S: pk },
    kind: { S: pk.split("#")[0] },
    data: { S: JSON.stringify(value) },
  };
  if (ttl) item.ttl = { N: String(ttl) };
  await dynamo().send(new PutItemCommand({ TableName: TABLE, Item: item }));
}

async function deleteItem(pk: string): Promise<void> {
  await dynamo().send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: pk } } }));
}

/** 種類ごとの全件（運営画面用）。件数は多くても数千の想定なので Scan で足りる */
async function scanKind<T>(kind: string): Promise<T[]> {
  const out: T[] = [];
  let start: Record<string, AttributeValue> | undefined;
  do {
    const res = await dynamo().send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "kind = :k",
      ExpressionAttributeValues: { ":k": { S: kind } },
      ExclusiveStartKey: start,
    }));
    for (const it of res.Items ?? []) if (it.data?.S) out.push(JSON.parse(it.data.S) as T);
    start = res.LastEvaluatedKey;
  } while (start);
  return out;
}

// ─── 正規化 ───

export function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

/** URL・ドメインどちらで書かれても提供元ドメインに揃える（https://www.example.co.jp/xxx → example.co.jp） */
export function normDomain(s: string): string {
  let t = s.trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(t)) t = new URL(t).hostname;
  } catch {
    // そのまま
  }
  return t.replace(/^www\./, "").replace(/\/.*$/, "");
}

// ─── 登録者 ───

export function getUser(email: string): Promise<VendorUser | null> {
  return getItem<VendorUser>(`user#${normEmail(email)}`);
}

export function saveUser(u: VendorUser): Promise<void> {
  return putItem(`user#${u.email}`, u);
}

export function listUsers(): Promise<VendorUser[]> {
  return scanKind<VendorUser>("user");
}

/** 提供元に登録者を足す。その提供元で最初の有効な登録者なら owner */
export async function addUser(email: string, domain: string, via: VendorUser["via"]): Promise<VendorUser> {
  const users = await listUsers();
  const hasOwner = users.some((u) => u.domain === domain && u.status === "active" && u.role === "owner");
  const u: VendorUser = {
    email: normEmail(email), domain, role: hasOwner ? "member" : "owner",
    status: "active", createdAt: new Date().toISOString(), via,
  };
  await saveUser(u);
  return u;
}

// ─── ログインコード ───

function otpHash(email: string, code: string): string {
  return createHash("sha256").update(`${SECRET}:otp:${email}:${code}`).digest("hex");
}

/** 6桁のコードを作って保存し、平文を返す（メールで送る） */
export async function issueOtp(email: string, purpose: Otp["purpose"], invite?: string): Promise<string> {
  const e = normEmail(email);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Math.floor(Date.now() / 1000) + OTP_MINUTES * 60;
  await putItem(`otp#${e}`, { email: e, hash: otpHash(e, code), exp, attempts: 0, purpose, invite } satisfies Otp, exp + 3600);
  return code;
}

export type OtpResult = { ok: true; purpose: Otp["purpose"]; invite?: string } | { ok: false; error: string };

/** コードを照合する。5回まちがえるか期限切れで無効。通ったら使い捨てで消す */
export async function verifyOtp(email: string, code: string): Promise<OtpResult> {
  const e = normEmail(email);
  const otp = await getItem<Otp>(`otp#${e}`);
  if (!otp || otp.exp < Date.now() / 1000) return { ok: false, error: "コードの有効期限が切れました。もう一度お送りします。" };
  if (otp.attempts >= 5) return { ok: false, error: "入力の回数が上限に達しました。コードを送り直してください。" };
  const a = Buffer.from(otp.hash);
  const b = Buffer.from(otpHash(e, code.replace(/\D/g, "")));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await putItem(`otp#${e}`, { ...otp, attempts: otp.attempts + 1 }, otp.exp + 3600);
    return { ok: false, error: "コードが違います。" };
  }
  await deleteItem(`otp#${e}`);
  return { ok: true, purpose: otp.purpose, invite: otp.invite };
}

// ─── セッション（署名付きクッキー） ───

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(`session:${payload}`).digest("base64url");
}

export function sessionToken(email: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = `${Buffer.from(normEmail(email)).toString("base64url")}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** クッキーの値から有効な登録者を返す。署名・期限・停止のどれかで弾く */
export async function userFromSession(token: string | undefined): Promise<VendorUser | null> {
  if (!token || !accountsConfigured()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [em, exp, sig] = parts;
  const want = Buffer.from(sign(`${em}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const u = await getUser(Buffer.from(em, "base64url").toString());
  return u && u.status === "active" ? u : null;
}

// ─── 招待 ───

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O・1/I は読み違えるので外す

export function normInviteCode(s: string): string {
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return t.length === 8 ? `${t.slice(0, 4)}-${t.slice(4)}` : t;
}

export async function createInvite(domain: string): Promise<Invite> {
  const raw = Array.from({ length: 8 }, () => CODE_CHARS[randomInt(0, CODE_CHARS.length)]).join("");
  const inv: Invite = {
    code: `${raw.slice(0, 4)}-${raw.slice(4)}`,
    domain,
    exp: Math.floor(Date.now() / 1000) + INVITE_DAYS * 86400,
    createdAt: new Date().toISOString(),
    uses: 0,
  };
  await putItem(`invite#${inv.code}`, inv);
  return inv;
}

/** 使える招待なら返す（期限切れ・取り消し済みは null） */
export async function getValidInvite(code: string): Promise<Invite | null> {
  const c = normInviteCode(code);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return null;
  const inv = await getItem<Invite>(`invite#${c}`);
  if (!inv || inv.revoked || inv.exp < Date.now() / 1000) return null;
  return inv;
}

/** 期限内で取り消されていない招待か（運営画面の一覧用） */
export function isLiveInvite(inv: Invite): boolean {
  return !inv.revoked && inv.exp > Date.now() / 1000;
}

export async function markInviteUsed(inv: Invite): Promise<void> {
  await putItem(`invite#${inv.code}`, { ...inv, uses: inv.uses + 1 });
}

export async function revokeInvite(code: string): Promise<void> {
  const inv = await getItem<Invite>(`invite#${normInviteCode(code)}`);
  if (inv) await putItem(`invite#${inv.code}`, { ...inv, revoked: true });
}

export function listInvites(): Promise<Invite[]> {
  return scanKind<Invite>("invite");
}

// ─── 申し込み ───

export function getApplication(email: string): Promise<Application | null> {
  return getItem<Application>(`apply#${normEmail(email)}`);
}

export function saveApplication(a: Application): Promise<void> {
  return putItem(`apply#${a.email}`, a);
}

export function listApplications(): Promise<Application[]> {
  return scanKind<Application>("apply");
}

// ─── 契約 ───

export async function getAccount(domain: string): Promise<Account> {
  return (await getItem<Account>(`account#${domain}`)) ?? { domain };
}

export function saveAccount(a: Account): Promise<void> {
  return putItem(`account#${a.domain}`, a);
}

export function listAccounts(): Promise<Account[]> {
  return scanKind<Account>("account");
}

/** 今日が有料期間内か（paidUntil の日まで有効） */
export function isPaid(a: Account): boolean {
  return Boolean(a.paidUntil && a.paidUntil >= jstDay());
}
