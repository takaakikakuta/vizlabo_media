import { defineBackend } from "@aws-amplify/backend";
import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { ManagedPolicy, PolicyStatement, User } from "aws-cdk-lib/aws-iam";

/* Amplify Gen2 バックエンド定義。
   フォーム送信は lib/notify.ts（メール）、事例データは data/*.json のまま。
   DB は事例ページの閲覧数（lib/views.ts）だけ。 */
const backend = defineBackend({});

/* 事例ページの閲覧数（日別 × 事例）。
   - PK day = JST の日付 "YYYY-MM-DD"、SK caseId、属性 views(数値) / vendor(掲載ベンダー名)
   - 管理画面（/admin/views）は日付ごとに Query して集計する
   - テーブル名はブランチごとに固定（next.config.ts が同じ規則で VIEWS_TABLE を焼き込む）
   - SSR からは Bedrock と同じ IAM ユーザー（APP_AWS_*）で読み書きする。
     そのユーザーに下の管理ポリシーをアタッチすること（VIEWS_IAM_USER を設定すれば自動でアタッチ）
   - 計測データなので、スタックを消してもテーブルは残す */
const branch = process.env.AWS_BRANCH || "sandbox";
const stack = backend.createStack("caseViews");

const table = new Table(stack, "CaseViews", {
  tableName: `jirei-mania-views-${branch}`,
  partitionKey: { name: "day", type: AttributeType.STRING },
  sortKey: { name: "caseId", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.RETAIN,
});

/* ベンダー会員（lib/accounts.ts）。登録者・ログインコード・招待・申し込み・契約を pk 1本で持つ。
   ログインコードは ttl で自動削除。会員情報なのでスタックを消しても残す */
const accounts = new Table(stack, "VendorAccounts", {
  tableName: `jirei-mania-accounts-${branch}`,
  partitionKey: { name: "pk", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: "ttl",
  removalPolicy: RemovalPolicy.RETAIN,
});

const policy = new ManagedPolicy(stack, "CaseViewsAccess", {
  managedPolicyName: `jirei-mania-views-${branch}-rw`,
  // 説明文は変えない（IAM の管理ポリシーは説明を変えると作り直しになり、固定名のため失敗する）。会員テーブルの権限もここに足している
  description: "事例マニアの閲覧数テーブルの読み書き（SSR 用 IAM ユーザーにアタッチする）",
  statements: [
    new PolicyStatement({
      actions: ["dynamodb:UpdateItem", "dynamodb:Query"],
      resources: [table.tableArn],
    }),
    new PolicyStatement({
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Scan"],
      resources: [accounts.tableArn],
    }),
  ],
});

const iamUser = process.env.VIEWS_IAM_USER;
if (iamUser) policy.attachToUser(User.fromUserName(stack, "SsrUser", iamUser));

new CfnOutput(stack, "CaseViewsTableName", { value: table.tableName });
new CfnOutput(stack, "VendorAccountsTableName", { value: accounts.tableName });
new CfnOutput(stack, "CaseViewsPolicyArn", { value: policy.managedPolicyArn });
