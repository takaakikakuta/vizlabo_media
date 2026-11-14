import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* AmplifyコンソールのENVはビルドにしか届かない（SSR実行時の process.env は空）。
     サーバー専用の値はここでビルド時に焼き込む。値を変えたら再ビルドが必要。 */
  env: {
    BLASTENGINE_LOGIN_ID: process.env.BLASTENGINE_LOGIN_ID ?? "",
    BLASTENGINE_API_KEY: process.env.BLASTENGINE_API_KEY ?? "",
    CONTACT_TO: process.env.CONTACT_TO ?? "",
    MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL ?? "",
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    RESEND_FROM: process.env.RESEND_FROM ?? "",
    // URLサジェスト機能（Bedrock）用。AWS_*は予約名のためAPP_プレフィックスで渡す
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ?? "",
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ?? "",
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID ?? "",
    // 事例の閲覧数（lib/views.ts）。テーブル名は amplify/backend.ts と同じ規則（ブランチごと）
    VIEWS_TABLE: process.env.VIEWS_TABLE || (process.env.AWS_BRANCH ? `jirei-mania-views-${process.env.AWS_BRANCH}` : ""),
    // 流入元（UTM つきの来訪。lib/sources.ts）。テーブル名は amplify/backend.ts と同じ規則
    SOURCES_TABLE: process.env.SOURCES_TABLE || (process.env.AWS_BRANCH ? `jirei-mania-sources-${process.env.AWS_BRANCH}` : ""),
    // ベンダー会員（lib/accounts.ts）。テーブル名は amplify/backend.ts と同じ規則。
    // VENDOR_SECRET はログインコードのハッシュとログイン状態の署名に使う（長いランダム文字列。変えると全員ログアウト）
    ACCOUNTS_TABLE: process.env.ACCOUNTS_TABLE || (process.env.AWS_BRANCH ? `jirei-mania-accounts-${process.env.AWS_BRANCH}` : ""),
    VENDOR_SECRET: process.env.VENDOR_SECRET ?? "",
    // 事例プランナーのプラン保存（lib/plannerStore.ts）。テーブル名は amplify/backend.ts と同じ規則
    PLANS_TABLE: process.env.PLANS_TABLE || (process.env.AWS_BRANCH ? `jirei-mania-plans-${process.env.AWS_BRANCH}` : ""),
    // 掲載通知（scripts/vendors/notify.mjs）が招待の発行・会員への通知に使う API のトークン（app/api/vendor-notify）
    NOTIFY_API_TOKEN: process.env.NOTIFY_API_TOKEN ?? "",
    // 運営用ページ（/admin/*）のログインパスワード（lib/admin.ts）
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
  },
};

export default nextConfig;
