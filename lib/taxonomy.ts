/* 事例を横断検索・比較するための統制タクソノミー（全業種）。
   ・課題(challenges)＝業種をまたぐ“困りごと”の型。検索の主役・SEOの入口。
   ・業種(industries)／製品カテゴリ(productCategories)＝もう2軸の切り口。
   slug はURL（/challenge/[slug] 等）に使う。label は表示名。 */

export type Term = { slug: string; label: string; desc?: string };

/* 課題カテゴリ（業種横断の“困りごと”）。事例は複数該当しうる。 */
export const CHALLENGES: Term[] = [
  { slug: "cost", label: "コスト削減", desc: "経費・原価・調達コストを下げたい" },
  { slug: "labor", label: "人手不足・省人化", desc: "人が足りない・自動化したい" },
  { slug: "efficiency", label: "業務効率・工数削減", desc: "手作業や無駄な工程を減らしたい" },
  { slug: "quality", label: "品質・不良", desc: "不良・ミス・バラつきを減らしたい" },
  { slug: "leadtime", label: "納期・リードタイム", desc: "納期短縮・スピードを上げたい" },
  { slug: "standardize", label: "属人化・標準化", desc: "特定の人に依存する業務をなくしたい" },
  { slug: "data", label: "データ活用・可視化", desc: "散在データを集めて見える化したい" },
  { slug: "sales", label: "売上・リード獲得", desc: "受注・問い合わせ・商談を増やしたい" },
  { slug: "cs", label: "顧客対応・CS", desc: "問い合わせ対応・顧客満足を改善したい" },
  { slug: "hr", label: "採用・育成", desc: "採用難・教育・定着を改善したい" },
  { slug: "security", label: "セキュリティ・コンプラ", desc: "情報漏洩・法対応のリスクを下げたい" },
  { slug: "sustainability", label: "環境・サステナ", desc: "省エネ・脱炭素・環境負荷を下げたい" },
];

/* 業種 */
export const INDUSTRIES: Term[] = [
  { slug: "manufacturing", label: "製造業" },
  { slug: "it", label: "IT・ソフトウェア" },
  { slug: "construction", label: "建設・不動産" },
  { slug: "logistics", label: "物流・運輸" },
  { slug: "medical", label: "医療・介護" },
  { slug: "finance", label: "金融・保険" },
  { slug: "retail", label: "小売・EC" },
  { slug: "food", label: "飲食・食品" },
  { slug: "education", label: "教育" },
  { slug: "hr-service", label: "人材サービス" },
  { slug: "public", label: "自治体・公共" },
  { slug: "energy", label: "エネルギー・環境" },
  { slug: "other-industry", label: "その他" },
];

/* 製品・サービスのカテゴリ（“何で解決したか”） */
export const PRODUCT_CATEGORIES: Term[] = [
  { slug: "saas", label: "業務SaaS" },
  { slug: "core-system", label: "基幹・業務システム" },
  { slug: "rpa", label: "RPA・業務自動化" },
  { slug: "ai", label: "AI・データ分析" },
  { slug: "cloud", label: "クラウド・インフラ" },
  { slug: "security", label: "セキュリティ" },
  { slug: "martech", label: "マーケティング" },
  { slug: "crm", label: "CRM・SFA" },
  { slug: "hrtech", label: "人事・労務" },
  { slug: "accounting", label: "会計・経理" },
  { slug: "iot", label: "IoT・センサー" },
  { slug: "robot", label: "ロボット・FA" },
  { slug: "consulting", label: "コンサル・支援" },
  { slug: "dev", label: "受託開発・制作" },
  { slug: "other-product", label: "その他" },
];

/* slug→label の逆引き（表示用） */
const toMap = (terms: Term[]) => Object.fromEntries(terms.map((t) => [t.slug, t]));
export const CHALLENGE_MAP = toMap(CHALLENGES);
export const INDUSTRY_MAP = toMap(INDUSTRIES);
export const PRODUCT_MAP = toMap(PRODUCT_CATEGORIES);

export const challengeLabel = (slug: string) => CHALLENGE_MAP[slug]?.label ?? slug;
export const industryLabel = (slug: string) => INDUSTRY_MAP[slug]?.label ?? slug;
export const productLabel = (slug: string) => PRODUCT_MAP[slug]?.label ?? slug;
