"use client";

import { useState } from "react";

/* テキストをクリップボードにコピーするボタン（記念日ページの「ポスト用テキスト」で使う） */
export default function CopyText({ text, label = "コピー" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* 非対応環境では何もしない */ }
      }}
      className="border border-ink px-3 py-1.5 text-[11.5px] font-bold text-ink transition hover:bg-ink hover:text-white">
      {done ? "コピーしました" : label}
    </button>
  );
}
