---
name: newsletter
description: メルマガ「週刊 事例マニア」（土曜配信・Benchmark に HTML を貼り付け）の号を作る。ユーザーが貼った今週の SNS ポスト（月〜金の事例セレクション、この事例がスゴイ、事例コラム）から newsletter/YYYY-MM-DD.json を埋め、build.mjs で HTML を書き出し、スマホ幅で確認してコミットする。引数は号の日付（省略時は次の土曜日）。
---

# メルマガ「週刊 事例マニア」を作る

`/newsletter [YYYY-MM-DD]`。作業ディレクトリは `vizlabo_media`。日付を省いたら次の土曜日。

## 1号の中身

| 枠 | 出どころ |
|---|---|
| 01 今週の事例セレクション（5本） | 自動：公開中の選記事の新しい順に5本。一言は JSON の `selectionNotes` |
| 02 この事例がスゴイ | 手書き：note の URL。タイトル・画像は OGP から自動、`desc` は手書き |
| 03 事例コラム | 同上 |
| 04 今週の記念日ポスト | 自動：配信日の6日前〜配信日の `content/days/*.json` |
| お知らせ枠 | AI事例サジェスト（文言は雛形のまま） |
| 編集後記 | 任意 |

「今週の内容」行・「今週の数字」枠・記念日のサムネイルは、ユーザーの判断で外した。戻さない。

## ユーザーが貼ってくるもの

月〜金の `【事例セレクション#NNN】` ポスト（本文＋記事URL）、`【この事例がスゴイ！ #NNN】` の投稿案（パターン1〜3＋共通リプに note URL）、事例コラムの投稿案（②〜④＋共通リプに note URL）。

## 手順

1. `git pull --ff-only origin main`
2. `node scripts/newsletter/build.mjs <日付>` を一度実行し、JSON の雛形と自動選択の5本（番号）を確認する
   - 自動の5本と、貼られたポストの番号がずれていたらユーザーに伝える（予約公開日を確認）
3. `newsletter/<日付>.json` を埋める
   - `selectionNotes`：記事番号（"16" など文字列）→ ポストを2〜4行に縮めたもの。改行はそのまま出る
     - 1行目にポストの決め台詞、2行目以降に数字（「A → B」）か「道は3つ」型の要点
     - 「▼記事はこちら」「続きはリプ欄に」など SNS 向けの言い回しは入れない
     - 数字・社名はポストにあるものだけ。足さない
   - `sugoi` / `column`：`url` は共通リプの note URL。`desc` は投稿案から 2〜3文（〜しました／〜を読み解きます、のです・ます調）。`title`・`image` は空でよい（OGP から自動）
   - `subject`：**事例セレクションを押す**（スゴイ・コラムはマーケ担当向けなので件名にしない）。送信者名が「週刊 事例マニア」なので件名でメルマガ名は繰り返さない。全角30字前後
     - 型の例：5本のテーマを並べる（`脱炭素／社内IT不在／在宅勤務／下請け脱却／古いシステムの事例`）
   - `preheader`：件名と役割を分ける（件名がテーマ並びなら、こちらは読む理由）
   - `intro` / `afterword`：ユーザーの指示があれば。無ければ intro は雛形のまま
4. もう一度 `node scripts/newsletter/build.mjs <日付>`。出力の「件名」「プレヘッダー」「一言なし」「未入力」を確認
5. スマホ幅で見た目を確認する（Edge ヘッドレスは幅500px未満にできないので、375px の iframe に入れて撮る）
   ```bash
   SP=<scratchpad>; echo "<html><body style='margin:0'><iframe src='file:///$(cygpath -m "$PWD")/newsletter/<日付>.html' style='width:375px;height:3000px;border:0'></iframe></body></html>" > "$SP/wrap.html"
   "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=600,3000 --screenshot="$SP/nl.png" "file:///$SP/wrap.html"
   ```
6. `newsletter/<日付>.json` と `.html` をコミットして main に push
7. ユーザーへの報告：件名（＋代案1〜2）、プレヘッダー、書いた一言の要旨、未入力の枠。最後に「`newsletter/<日付>.html` を Benchmark に貼り付け → テスト送信をスマホで確認」

## 注意

- JSON を手で上書きされることがある。壊れたら `git show HEAD:newsletter/<日付>.json` から戻す
- リンクの UTM は build.mjs が付ける（utm_source=newsletter, utm_campaign=<日付>, utm_content=<枠>）。手で付けない
- 画像は外部（vizlabo.com / note）から読むので、記事サムネイルが本番にデプロイ済みか確認する
