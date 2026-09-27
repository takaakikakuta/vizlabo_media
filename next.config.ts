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
    // URLサジェスト機能（Bedrock）用。AWS_*は予約名のためAPP_プレフィックスで渡す
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ?? "",
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ?? "",
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID ?? "",
  },
};

export default nextConfig;
