"use client";

/* 出典の og:image を表示。SSRのHTMLでそのまま出す（JSの読み込みを待たせない）。
   読み込み失敗（壊れ/参照拒否）時だけ自身を消し、背後の課題色タイルを見せる。
   ※ 死んだ画像URLは data/cases.json 側で落としてあるので、これは最後の保険。 */
export default function CoverImg({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
