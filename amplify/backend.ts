import { defineBackend } from "@aws-amplify/backend";

/* Amplify Gen2 バックエンド定義。
   いまはリソースなし（フォーム送信は lib/notify.ts のスタブ、データは data/*.json）。
   DBが必要になったら:
     1. amplify/data/resource.ts に defineData でスキーマを書く
     2. ここで defineBackend({ data }) に加える
     3. フロントは aws-amplify を入れて amplify_outputs.json を読み込む
   詳細: https://docs.amplify.aws/nextjs/build-a-backend/data/ */
defineBackend({});
