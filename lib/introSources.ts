import raw from "../data/intro_sources.json";

/* 紹介元（提供元ではない掲載元）。自治体・協議会・メディアなど、他社の製品を使った事例を紹介しているサイト。
   事例は残すが、提供元としては扱わない（製品名に掲載元を添えない・提供元ロゴを出さない・
   記事末尾のサービス紹介と一括問い合わせに出さない）。掲載元は「〇〇の事例紹介ページ」と出典として出す。 */
const SOURCES = new Map(raw.sources.map((s) => [s.domain, s]));

export function isIntroSource(domain?: string): boolean {
  return !!domain && SOURCES.has(domain);
}

/** 紹介元の名前（例: 愛媛県医療DX推進協議会）。紹介元でなければ undefined */
export function introSourceName(domain?: string): string | undefined {
  return domain ? SOURCES.get(domain)?.name : undefined;
}
