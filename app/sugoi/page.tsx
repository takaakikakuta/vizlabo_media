import NoteSeriesList, { SERIES } from "../../components/NoteSeriesList";
import { allNotePosts } from "../../lib/note";

/* note 連載「この事例がスゴイ」の一覧。中身は note にあり、ここは見出しとリンクだけの薄いページなので
   検索結果には出さない（noindex・follow、sitemap にも載せない）。
   データはメルマガの newsletter/*.json と data/note_backfill.json（lib/note.ts）。
   OGP の取り直しも兼ねて1時間ごとに作り直す。 */
export const revalidate = 3600;

export const metadata = {
  title: "この事例がスゴイ",
  description: SERIES.sugoi.sub,
  robots: { index: false, follow: true },
};

export default async function SugoiPage() {
  return <NoteSeriesList kind="sugoi" posts={await allNotePosts("sugoi")} />;
}
