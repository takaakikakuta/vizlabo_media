import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import CoverImg from "./CoverImg";
import { siteStats } from "../lib/cases";

/* 事例ファインダー（アキネーター型の絞り込み）へのバナー。記事の末尾に置く。
   public/banner/finder.png（4:1・1600×400）を置けば自動で画像バナーになる。
   無いあいだは、トップの入口と同じ調子のテキストバナーで成立させる。 */
export default function FinderBanner() {
  const exists = fs.existsSync(path.join(process.cwd(), "public", "banner", "finder.png"));
  const total = siteStats().total.toLocaleString();

  return (
    <aside className="mt-12">
      <Link href="/finder" aria-label="事例ファインダー：質問に答えるだけで、自社に近い事例へ"
        className="group block no-underline transition hover:opacity-90">
        {exists ? (
          <div className="relative aspect-[4/1] w-full overflow-hidden border border-line">
            <CoverImg src="/banner/finder.png" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border border-ink bg-white px-6 py-5 transition group-hover:bg-soft sm:px-8">
            <div className="min-w-0">
              <p className="label">事例ファインダー</p>
              <p className="font-display mt-1.5 text-[16px] leading-snug text-ink group-hover:text-brand sm:text-[18px]">
                業種・部門・ほしい成果を順に選ぶだけ。{total}件から自社に近い事例へ
              </p>
            </div>
            <span className="shrink-0 border border-ink px-5 py-2.5 text-[13px] font-bold text-ink transition group-hover:bg-ink group-hover:text-white">
              質問に答えて探す →
            </span>
          </div>
        )}
      </Link>
    </aside>
  );
}
