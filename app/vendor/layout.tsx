import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ベンダー向けページ",
  robots: { index: false, follow: false },
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
