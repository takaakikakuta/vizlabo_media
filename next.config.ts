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
  },
};

export default nextConfig;
