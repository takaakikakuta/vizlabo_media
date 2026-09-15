import Link from "next/link";

/* 記事の目次。章の漢数字＋短い見出しでアンカーする。
   見出しの動的な数字（「答えは7通り」等）は本文に任せ、目次は要約ラベルで安定させる。 */
export default function Toc({ items }: { items: { id: string; no: string; label: string }[] }) {
  return (
    <nav aria-label="目次" className="mt-9 border-y border-line py-5">
      <p className="label mb-3.5 flex items-center gap-2.5">
        <span className="h-px w-5 bg-ink" />目次
      </p>
      <ol className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`#${it.id}`}
              className="group inline-flex items-baseline gap-3 no-underline">
              <span className="font-display w-4 shrink-0 text-[13px] text-muted">{it.no}</span>
              <span className="border-b border-transparent text-[13.5px] text-body transition group-hover:border-ink group-hover:text-ink">
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
