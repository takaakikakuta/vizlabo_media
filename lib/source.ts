/* 掲載元（出典）の元記事へのリンク。 */

/** クエリ文字列が付くと本文が空のページを返すサイト。ここには UTM を付けない */
const NO_UTM_HOSTS = new Set(["mediadrive.jp"]);

/** 出典URLに UTM を付ける。掲載元の解析で「事例マニアのどこから来たか」が分かるようにする。
    既にクエリやハッシュがあっても壊さないよう URL オブジェクトで組む。 */
export function withUtm(url: string, campaign: string, content: string): string {
  try {
    const u = new URL(url);
    if (NO_UTM_HOSTS.has(u.hostname.replace(/^www\./, ""))) return url;
    u.searchParams.set("utm_source", "jirei-mania");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", campaign);
    u.searchParams.set("utm_content", content);
    return u.toString();
  } catch {
    return url;
  }
}
