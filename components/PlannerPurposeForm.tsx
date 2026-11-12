"use client";

import { useState } from "react";

/* 事例プランナーの目的選択。主目的を1つ、副目的を上限まで選ぶ。
   送信は素のGETフォーム（/planner?m=…&s=…）。JSは「主目的と同じものは副目的に選べない」
   「副目的は上限まで」を画面で分かるようにするためだけに使う（上限はサーバー側でも守る）。
   lib/planner は事例データを読み込むので、ここでは import せず選択肢を props でもらう。 */

type Option = { slug: string; label: string; desc: string };

const CARD = "flex items-start gap-2.5 border px-4 py-3.5 transition";
const ON = "border-ink bg-soft";
const OFF = "cursor-pointer border-line bg-white hover:border-ink";
const DISABLED = "cursor-not-allowed border-line2 bg-white opacity-45";

export default function PlannerPurposeForm({ options, maxSub, initMain, initSubs }: {
  options: Option[]; maxSub: number; initMain?: string; initSubs: string[];
}) {
  const [main, setMain] = useState(initMain ?? "");
  const [subs, setSubs] = useState<string[]>(initSubs);

  const pickMain = (slug: string) => {
    setMain(slug);
    setSubs((cur) => cur.filter((x) => x !== slug));
  };
  const toggleSub = (slug: string) =>
    setSubs((cur) => (cur.includes(slug) ? cur.filter((x) => x !== slug) : cur.length < maxSub ? [...cur, slug] : cur));

  return (
    <form method="get" action="/planner" className="space-y-12">
      <input type="hidden" name="go" value="1" />

      <fieldset>
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />主目的</p>
        <h2 className="font-display mt-3 text-[21px] leading-[1.45] text-ink sm:text-[25px]">いちばんの目的を1つ選んでください</h2>
        <p className="mt-2 text-[12.5px] text-muted">主目的には5問の質問をお出しします。</p>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {options.map((p) => (
            <label key={p.slug} className={`${CARD} ${main === p.slug ? `cursor-pointer ${ON}` : OFF}`}>
              <input type="radio" name="m" value={p.slug} required checked={main === p.slug} onChange={() => pickMain(p.slug)}
                className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
              <span>
                <span className="block text-[14.5px] font-bold text-ink">{p.label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{p.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <p className="label flex items-center gap-2.5"><span className="h-px w-5 bg-ink" />副目的（任意）</p>
        <h2 className="font-display mt-3 text-[21px] leading-[1.45] text-ink sm:text-[25px]">同じ取材から、ほかの用途にも使いますか</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {maxSub}つまで選べます。副目的には要の2問ずつを足すので、全体で1時間の取材に収まる数になります。
          <span className="ml-1 text-ink">（{subs.length} / {maxSub}）</span>
        </p>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {options.map((p) => {
            const on = subs.includes(p.slug);
            const isMain = main === p.slug;
            const disabled = isMain || (!on && subs.length >= maxSub);
            return (
              <label key={p.slug} className={`${CARD} ${on ? `cursor-pointer ${ON}` : disabled ? DISABLED : OFF}`}>
                <input type="checkbox" name="s" value={p.slug} checked={on} disabled={disabled} onChange={() => toggleSub(p.slug)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-ink" />
                <span>
                  <span className="block text-[14px] font-bold text-ink">
                    {p.label}{isMain && <span className="ml-2 text-[11px] font-normal text-muted">主目的に選択中</span>}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{p.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="border-t border-ink pt-6">
        <button type="submit"
          className="border border-ink bg-ink px-8 py-3 text-[14px] font-bold text-white transition hover:bg-white hover:text-ink">
          構成と質問を見る →
        </button>
      </div>
    </form>
  );
}
