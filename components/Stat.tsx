import type { CaseResult } from "../lib/types";
import { parseStat, statSize } from "../lib/stat";

/* 成果の数字。指標名を小さく、数字を大きく、動詞を添える＝誌面の主役。
   「月40〜50時間から10時間以上」のような長い値も来るので、
   長いものは行間を開けて2行までに抑え、一覧の行高が崩れないようにする。 */
export default function Stat({ r, scale = "lg", align = "left" }:
  { r: CaseResult; scale?: "xl" | "lg" | "md"; align?: "left" | "right" }) {
  const s = parseStat(r.value);
  const right = align === "right";
  return (
    <div className={right ? "text-right" : ""}>
      <div className="label line-clamp-2 leading-snug">{r.metric}</div>
      <div className={`mt-1.5 flex items-baseline gap-1.5 ${right ? "justify-end" : ""}`}>
        <span className={`num text-accent ${statSize(s.head, scale)} ${s.wide ? "line-clamp-2 leading-snug" : "leading-none"}`}>
          {s.head}
        </span>
        {s.verb && <span className="shrink-0 text-[12px] font-bold text-accent/70">{s.verb}</span>}
      </div>
    </div>
  );
}
