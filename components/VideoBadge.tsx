import { Play } from "lucide-react";

/* 「動画あり」の印。元記事（出典ページ）に YouTube 動画が埋め込まれている事例に付ける。
   事例セレクション（選記事）の項目と要約ページの扉で使う。紙面の調子に合わせ、罫線の小さなチップにする。 */
export default function VideoBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const md = size === "md";
  return (
    <span title="元記事に動画があります"
      className={`inline-flex shrink-0 items-center gap-1 border border-ink px-1.5 align-middle font-bold leading-none text-ink ${
        md ? "py-[3px] text-[11px]" : "py-[2px] text-[10px]"}`}>
      <Play size={md ? 10 : 9} strokeWidth={2.5} fill="currentColor" aria-hidden />
      動画あり
    </span>
  );
}

/** サムネイルの上に重ねる再生マーク（カードの画像の隅に置く） */
export function PlayMark({ className = "" }: { className?: string }) {
  return (
    <span aria-label="動画あり" title="元記事に動画があります"
      className={`absolute z-10 grid h-6 w-6 place-items-center rounded-full bg-ink/85 text-white ${className}`}>
      <Play size={10} strokeWidth={2.5} fill="currentColor" className="translate-x-px" aria-hidden />
    </span>
  );
}
