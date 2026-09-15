"use client";

/* 課題色タイルの中央に置く提供元ロゴ。白地の小さな座布団に載せ、
   読み込み失敗（ホットリンク拒否等）時は黙って消えてタイルに戻る。 */
export default function VendorLogo({ src, size = 48 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      style={{ width: size, height: size }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-line bg-white object-contain p-1.5"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
