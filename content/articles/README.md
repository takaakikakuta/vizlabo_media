# 記事の直し方

書き方は型ごとのガイドにある:
- 分かれ道型: [WRITING-wakaremichi.md](WRITING-wakaremichi.md)
- 導入の現場から型: [WRITING-genba.md](WRITING-genba.md)
- 導入前の日本型: [WRITING-dounyumae.md](WRITING-dounyumae.md)
- 課題の攻略地図型: [WRITING-chizu.md](WRITING-chizu.md)
- 業界を越える事例型: [WRITING-ekkyou.md](WRITING-ekkyou.md)
- 導入の舞台裏型: [WRITING-butaiura.md](WRITING-butaiura.md)
- 選（事例10選）型: [WRITING-sen.md](WRITING-sen.md)
- 事例単体（/cases/…）: [WRITING-case.md](WRITING-case.md) — 説明はさらっと（カルテ。自動生成＋手直しの作法）

記事の「書かれた部分」はこのフォルダのJSONにある。文章を直す＝JSONの値を書き換えるだけ。
コード（テンプレート）は触らなくていい。

## どのフィールドが記事のどこか（分かれ道型）

| フィールド | 記事上の場所 |
|---|---|
| `title` | 見出し。**配列の要素1つ＝1行**（改行位置を変えたいときは要素を分け直す） |
| `lead` | 見出し下のリード文 |
| `caseA` / `caseB` の `path` `pathNote` | 対面カルテの「選んだ道」の名前と説明 |
| `caseA` / `caseB` の `decisionLabel` | 「二 分かれた決断」の小見出し |
| `sharedNote` | 「一 同じ悩み」の締めの一文 |
| `readings[]` | 「三 なぜ分かれたか」の読み（title＝小見出し、body＝本文） |
| `verification.intro` / `.outro` | 「四 検算」の前後の文 |
| `questions[]` | 「五 あなたの会社なら」の問いと答え |
| `closing` | 「解体を終えて」の本文 |

`caseA.id` などの事例IDと `pathLists` は計算部分の指定。ここを変えると引用・数字・リストが差し替わる。

## どのフィールドが記事のどこか（導入の現場から型）

| フィールド | 記事上の場所 |
|---|---|
| `title` / `subtitle` / `lead` | 扉。leadは事例群から生まれた「問い」で締める |
| `axisId` | 軸事例のID。カルテ・症状タグ・分布・関連事例はここから計算 |
| `paths[]` | 「一 同じ課題への、いくつかの道」（label＝道の名前、body＝実際に変えた工程の説明、caseIds＝参照事例へのリンク） |
| `pathsNote` | 「一」の締め（任意。併用可能性など、二択に見せないための断り） |
| `axisNote` | 「二 今回注目する会社」の本文（問いに必要な範囲の紹介） |
| `features[]` | 「三 この事例は、どこが特徴的か」の読み（title＝小見出し、body＝根拠つき本文） |
| `fitIntro` / `fitConditions[]` / `fitCaution` | 「四 どんな会社の参考になるか」の導入・条件・限界の断り |
| `checklist[]` | 「五 自社と照らす」の点検項目 |
| `closing` | 「五」末尾の、冒頭の問いへの答え |

「一」末尾の解き方カテゴリの内訳と、「五」の同ベンダー関連事例はテンプレートの自動集計（範囲明示つきの参考情報）。

## どのフィールドが記事のどこか（導入前の日本型）

| フィールド | 記事上の場所 |
|---|---|
| `axisTag` | 対象の困りごとタグ。該当件数・業種数・分布・導線はここから計算 |
| `title` / `lead` | 扉 |
| `sourceNote` | リード直下の枠（素材の性質——公開事例の課題パートである旨） |
| `baselineNote` | 「対象とした事例」の編集メモ（集計基準日・読んだ件数・照合の経緯） |
| `phrases[]`（任意） | 「繰り返される言葉」。表現を含む**事例数**で自動集計（3件未満は非表示） |
| `types[]` | 「悩みの型」。`quotes[]` は原典照合済みの本文（text）＋種別（kind: speech/article/summary）＋出典（caseId） |
| `spreadBody`（任意） | 「業種・規模を越えた記述の重なり」 |
| `exitsIntro` / `exits[]` | 「各社が変えたこと」（label＝変更内容、body＝施策確認済み、caseIds＝関連事例） |
| `closingLines` | 結び（行ごと） |

任意節を省略すると章ごと消え、章番号は自動で詰まる。

## どのフィールドが記事のどこか（課題の攻略地図型）

| フィールド | 記事上の場所 |
|---|---|
| `axisTag` | 対象の困りごとタグ。該当件数・業種数・分布・導線はここから計算 |
| `title` / `lead` | 扉 |
| `scopeNote` | 「一 この悩みの輪郭」（タグの中で対象を絞る断りを含む） |
| `routes[]` | 「二 手の入れ方の地図」（label＝ルート名、body＝変えた場所の説明、caseIds＝代表事例） |
| `routesNote` | 「二」の締め（併用可能・優劣は言えない、の断り） |
| `startPoints[]` | 「三 自社ではどこから調べるか」 |
| `closing` | 結び |

## どのフィールドが記事のどこか（業界を越える事例型）

| フィールド | 記事上の場所 |
|---|---|
| `caseA` / `caseB` | 2つの現場（id＝事例、sceneLabel＝現場の呼び名、sceneNote＝要約。課題文は自動引用） |
| `structureIntro` / `structure[]` | 「二 共通する仕事の構造」の導入と対応表（label＋a/b） |
| `structureNote` | 対応表の締め（別物であることの断り・数字の限界） |
| `borrows[]` | 「三 異業種から借りられる工夫」 |
| `limits[]` | 「四 そのまま持ち込めない条件」 |
| `closing` | 結び |

## どのフィールドが記事のどこか（導入の舞台裏型）

| フィールド | 記事上の場所 |
|---|---|
| `scopeNote` | リード直下の枠（対象と範囲——どの事例群の、どの記述を読んだか） |
| `walls[]` | 「一 導入時にぶつかった壁」（caseIds任意） |
| `approaches[]` | 「二 各社が取った対応」（caseIds＝この対応が読める事例） |
| `conditions[]` / `conditionsNote` | 「三 対応が違った条件」と限界の断り |
| `prep[]` | 「四 自社で準備すること」 |
| `closing` | 結び |

## どのフィールドが記事のどこか（選＝事例10選型）

| フィールド | 記事上の場所 |
|---|---|
| `title` / `lead` | 扉 |
| `criteriaNote` | リード直下の枠（母数・選定基準・順位でないことの明示） |
| `items[]` | 01〜10（caseId＝事例、headline＝見出し、body＝読みどころ2〜3文。カルテ・成果チップ・リンクは自動） |
| `outroTitle` / `outro` | まとめ（並べて見えた共通項＋次の一歩） |
| `relatedSlugs` | 「あわせて読む」への記事slug |

## タイアップ（PR）記事にするとき

genba型は `"sponsored": true` にすると、Sponsoredバッジ・supported by表記・広告ポリシー文が出る。
`false` または未指定なら編集記事扱い（PR表記なし）。

## 反映のしかた

- **開発中**: 保存してブラウザをリロードすれば反映される（`npm run dev` 起動中）
- **本番**: ビルド（デプロイ）で反映

## JSONの注意（3つだけ）

1. 文章は必ず `"..."` の中に。文中で `"` を使いたいときは `\"`（かぎ括弧「」はそのまま書ける）
2. 文中に改行は入れられない。段落を分けたい長文は今の型では1段落（必要なら相談）
3. 最後の要素の後ろにカンマを付けない（`"closing": "...",}` はエラー）

VSCodeで開けば文法ミスは赤線で出る。壊れたまま保存してもビルドがエラーで止まるだけで、公開中のサイトは壊れない。

## 新しい記事を足すとき

このフォルダにJSONを1つ置けば `/articles/（slug）` が生え、一覧にも自動で載る。
`slug` はUUID（`python -c "import uuid; print(uuid.uuid4())"` で生成）。ファイル名も同じUUIDにする。
`no`（連番）だけ重複しないように。
