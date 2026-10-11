#!/usr/bin/env python3
"""make_chapter_video.py を埋め込んだ Colab ノートブックを生成する。

    python3 tools/chapter_video/build_notebook.py
→ tools/chapter_video/vizlabo_chapter_video_create.ipynb

スクリプトを直したら、これを実行してノートブックを作り直す。
"""
import base64
import json
import os

here = os.path.dirname(os.path.abspath(__file__))
script = open(os.path.join(here, "make_chapter_video.py"), encoding="utf-8").read()
b64 = base64.b64encode(script.encode("utf-8")).decode("ascii")

cells = []


def code(src, **meta):
    cells.append({"cell_type": "code", "execution_count": None, "metadata": meta, "outputs": [], "source": src})


def md(src):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": src})


md("""# 事例セレクション チャプター動画をつくる

`vizlabo_shorvideo_create.ipynb` で作ったナレーション（`vizlabo_chapter/NNN/…wav`）と、
同じフォルダに置いた画像（`vizlabo_chapter_NN_K.png`）から、チャプターごとの mp4 を書き出す。

1. 上から順にセルを実行する（最初のセルで Drive のマウント許可が出る）
2. 2つ目のセルで選集番号・字幕の台本（TTS に渡した JSON）を入れる
3. 書き出した mp4 は `マイドライブ/vizlabo_chapter/NNN/video/` に入る

元のスクリプトは GitHub の `tools/chapter_video/make_chapter_video.py`。このノートブックは `build_notebook.py` で生成している。""")

code("""!apt-get -qq install -y fonts-noto-cjk ffmpeg > /dev/null 2>&1
import base64, json, os, subprocess, sys
from google.colab import drive
from IPython.display import Video, display

drive.mount('/content/drive')
DRIVE_ROOT = '/content/drive/MyDrive'
SCRIPT_B64 = '""" + b64 + """'
open('/content/make_chapter_video.py', 'wb').write(base64.b64decode(SCRIPT_B64))
print('準備OK')""")

code("""SELECTION = '002'      # 選集の番号（vizlabo_chapter/ の下のフォルダ名）
CHAPTERS  = []         # 作るチャプター。空なら全部。例: [3, 4]
CONCAT    = True       # 全チャプターを1本につないだ mp4 も出す
CAPTIONS  = True       # 字幕（下の PAYLOAD の parts）を焼き込む

# TTS のノートブックに貼ったものと同じ JSON をそのまま貼る（複数チャプターぶんまとめてでもよい）。
# 字幕が要らなければ空のままでよい。
PAYLOAD = r'''
'''""")

code("""base = os.path.join(DRIVE_ROOT, 'vizlabo_chapter', str(SELECTION).zfill(3))
assert os.path.isdir(base), f'フォルダがありません: {base}'
cmd = [sys.executable, '/content/make_chapter_video.py', base]
if CHAPTERS:
    cmd += ['--chapter', *map(str, CHAPTERS)]
if CONCAT:
    cmd.append('--concat')
if CAPTIONS and PAYLOAD.strip():
    open('/content/payload.json', 'w', encoding='utf-8').write(PAYLOAD)
    cmd += ['--payload', '/content/payload.json']
print(' '.join(cmd))
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stdout)
if r.returncode != 0:
    print(r.stderr)
    raise SystemExit('失敗しました（上のエラーを確認）')

out_dir = os.path.join(base, 'video')
made = sorted(f for f in os.listdir(out_dir) if f.endswith('.mp4'))
print('✅ 書き出し先: マイドライブ/vizlabo_chapter/%s/video/' % str(SELECTION).zfill(3))
for f in made:
    print('   ', f)
if made:
    display(Video(os.path.join(out_dir, made[0]), embed=False, width=640))""")

nb = {
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
        "colab": {"provenance": [], "name": "vizlabo_chapter_video_create.ipynb"},
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "language_info": {"name": "python"},
    },
    "cells": cells,
}
out = os.path.join(here, "vizlabo_chapter_video_create.ipynb")
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)
print("wrote", out)
