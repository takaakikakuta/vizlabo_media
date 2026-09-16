import fs from "node:fs";
import path from "node:path";
import CoverImg from "./CoverImg";

/* note（この事例がスゴイ／事例コラム）へのバナー。
   public/banner/note.png（4:1・1600×400）を置けば自動で画像になる。無ければプレースホルダー枠。 */
export const NOTE_URL = "https://note.com/vizlabo";

export default function NoteBanner() {
  const exists = fs.existsSync(path.join(process.cwd(), "public", "banner", "note.png"));
  return (
    <a href={NOTE_URL} target="_blank" rel="noopener noreferrer" aria-label="noteで連載中：この事例がスゴイ／事例コラム"
      className="block no-underline transition hover:opacity-90">
      {exists ? (
        <div className="relative aspect-[4/1] w-full overflow-hidden border border-line">
          <CoverImg src="/banner/note.png" />
        </div>
      ) : (
        <div className="flex aspect-[4/1] w-full flex-col items-center justify-center gap-1.5 border border-dashed border-line bg-soft">
          <span className="font-display text-[18px] text-ink">この事例がスゴイ／事例コラム</span>
          <span className="text-[11.5px] text-muted">noteで連載中の2企画</span>
        </div>
      )}
    </a>
  );
}
