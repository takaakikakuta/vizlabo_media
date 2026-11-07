import { Play } from "lucide-react";

/* 「動画あり」の印。元記事（出典ページ）に YouTube 動画が埋め込まれている事例に付ける。
   事例セレクション（選記事）の項目と要約ページの扉で使う。
   補足行の中でも目に入るよう、誌面で唯一の赤で塗りつぶし、再生マークを白抜きにする。 */
export default function VideoBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const md = size === "md";
  return (
    <span title="元記事に動画があります"
      className={`inline-flex shrink-0 items-center gap-1 rounded-[3px] bg-video align-middle font-bold leading-none tracking-[.04em] text-white ${
        md ? "px-2.5 py-[5px] text-[12.5px]" : "px-2 py-[4px] text-[11.5px]"}`}>
      <Play size={md ? 12 : 11} strokeWidth={2.5} fill="currentColor" aria-hidden />
      動画あり
    </span>
  );
}

/** サムネイルの上に重ねる再生マーク（カードの画像の隅に置く） */
export function PlayMark({ className = "" }: { className?: string }) {
  return (
    <span aria-label="動画あり" title="元記事に動画があります"
      className={`absolute z-10 grid h-6 w-6 place-items-center rounded-full bg-video text-white shadow-[0_1px_3px_rgba(0,0,0,.3)] ${className}`}>
      <Play size={10} strokeWidth={2.5} fill="currentColor" className="translate-x-px" aria-hidden />
    </span>
  );
}
