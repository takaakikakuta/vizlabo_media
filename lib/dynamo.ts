import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/* DynamoDB のクライアント（閲覧数 lib/views.ts と会員 lib/accounts.ts で共用）。
   SSR からは Bedrock と同じ IAM ユーザー（APP_AWS_*、next.config.ts で焼き込み）で接続する。
   VIEWS_DYNAMODB_ENDPOINT はローカル開発で DynamoDB Local などに向けるとき用（本番では未設定）。 */

let client: DynamoDBClient | null = null;

export function dynamo(): DynamoDBClient {
  if (!client) {
    const id = process.env.APP_AWS_ACCESS_KEY_ID;
    const secret = process.env.APP_AWS_SECRET_ACCESS_KEY;
    client = new DynamoDBClient({
      region: "ap-northeast-1",
      ...(process.env.VIEWS_DYNAMODB_ENDPOINT ? { endpoint: process.env.VIEWS_DYNAMODB_ENDPOINT } : {}),
      ...(id && secret ? { credentials: { accessKeyId: id, secretAccessKey: secret } } : {}),
    });
  }
  return client;
}

export function awsKeysConfigured(): boolean {
  return Boolean(process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY);
}
