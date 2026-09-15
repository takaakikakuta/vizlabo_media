/* 解決事例（導入事例）1件の構造化データ。各社サイトの公開事例から
   〈課題 → 施策 → 成果(数字) → 業種・規模〉を抽出してこの形に落とす。
   本文は転載せず、要約＋出典リンク(sourceUrl)で扱う。 */

export type CaseResult = {
  metric: string; // 指標（例: 検査工数 / 商談化率 / 残業時間）
  value: string;  // 数値＋単位（例: 60%削減 / 1.8倍 / 月20時間→2時間）
};

export type CaseStudy = {
  id: string;          // URL用スラッグ（一意）
  title: string;       // 事例の一言要約（見出し）
  summary: string;     // 2〜3文の要約（カード/検索用）

  vendor: string;      // 解決した側＝掲載ベンダー名
  product: string;     // 製品・サービス名
  productCategory: string; // PRODUCT_CATEGORIES の slug
  sourceUrl: string;   // 出典（掲載元事例ページ）
  collectedAt: string; // 収集日 ISO

  customer: {
    name?: string;     // 導入企業名（公開されていれば）
    industry: string;  // INDUSTRIES の slug
    size?: string;     // 規模帯（例: 従業員100〜300名 / 中小 / 大企業）
    dept?: string;     // 導入部門（例: 生産技術 / 情報システム）
  };

  challenges: string[];   // CHALLENGES の slug（複数可）
  challengeDetail: string; // 課題の具体（自由記述の要約）
  background?: string;     // 導入前の状況・きっかけ

  actions: string;         // やったこと（施策の要約）
  alternatives?: string;   // 他に検討した選択肢（あれば）

  results: CaseResult[];     // 定量成果（数字が命）＝導入で「改善・達成された」もの限定
  scale?: CaseResult[];      // 導入規模・前提（設置台数/拠点数/対象人数など）。成果ではないので別枠
  resultsQualitative?: string; // 定性成果
  period?: string;           // 効果が出るまで/導入期間

  hasNumbers: boolean; // 定量成果あり＝信頼度高（並び順・バッジに使う）
  sample?: boolean;    // サンプル(仮)データの目印。実データ投入時は付けない
  tags?: string[];     // 補助タグ（自由）
  image?: string;      // 出典ページの og:image（あれば実画像・無ければ生成カバー）
};
