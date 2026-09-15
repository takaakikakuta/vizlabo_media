import raw from "../data/vendors.json";

/* ベンダーのロゴURL（fetch_logos.py が取得・実在確認済みのものだけ）。
   事例に og:image が無いときの穴埋めに使う。 */
const LOGOS = raw as Record<string, string>;

export function vendorLogo(domain?: string): string | undefined {
  return domain ? LOGOS[domain] : undefined;
}
