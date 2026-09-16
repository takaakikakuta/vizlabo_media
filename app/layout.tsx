import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { siteStats } from "../lib/cases";
import { Mail, PenLine, FilePlus2 } from "lucide-react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const SITE_NAME = "事例ナビ";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME}｜課題から探すBtoB導入事例`, template: `%s｜${SITE_NAME}` },
  description:
    "各社サイトの導入事例を「課題」から横断検索。人手不足・コスト削減・品質改善など、あなたと同じ課題を何でどう解決したかを、成果の数字つきで比較できます。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-body">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

/* 誌面のマストヘッド。太い上罫＋明朝の題字で“紙”の入口をつくる。 */
function SiteHeader() {
  const { total } = siteStats();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#fdfcfa]/95 backdrop-blur">
      <div className="h-[3px] bg-ink" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="flex shrink-0 items-baseline gap-2.5 no-underline">
          <span className="font-display text-[19px] tracking-wide text-ink sm:text-[21px]">{SITE_NAME}</span>
          <span className="hidden text-[10.5px] tracking-[.14em] text-muted sm:inline">
            BtoB導入事例データベース
          </span>
        </Link>
        {/* 探す系の細かい導線はトップの「事例を探す」タブに集約。
            目立たせるのはアクション3つ（メルマガ／事例制作／事例を掲載する）＝アイコン付きで強調 */}
        <nav className="flex items-center gap-1 text-[12.5px]">
          <NavLink href="/cases" className="hidden md:block">
            事例一覧<span className="num ml-1 text-[11px] text-muted">{total}</span>
          </NavLink>
          <NavLink href="/articles" className="hidden md:block">事例解体新書</NavLink>

          <Link href="/newsletter" aria-label="メルマガ"
            className="ml-1 flex shrink-0 items-center gap-1.5 border border-ink px-2.5 py-1.5 text-[12px] font-bold whitespace-nowrap text-ink no-underline transition hover:bg-ink hover:text-white sm:px-3">
            <Mail size={14} strokeWidth={2.2} />
            <span className="hidden sm:inline">メルマガ</span>
          </Link>
          <Link href="/produce" aria-label="事例制作"
            className="flex shrink-0 items-center gap-1.5 border border-ink px-2.5 py-1.5 text-[12px] font-bold whitespace-nowrap text-ink no-underline transition hover:bg-ink hover:text-white sm:px-3">
            <PenLine size={14} strokeWidth={2.2} />
            <span className="hidden sm:inline">事例制作</span>
          </Link>
          <Link href="/contact"
            className="flex shrink-0 items-center gap-1.5 border border-ink bg-ink px-3 py-1.5 text-[12px] font-bold whitespace-nowrap text-white no-underline transition hover:bg-white hover:text-ink sm:px-3.5 sm:text-[12.5px]">
            <FilePlus2 size={14} strokeWidth={2.2} />
            <span className="sm:hidden">掲載する</span>
            <span className="hidden sm:inline">事例を掲載する</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children, className = "" }:
  { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href}
      className={`border-b-2 border-transparent px-2.5 py-1.5 whitespace-nowrap text-body no-underline transition hover:border-ink hover:text-ink ${className}`}>
      {children}
    </Link>
  );
}

function SiteFooter() {
  const { total, vendors } = siteStats();
  return (
    <footer className="mt-20 border-t border-ink bg-soft">
      <div className="mx-auto max-w-6xl px-5 py-12 text-[13px] text-muted">
        {/* メルマガ＝読者を自分の資産にする導線。全ページの足元に置く */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-10">
          <div className="max-w-md">
            <p className="font-display text-[17px] text-ink">週刊 事例ナビ</p>
            <p className="mt-1.5 text-[12px] leading-relaxed">
              毎週金曜配信。今週の事例解体新書2本と、新着の解決事例を届けます。
            </p>
          </div>
          <Link href="/newsletter"
            className="shrink-0 border border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-white no-underline transition hover:bg-white hover:text-ink">
            メルマガの内容を見て登録する
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-md">
            <div className="font-display text-[19px] text-ink">{SITE_NAME}</div>
            <p className="mt-3 leading-[1.9]">
              各社の公開導入事例を「課題」から横断で探せるBtoB事例データベース。
              掲載は要約と出典リンクで行い、本文の転載はしていません。
            </p>
            <p className="mt-4 text-[11.5px]">
              現在 <span className="num text-ink">{total}</span> 件 /
              <span className="num ml-1 text-ink">{vendors}</span> 社を収録
            </p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <span className="label">探す</span>
              <Link href="/challenges" className="no-underline hover:text-ink">課題から</Link>
              <Link href="/tags" className="no-underline hover:text-ink">困りごとから</Link>
              <Link href="/industries" className="no-underline hover:text-ink">業種から</Link>
              <Link href="/cases" className="no-underline hover:text-ink">すべての事例</Link>
              <Link href="/articles" className="no-underline hover:text-ink">事例解体新書</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="label">サービス</span>
              <Link href="/contact" className="no-underline hover:text-ink">事例の掲載を依頼</Link>
              <Link href="/produce" className="no-underline hover:text-ink">事例制作代行</Link>
              <Link href="/newsletter" className="no-underline hover:text-ink">メルマガ</Link>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-line pt-5 text-[11px]">© {new Date().getFullYear()} {SITE_NAME}</div>
      </div>
    </footer>
  );
}
