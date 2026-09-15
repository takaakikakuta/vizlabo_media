import type { Metadata } from "next";

/* proposal/ 配下は記事フォーマットの社内検討用ミュージアム。
   本番にも残すが、検索エンジンには載せない（リンクも張っていない）。 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProposalLayout({ children }: LayoutProps<"/proposal">) {
  return children;
}
