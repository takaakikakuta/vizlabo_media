"use client";

import { useEffect } from "react";

/* 事例セレクション・用語記事の「枠」の計測（app/api/slots/route.ts）。記事ページに1つ置く。
   - 表示: 枠（[data-slot-item]）の3割以上が画面に入ったら、1閲覧につき枠ごとに1回数える
   - クリック: 枠のリンク（a[data-slot-link]）。事例ページへ（case）と元記事へ（src）を分けて数え、
     その閲覧でその枠の最初のクリックだけを遷移（f: true）にする＝両方押しても遷移は1回
   - 事例ページへ移るときは「どの記事の何番目の枠から来たか」を localStorage に30分だけ控える。
     事例ページで元記事が押されたら SourceClickTracker が「経由」として数える（控えは記事と枠番号だけ）
   出来事は少し溜めてまとめて送る。ページを離れるときは残りをすぐ送る。 */

export const VIA_PREFIX = "jm_via:";
export const VIA_TTL_MS = 30 * 60 * 1000;

type Ev = { t: "imp" | "case" | "src" | "via"; p: number; c: string; f?: boolean };

export function sendSlotEvents(slug: string, e: Ev[]) {
  if (e.length === 0) return;
  const body = JSON.stringify({ s: slug, e });
  if (!navigator.sendBeacon?.("/api/slots", new Blob([body], { type: "application/json" }))) {
    fetch("/api/slots", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

export default function SlotTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const queue: Ev[] = [];
    const seen = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      clearTimeout(timer);
      while (queue.length) sendSlotEvents(slug, queue.splice(0, 20));
    };
    const push = (ev: Ev, now = false) => {
      queue.push(ev);
      clearTimeout(timer);
      if (now) flush();
      else timer = setTimeout(flush, 2000);
    };

    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const enough = en.intersectionRatio >= 0.3 || en.intersectionRect.height >= window.innerHeight * 0.3;
        if (!enough) continue;
        const el = en.target as HTMLElement;
        const p = Number(el.dataset.slot);
        const c = el.dataset.caseId ?? "";
        io.unobserve(el);
        if (!p || !c || seen.has(`imp:${p}`)) continue;
        seen.add(`imp:${p}`);
        push({ t: "imp", p, c });
      }
    }, { threshold: [0, 0.1, 0.2, 0.3] });
    document.querySelectorAll<HTMLElement>("[data-slot-item]").forEach((el) => io.observe(el));

    function onClick(e: MouseEvent) {
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.<HTMLElement>("a[data-slot-link]");
      if (!a) return;
      const t = a.dataset.slotLink === "case" ? "case" : "src";
      const p = Number(a.dataset.slot);
      const c = a.dataset.caseId ?? "";
      if (!p || !c) return;
      if (t === "case") {
        try {
          localStorage.setItem(VIA_PREFIX + c, JSON.stringify({ s: slug, p, at: Date.now() }));
        } catch {
          // 控えられなくても、このクリック自体は数える
        }
      }
      if (seen.has(`${t}:${p}`)) return;
      seen.add(`${t}:${p}`);
      const first = !seen.has(`any:${p}`);
      seen.add(`any:${p}`);
      push({ t, p, c, f: first }, true);
    }
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };

    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      io.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
  }, [slug]);
  return null;
}
