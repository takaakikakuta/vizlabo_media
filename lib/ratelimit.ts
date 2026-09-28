/* メモリ内レート制限。DBなしで動く簡易版。
   - 同一プロセス内でのみ有効（Lambdaのコールドスタートでリセットされる）が、
     「同じ人が連打する」型のいたずらには十分効く。
   - 本格的な分散対策が必要になったら DynamoDB / Upstash / Turnstile に移行する。 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** key の実行回数が windowMs あたり limit 回以内なら true（実行を許可しカウント）。超過なら false。 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // 溜まりすぎ防止の簡易掃除
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** フォーム共通のいたずら対策。問題なければ null、弾く場合は表示用メッセージを返す。 */
export function guardForm(kind: string, ip: string | null, email?: string): string | null {
  // IP単位: 1時間に5回まで（フォーム種別ごと）
  if (ip && !allow(`${kind}:ip:${ip}`, 5, HOUR)) {
    return "短時間に送信が集中しています。しばらく時間をおいてお試しください。";
  }
  // メールアドレス単位: 1日2回まで（第三者アドレスへの連続送信も防ぐ）
  if (email && !allow(`${kind}:mail:${email.toLowerCase()}`, 2, DAY)) {
    return "このメールアドレスには本日すでにお送りしています。明日以降にお試しください。";
  }
  // 全体: 1日あたりの上限（コスト暴走の保険）
  if (!allow(`${kind}:global`, 200, DAY)) {
    return "本日の利用が上限に達しました。お手数ですが明日お試しください。";
  }
  return null;
}
