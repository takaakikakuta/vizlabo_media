# 事例セレクション チャプター動画

Google Drive の `vizlabo_chapter/NNN/` にある素材（ナレーションWAV＋画像PNG）から、チャプターごとの mp4 を組み立てる。

## 素材の置き方

`vizlabo_shorvideo_create.ipynb`（TTS）が作る構成そのまま。画像は Claude のプロジェクトで作ったものをチャプター番号のフォルダに入れる。

```
マイドライブ/vizlabo_chapter/002/
  1/ vizlabo_chapter_01.wav  vizlabo_chapter_01_1.png … vizlabo_chapter_01_4.png
  2/ vizlabo_chapter_02.wav  vizlabo_chapter_02_1.png …
  3/ vizlabo_chapter_03_1.png …      ← WAVは親フォルダ（002/直下）にあってもよい
  4/ vizlabo_chapter_04_1.png …
  vizlabo_chapter_03.wav
  vizlabo_chapter_04.wav
```

- WAV は「5パートを1.6秒の無音でつないだ1本」。この無音を検出してパートに切り、パートごとに画像を切り替える。
- 画像4枚＋パート5本なら、冒頭の導入パートは1枚目に重ねる（1枚目が導入＋状況、2〜4枚目が課題・打ち手・結果）。
- 画像の枚数がそれ以外でも、パート数に合わせて均等に割り当てる。
- 書き出しは 1920×1080 / 30fps / H.264 + AAC。画像はゆっくりズーム、切り替えは0.6秒のクロスフェード。冒頭0.6秒・末尾1.2秒の間を入れる。
- `--payload` に TTS へ渡した JSON（`parts`）を渡すと、パートの文を字幕として焼き込む。
- `--concat` で全チャプターを1本につないだ `vizlabo_chapter_002_all.mp4` も出す。
- 出力先 `video/` に `*_timeline.json`（各パートの開始・終了秒と使った画像）も書く。

## Colab で動かす（Drive に素材があるならこれ）

1. `vizlabo_chapter_video_create.ipynb` を Colab で開く（GitHub から開くか、ファイルをアップロード）
2. 1つ目のセルを実行して Drive をマウント
3. 2つ目のセルで `SELECTION`、必要なら `CHAPTERS` と `PAYLOAD`（TTS のノートブックに貼ったのと同じ JSON）を入れる
4. 3つ目のセルを実行。`マイドライブ/vizlabo_chapter/002/video/` に mp4 ができる

## 手元の PC で動かす

```bash
# 必要: ffmpeg, Python 3.9+, numpy, Pillow（字幕を付けるとき）
pip install numpy pillow
python3 tools/chapter_video/make_chapter_video.py ~/Downloads/vizlabo_chapter/002 --concat
python3 tools/chapter_video/make_chapter_video.py ~/Downloads/vizlabo_chapter/002 --chapter 4 --payload payload.json
```

`payload.json` は TTS のノートブックの `PAYLOAD = r'''…'''` のセルをそのまま貼ったファイルでもよい。

主なオプション: `--out 出力先` `--size 1920x1080` `--fps 30` `--zoom 0`（ズームなし） `--fade 0.6` `--font フォントのパス` `--no-captions`

## スクリプトを直したら

ノートブックにはスクリプトが埋め込んであるので、作り直す。

```bash
python3 tools/chapter_video/build_notebook.py
```
