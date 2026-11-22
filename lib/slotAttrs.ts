/* 事例セレクション・用語記事の「枠」に付ける data 属性（計測は components/SlotTracker.tsx、記録は app/api/slots/route.ts）。
   data-slot＝枠位置（1始まり。記事の items の並び順）、data-case-id＝事例ID、data-vendor-id＝提供元ドメイン。
   表示の見た目には一切影響しない。 */

type CaseLike = { id: string; vendor: string };

/** 枠全体（表示数を数える単位） */
export function slotItem(pos: number, c: CaseLike) {
  return { "data-slot-item": "", "data-slot": pos, "data-case-id": c.id, "data-vendor-id": c.vendor };
}

/** 枠の中のリンク。case＝事例マニア内の事例ページ、src＝提供元の元記事（外部） */
export function slotLink(pos: number, c: CaseLike, link: "case" | "src") {
  return { "data-slot-link": link, "data-slot": pos, "data-case-id": c.id, "data-vendor-id": c.vendor };
}
