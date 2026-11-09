import raw from "../data/vendors.json";
import { isIntroSource } from "./introSources";

/* ベンダーのロゴURL（fetch_logos.py が取得・実在確認済みのものだけ）。
   事例に og:image が無いときの穴埋めに使う。 */
const LOGOS = raw as Record<string, string>;

export function vendorLogo(domain?: string): string | undefined {
  if (!domain || isIntroSource(domain)) return undefined;  // 紹介元のロゴは提供元に見えるので出さない
  return LOGOS[domain];
}
