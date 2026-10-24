import type { MetadataRoute } from "next";
import { allCases, navigableTags } from "../lib/cases";
import { allArticles } from "../lib/articles";
import { allDays } from "../lib/days";
import { CHALLENGES, INDUSTRIES, PRODUCT_CATEGORIES } from "../lib/taxonomy";

/* サイトマップ。検索エンジンに巡回先を渡して、無駄な巡回（存在しないURLの探索）を減らす。
   事例は hidden と禁止ベンダーを lib/cases.ts が除いた公開分だけ、記事は hidden・draft を除いた公開分だけ。
   URL 総数は約1万（50,000 件の上限内なので1ファイル）。デプロイ時に1回生成される。 */

const SITE = "https://vizlabo.com";

/* 予約公開の記事を公開日に載せるため、1時間ごとに作り直す */
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/cases`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/challenges`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/industries`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/finder`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/newsletter`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/produce`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
  ];

  const articles: MetadataRoute.Sitemap = allArticles().map((a) => ({
    url: `${SITE}/articles/${a.slug}`,
    lastModified: new Date(a.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const days: MetadataRoute.Sitemap = allDays().map((d) => ({
    url: `${SITE}/days/${d.date}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));
  if (days.length) fixed.push({ url: `${SITE}/days`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });

  const taxonomy: MetadataRoute.Sitemap = [
    ...CHALLENGES.map((t) => `${SITE}/challenge/${t.slug}`),
    ...INDUSTRIES.map((t) => `${SITE}/industry/${t.slug}`),
    ...PRODUCT_CATEGORIES.map((t) => `${SITE}/product/${t.slug}`),
  ].map((url) => ({ url, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 }));

  const tags: MetadataRoute.Sitemap = navigableTags().map((t) => ({
    url: `${SITE}/tag/${encodeURIComponent(t)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const cases: MetadataRoute.Sitemap = allCases().map((c) => ({
    url: `${SITE}/cases/${c.id}`,
    lastModified: c.collectedAt ? new Date(c.collectedAt) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...fixed, ...articles, ...days, ...taxonomy, ...tags, ...cases];
}
