import { defineBackend } from "@aws-amplify/backend";
import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";

/* Amplify Gen2 バックエンド定義。
   いまあるリソースは、課題別計測（lib/analytics.ts）が書き込む DynamoDB テーブル1つだけ。
   フォーム送信は lib/notify.ts（メール）、事例データは data/*.json のまま。

   テーブル名は「vizlabo-media-analytics-<ブランチ名>」に固定する。
   ・Next.js の SSR ランタイムは amplify_outputs.json を読まないので、next.config.ts が
     同じ規則で ANALYTICS_TABLE を組み立ててビルド時に焼き込む（両者を揃えること）。
   ・IAM ポリシーを「table/vizlabo-media-analytics-*」で書けるようにするため。
   ・RETAIN なのでスタックを消してもデータは残る。残ったテーブルと同名で再作成すると
     衝突するので、その場合はコンソールで先に消すか名前を変える。

   書き込みは SSR ランタイムが APP_AWS_*（Bedrock と同じ IAM ユーザー）で行う。
   そのユーザーに dynamodb:PutItem / UpdateItem / Query を上記テーブルに許可すること。
   詳細: README.md「課題別の計測」 */

const backend = defineBackend({});

const branch = process.env.AWS_BRANCH || "sandbox";
const stack = backend.createStack("analytics");

new Table(stack, "AnalyticsTable", {
  tableName: `vizlabo-media-analytics-${branch}`,
  partitionKey: { name: "pk", type: AttributeType.STRING },
  sortKey: { name: "sk", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
});
