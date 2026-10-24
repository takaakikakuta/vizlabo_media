import type { MetadataRoute } from "next";

/* クローラー制御。事例・タグページはオンデマンド生成（SSR）なので、巡回されるほど
   Amplify のコンピュート費用になる。検索エンジン以外の大量巡回ボット（SEO調査・AI学習）は止める。
   2026-10 の請求で SSR 費用の大半がボット由来だったため追加。止めるボットは必要に応じて増減してよい。 */

const SITE = "https://vizlabo.com";

const BLOCKED_BOTS = [
  // SEO 調査系（サイト全体を高頻度で巡回する）
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot", "DataForSeoBot", "serpstatbot", "Barkrowler",
  // AI 学習データ収集系
  "GPTBot", "ChatGPT-User", "CCBot", "ClaudeBot", "anthropic-ai", "Bytespider", "PetalBot", "Amazonbot",
  "meta-externalagent", "Applebot-Extended", "Google-Extended", "cohere-ai", "Diffbot", "ImagesiftBot", "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 試作ページ・問い合わせフォーム・記事プレビューは誰にも巡回させない
      { userAgent: "*", allow: "/", disallow: ["/proposal", "/contact", "/inquiry", "/preview"] },
      ...BLOCKED_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
