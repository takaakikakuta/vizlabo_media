import CoverImg from "./CoverImg";
import type { NotePost } from "../lib/note";
import { NOTE_URL } from "./NoteBanner";

/* トップのヒーロー直下。note 連載の最新回を2枚（この事例がスゴイ／事例コラム）。
   出どころは newsletter/*.json の最新号（lib/note.ts）。1本も無ければ何も出さない。 */

const LABEL: Record<NotePost["kind"], string> = { sugoi: "この事例がスゴイ", column: "事例コラム" };

function Card({ p }: { p: NotePost }) {
  // 「【この事例がスゴイ！ #012】…」のように見出しに企画名が入っていれば、ラベルと重ねない
  const title = p.title.replace(/^【[^】]*】\s*/, "");
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col border border-ink bg-white no-underline transition hover:bg-soft">
      {/* note のアイキャッチは 1.91:1（1280×670）で、文字が大きく入っている。
         カードの上に横幅いっぱいで出し、比率を固定して端が切れないようにする
         （横並びにすると枠が文字の高さに引き伸ばされ、左右が切り落とされていた） */}
      <div className="relative aspect-[1.91/1] w-full overflow-hidden border-b border-ink bg-soft">
        {p.image && <CoverImg src={p.image} />}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="label">{LABEL[p.kind]}<span className="ml-1.5 font-normal tracking-normal text-muted/70">note</span></p>
        <p className="font-display mt-1 line-clamp-2 text-[14px] leading-snug text-ink group-hover:text-brand sm:text-[15px]">{title}</p>
        <p className="mt-auto pt-2 text-[12px] font-bold text-ink">noteで読む →</p>
      </div>
    </a>
  );
}

export default function NoteLatest({ posts }: { posts: NotePost[] }) {
  if (!posts.length) return null;
  return (
    <div>
      <div className={`grid gap-3 ${posts.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {posts.map((p) => <Card key={p.kind} p={p} />)}
      </div>
      <p className="mt-2 text-right text-[11.5px] text-muted">
        <a href={NOTE_URL} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink">noteの連載一覧 →</a>
      </p>
    </div>
  );
}
