#!/usr/bin/env python3
"""事例セレクションのチャプター動画を、ナレーションWAVと画像PNGから組み立てる。

素材の置き方（Colabノートブック vizlabo_shorvideo_create.ipynb が作る構成に合わせる）:

    vizlabo_chapter/002/
      1/ vizlabo_chapter_01.wav  vizlabo_chapter_01_1.png … vizlabo_chapter_01_4.png
      2/ vizlabo_chapter_02.wav  vizlabo_chapter_02_1.png …
      3/ vizlabo_chapter_03_1.png …          ← WAVは親フォルダにあってもよい
      4/ …
      vizlabo_chapter_03.wav
      vizlabo_chapter_04.wav

WAVは「パート（5本）を1.6秒の無音でつないだ1本」。この無音を検出してパートを切り分け、
パートごとに画像を切り替える。画像が4枚でパートが5本なら、冒頭の1本（導入）は1枚目に重ねる。

使い方:
    python3 make_chapter_video.py vizlabo_chapter/002                 # 全チャプター
    python3 make_chapter_video.py vizlabo_chapter/002 --chapter 4     # 4だけ
    python3 make_chapter_video.py vizlabo_chapter/002 --payload tts.json --concat
        # TTSに渡したJSON（parts）を字幕として焼き込み、全チャプターを1本につなぐ

必要なもの: ffmpeg、Python 3.9+、numpy、Pillow（字幕を焼くとき）。
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave

import numpy as np

# ---------------------------------------------------------------- 設定の既定値
DEFAULTS = dict(
    width=1920,
    height=1080,
    fps=30,
    lead_in=0.6,      # 冒頭、ナレーションが始まるまでの間（秒）
    tail=1.2,         # 最後のナレーションが終わってから動画が終わるまでの間（秒）
    fade=0.6,         # 画像の切り替え（クロスフェード）の長さ（秒）
    switch_early=0.35,  # パートの開始より何秒早く画像を切り替えるか（無音の中で切る）
    min_gap=1.1,      # これ以上の無音をパートの区切りとみなす（秒）。TTSの無音は1.6秒
    zoom=0.06,        # ケン・バーンズ（ゆっくりズーム）の量。0で無効
    bg_color="0b0f14",
    caption_font_size=40,
    caption_max_width=1560,
    caption_bottom=72,
)

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf",
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc",
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/YuGothM.ttc",
]


def log(msg: str) -> None:
    print(msg, flush=True)


# ---------------------------------------------------------------- 素材を探す
def find_chapters(root: str, only: list[int] | None) -> list[dict]:
    """root（選集フォルダ or チャプターフォルダ）からチャプターごとの素材を集める。"""
    root = os.path.abspath(root)
    wavs: dict[int, str] = {}
    pngs: dict[int, list[tuple[int, str]]] = {}
    pat_wav = re.compile(r"vizlabo_chapter_(\d+)\.wav$")
    pat_png = re.compile(r"vizlabo_chapter_(\d+)_(\d+)\.png$")
    for path in glob.glob(os.path.join(root, "**", "*"), recursive=True) + glob.glob(os.path.join(root, "*")):
        name = os.path.basename(path)
        m = pat_wav.match(name)
        if m:
            wavs.setdefault(int(m.group(1)), path)
            continue
        m = pat_png.match(name)
        if m:
            lst = pngs.setdefault(int(m.group(1)), [])
            if path not in [p for _, p in lst]:
                lst.append((int(m.group(2)), path))
    chapters = []
    for idx in sorted(set(wavs) | set(pngs)):
        if only and idx not in only:
            continue
        imgs = [p for _, p in sorted(pngs.get(idx, []))]
        if idx not in wavs:
            log(f"  ! チャプター{idx:02d}: WAVが見つからないので飛ばす")
            continue
        if not imgs:
            log(f"  ! チャプター{idx:02d}: PNGが見つからないので飛ばす")
            continue
        chapters.append(dict(index=idx, wav=wavs[idx], images=imgs))
    return chapters


# ---------------------------------------------------------------- 音声をパートに切る
def read_wav_mono(path: str) -> tuple[np.ndarray, int]:
    with wave.open(path, "rb") as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw == 2:
        data = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    elif sw == 4:
        data = np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    elif sw == 1:
        data = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    else:
        raise ValueError(f"対応していないサンプル幅: {sw} bytes")
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1)
    return data, sr


def split_segments(wav: str, min_gap: float, frame_ms: float = 10.0) -> tuple[list[tuple[float, float]], float]:
    """無音（min_gap秒以上）で区切ったパートの (開始, 終了) 秒と、音声全体の長さを返す。"""
    data, sr = read_wav_mono(wav)
    total = len(data) / sr
    hop = max(1, int(sr * frame_ms / 1000))
    n_frames = len(data) // hop
    if n_frames == 0:
        return [(0.0, total)], total
    frames = data[: n_frames * hop].reshape(n_frames, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    # しきい値: 音のある部分の中央値から十分下、かつ完全無音よりは上
    loud = np.percentile(db, 90)
    thresh = max(loud - 35.0, -60.0)
    voiced = db > thresh
    runs: list[list[float]] = []
    start = None
    for i, v in enumerate(voiced):
        t = i * hop / sr
        if v and start is None:
            start = t
        elif not v and start is not None:
            runs.append([start, t])
            start = None
    if start is not None:
        runs.append([start, n_frames * hop / sr])
    # 短い無音（文の間）はつなぐ。min_gap以上の無音だけを区切りにする
    merged: list[list[float]] = []
    for s, e in runs:
        if merged and s - merged[-1][1] < min_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    # ごく短いノイズ（0.3秒未満）は捨てる
    segs = [(s, e) for s, e in merged if e - s >= 0.3]
    return segs or [(0.0, total)], total


# ---------------------------------------------------------------- 画像の割り当て
def assign_images(n_images: int, n_segs: int) -> list[int]:
    """パート番号 → 画像番号（0始まり）。"""
    if n_images == n_segs:
        return list(range(n_segs))
    if n_images == n_segs - 1:
        # 冒頭の導入パートは1枚目に重ねる
        return [0] + list(range(n_images))
    if n_images > n_segs:
        # 画像が多い: 先頭から順に使い、余りは最後のパートで順に流す（均等割り）
        return [min(n_images - 1, int(j * n_images / n_segs)) for j in range(n_segs)]
    # 画像が少ない: 均等に割る
    return [min(n_images - 1, int(j * n_images / n_segs)) for j in range(n_segs)]


# ---------------------------------------------------------------- 字幕画像
def resolve_font(path: str | None) -> str | None:
    if path:
        if os.path.exists(path):
            return path
        log(f"  ! フォントが見つからない: {path}")
        return None
    for cand in FONT_CANDIDATES:
        if os.path.exists(cand):
            return cand
    return None


def wrap_jp(text: str, font, max_width: int) -> list[str]:
    """文字単位で折り返す（行頭に句読点・閉じ括弧が来ないよう最小限の禁則）。"""
    kinsoku_head = "、。，．）」』】〕〉》］｝！？ー・…"
    lines: list[str] = []
    cur = ""
    for ch in text.replace("\n", ""):
        trial = cur + ch
        if font.getlength(trial) <= max_width or not cur:
            cur = trial
        else:
            if ch in kinsoku_head:
                cur = trial  # ぶら下げ
            else:
                lines.append(cur)
                cur = ch
    if cur:
        lines.append(cur)
    return lines


def render_caption(text: str, out_png: str, cfg: dict, font_path: str) -> None:
    from PIL import Image, ImageDraw, ImageFont

    W, H = cfg["width"], cfg["height"]
    size = cfg["caption_font_size"]
    font = ImageFont.truetype(font_path, size)
    lines = wrap_jp(text, font, cfg["caption_max_width"])
    line_h = int(size * 1.55)
    pad_x, pad_y = 36, 22
    box_w = int(max(font.getlength(l) for l in lines)) + pad_x * 2
    box_h = line_h * len(lines) + pad_y * 2
    x0 = (W - box_w) // 2
    y0 = H - cfg["caption_bottom"] - box_h
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=14, fill=(8, 10, 14, 190))
    y = y0 + pad_y
    for l in lines:
        d.text((x0 + pad_x, y), l, font=font, fill=(245, 245, 245, 255))
        y += line_h
    img.save(out_png)


# ---------------------------------------------------------------- ffmpeg
def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ffmpeg が見つかりません。インストールしてから実行してください。")
    return exe


def build_chapter(ch: dict, out_mp4: str, cfg: dict, parts: list[str] | None, font: str | None, workdir: str) -> dict:
    W, H, fps = cfg["width"], cfg["height"], cfg["fps"]
    segs, audio_len = split_segments(ch["wav"], cfg["min_gap"])
    lead, tail, fade = cfg["lead_in"], cfg["tail"], cfg["fade"]
    total = lead + audio_len + tail
    n_img = len(ch["images"])
    mapping = assign_images(n_img, len(segs))
    log(f"  パート {len(segs)}本 / 画像 {n_img}枚 / 音声 {audio_len:.1f}秒 → 動画 {total:.1f}秒")
    for j, (s, e) in enumerate(segs):
        log(f"    part{j + 1}: {s + lead:6.2f}〜{e + lead:6.2f}s  → 画像{mapping[j] + 1}")

    # 画像ごとの表示開始時刻（動画の時刻）
    starts = [0.0]
    for j in range(1, len(segs)):
        if mapping[j] != mapping[j - 1]:
            starts.append(max(starts[-1] + fade, segs[j][0] + lead - cfg["switch_early"]))
    used_images = []
    for j in range(len(segs)):
        if not used_images or mapping[j] != used_images[-1]:
            used_images.append(mapping[j])
    bounds = starts + [total]
    n = len(used_images)
    half = fade / 2 if n > 1 else 0.0

    cmd = [ffmpeg_bin(), "-y", "-hide_banner", "-loglevel", "error", "-nostats"]
    # 各画像の入力（長さはクロスフェードぶんだけ余分に）
    clip_len = []
    for k in range(n):
        s = bounds[k] - (half if k > 0 else 0.0)
        e = bounds[k + 1] + (half if k < n - 1 else 0.0)
        clip_len.append(e - s)
        cmd += ["-loop", "1", "-framerate", str(fps), "-t", f"{e - s:.3f}", "-i", ch["images"][used_images[k]]]
    a_in = n
    cmd += ["-i", ch["wav"]]

    # 字幕
    cap_inputs: list[tuple[int, float, float]] = []
    if parts and font:
        if len(parts) != len(segs):
            log(f"  ! 字幕: パートの文（{len(parts)}）と検出した音声の区切り（{len(segs)}）が合わないので字幕は付けない")
        else:
            for j, text in enumerate(parts):
                png = os.path.join(workdir, f"cap_{ch['index']:02d}_{j}.png")
                render_caption(text, png, cfg, font)
                cmd += ["-i", png]
                cap_inputs.append((a_in + 1 + j, segs[j][0] + lead - 0.15, segs[j][1] + lead + 0.25))

    fc = []
    W2, H2 = W * 2, H * 2
    for k in range(n):
        frames = max(1, int(round(clip_len[k] * fps)))
        if cfg["zoom"] > 0:
            z = cfg["zoom"]
            zexpr = f"1+{z}*on/{frames}" if k % 2 == 0 else f"1+{z}-{z}*on/{frames}"
            kb = (f"zoompan=z='{zexpr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                  f":s={W}x{H}:fps={fps},")
        else:
            kb = f"scale={W}:{H},"
        fc.append(
            f"[{k}:v]scale={W2}:{H2}:force_original_aspect_ratio=decrease,"
            f"pad={W2}:{H2}:(ow-iw)/2:(oh-ih)/2:color=0x{cfg['bg_color']},setsar=1,"
            f"{kb}format=yuv420p,trim=duration={clip_len[k]:.3f},setpts=PTS-STARTPTS[v{k}]"
        )
    cur = "[v0]"
    for k in range(1, n):
        offset = bounds[k] - half
        fc.append(f"{cur}[v{k}]xfade=transition=fade:duration={fade:.3f}:offset={offset:.3f}[x{k}]")
        cur = f"[x{k}]"
    for idx, (inp, s, e) in enumerate(cap_inputs):
        fc.append(f"{cur}[{inp}:v]overlay=0:0:enable='between(t,{s:.3f},{e:.3f})'[c{idx}]")
        cur = f"[c{idx}]"
    fc.append(f"{cur}fade=t=in:st=0:d=0.4,fade=t=out:st={total - 0.6:.3f}:d=0.6[vout]")
    ms = int(lead * 1000)
    fc.append(f"[{a_in}:a]aresample=48000,adelay={ms}|{ms},apad=pad_dur={tail:.3f},aformat=channel_layouts=stereo[aout]")

    cmd += [
        "-filter_complex", ";".join(fc),
        "-map", "[vout]", "-map", "[aout]",
        "-t", f"{total:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(fps),
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        out_mp4,
    ]
    log("  書き出し中…")
    subprocess.run(cmd, check=True)
    return dict(index=ch["index"], out=out_mp4, duration=total,
                parts=[dict(start=round(s + lead, 3), end=round(e + lead, 3), image=mapping[j] + 1) for j, (s, e) in enumerate(segs)])


def concat_videos(files: list[str], out_mp4: str, workdir: str) -> None:
    lst = os.path.join(workdir, "concat.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for p in files:
            f.write("file '" + os.path.abspath(p).replace("'", r"'\''") + "'\n")
    subprocess.run([ffmpeg_bin(), "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-c", "copy", "-movflags", "+faststart", out_mp4], check=True)


# ---------------------------------------------------------------- payload（TTSに渡したJSON）
def load_parts(payload_path: str | None) -> dict[int, list[str]]:
    if not payload_path:
        return {}
    with open(payload_path, encoding="utf-8") as f:
        text = f.read()
    # ノートブックのセルをそのまま貼った場合（PAYLOAD = r'''…'''）にも対応
    m = re.search(r"\{.*\}", text, re.S)
    data = json.loads(m.group(0) if m else text)
    out = {}
    for v in data.get("videos", []):
        if "parts" in v:
            out[int(v["index"])] = list(v["parts"])
    return out


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", help="選集フォルダ（例: vizlabo_chapter/002）か、チャプターのフォルダ")
    ap.add_argument("--chapter", type=int, nargs="*", help="作るチャプター番号（省略で全部）")
    ap.add_argument("--out", help="出力フォルダ（省略で folder/video）")
    ap.add_argument("--payload", help="TTSに渡したJSON（partsを字幕にする）。ノートブックのセルの貼り付けでも可")
    ap.add_argument("--font", help="字幕フォント（省略で自動検出）")
    ap.add_argument("--no-captions", action="store_true", help="字幕を付けない")
    ap.add_argument("--concat", action="store_true", help="全チャプターを1本につなげたmp4も出す")
    ap.add_argument("--name", default="vizlabo_chapter", help="出力ファイル名の接頭辞")
    ap.add_argument("--size", default=f"{DEFAULTS['width']}x{DEFAULTS['height']}", help="解像度（例 1920x1080）")
    ap.add_argument("--fps", type=int, default=DEFAULTS["fps"])
    ap.add_argument("--zoom", type=float, default=DEFAULTS["zoom"], help="ゆっくりズームの量（0で無効）")
    ap.add_argument("--fade", type=float, default=DEFAULTS["fade"], help="画像切り替えのクロスフェード秒")
    args = ap.parse_args()

    cfg = dict(DEFAULTS)
    w, h = args.size.lower().split("x")
    cfg.update(width=int(w), height=int(h), fps=args.fps, zoom=args.zoom, fade=args.fade)

    chapters = find_chapters(args.folder, args.chapter)
    if not chapters:
        sys.exit("チャプターの素材（vizlabo_chapter_NN.wav と vizlabo_chapter_NN_K.png）が見つかりません")
    out_dir = args.out or os.path.join(os.path.abspath(args.folder), "video")
    os.makedirs(out_dir, exist_ok=True)
    parts_by_idx = load_parts(args.payload)
    font = None
    if not args.no_captions and parts_by_idx:
        font = resolve_font(args.font)
        if not font:
            log("  ! 日本語フォントが見つからないので字幕は付けない（--font で指定できる。Colabなら !apt-get -qq install fonts-noto-cjk）")

    sel = os.path.basename(os.path.abspath(args.folder))
    results = []
    with tempfile.TemporaryDirectory() as workdir:
        for ch in chapters:
            out_mp4 = os.path.join(out_dir, f"{args.name}_{ch['index']:02d}.mp4")
            log(f"▶ チャプター{ch['index']:02d}: {os.path.basename(ch['wav'])} + 画像{len(ch['images'])}枚")
            r = build_chapter(ch, out_mp4, cfg, parts_by_idx.get(ch["index"]), font, workdir)
            results.append(r)
            log(f"  ✓ {out_mp4}")
        if args.concat and len(results) > 1:
            out_all = os.path.join(out_dir, f"{args.name}_{sel}_all.mp4")
            concat_videos([r["out"] for r in results], out_all, workdir)
            log(f"  ✓ 全チャプター連結: {out_all}（{sum(r['duration'] for r in results):.0f}秒）")
    with open(os.path.join(out_dir, f"{args.name}_{sel}_timeline.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    log("✅ 完了")


if __name__ == "__main__":
    main()
