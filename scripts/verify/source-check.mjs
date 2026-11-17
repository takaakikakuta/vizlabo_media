#!/usr/bin/env node
/* 事例データの社名と数字を、掲載元ページ（sourceUrl）の本文と機械的に照合する。AIは使わず、文字列の照合だけで行う。
 * 報告だけを行い、data/cases.json は書き換えない。
 *
 *   node scripts/verify/source-check.mjs                     → 全件（掲載禁止の提供元を除く）
 *   node scripts/verify/source-check.mjs --vendor <ドメイン>  → その提供元だけ
 *   node scripts/verify/source-check.mjs --ids a,b,c         → 指定した事例だけ
 *   node scripts/verify/source-check.mjs --limit 200         → 先頭から200件（試運転用）
 *   node scripts/verify/source-check.mjs --input <ファイル>   → cases.json と同じ形の別ファイル（取り込み前の関門。不一致が1件でもあれば終了コード 1）
 *   --refresh        キャッシュを使わず取得し直す
 *   --retry-failed   前回取得に失敗したページだけ取得し直す
 *   --fetch-excluded 対象外（社名が空・匿名など）の事例もページを取得してキャッシュに入れる（判定は対象外のまま。抽出し直す前の準備用）
 *   --out <ファイル>  CSV の出力先（既定: .source-check/result.csv。--input のときは result-<ファイル名>.csv）
 *   --saved <dir>    手で保存したページ（.html / .mhtml）の置き場所。既定: ../jirei_collector/manual_inbox/done
 *                    ボット拒否で取得できないサイトは、ここにある保存ページを取得済みとして使う（相手のサーバーには取りに行かない）
 *
 * 判定（事例ごとに1つ）
 *   一致     … 社名がページに出てくる
 *   不一致   … ページは取得できたが、社名が出てこない（ページから拾った社名らしい文字列を候補として3つまで添える）
 *   取得失敗 … 404・タイムアウト・アクセス拒否・robots.txt で禁止・本文がほぼ空（JS描画）・PDF・トップページへの転送など
 *   対象外   … 社名が空、または「非公開」「匿名」「A社」「某」「仮名」「推定」など社名ではないもの
 * 数字（results[].value・scale[].value の「数字＋単位」）は表記の揺れが多いので、判定には使わず「要確認」として列に出すだけ。
 *
 * 取得のしかた: 同じホストへは同時に1接続・1〜2秒間隔、全体の並列は8。タイムアウト20秒、再試行2回まで。
 * robots.txt（User-agent: * の規則）で禁止されたパスは取得しない。403・429 を受けても User-Agent を変えて取り直したりはしない。
 * 取得結果は .source-check/cache/ に保存し（.gitignore 済み）、再実行では再取得しない（途中で止めても続きから）。 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORK = path.join(ROOT, ".source-check");
const CACHE = path.join(WORK, "cache");
const ROBOTS = path.join(WORK, "robots");
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(ROBOTS, { recursive: true });

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (k) => argv.includes(k);
const INPUT = arg("--input");
const REFRESH = flag("--refresh");
const RETRY_FAILED = flag("--retry-failed");
const FETCH_EXCLUDED = flag("--fetch-excluded");
const LIMIT = arg("--limit") ? Number(arg("--limit")) : 0;
const VENDOR = arg("--vendor");
const IDS = arg("--ids") ? new Set(arg("--ids").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const SAVED_DIR = path.resolve(ROOT, arg("--saved") ?? "../jirei_collector/manual_inbox/done");
const OUT = path.resolve(ROOT, arg("--out") ?? path.join(".source-check", INPUT ? `result-${path.basename(INPUT, path.extname(INPUT))}.csv` : "result.csv"));

const PARALLEL = 8;
const TIMEOUT_MS = 20000;
const RETRIES = 2;
const MAX_BYTES = 6 * 1024 * 1024;
// 一般的なブラウザ相当。運営者・サイトを特定できる情報は入れない
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

/* ───────── 表記の正規化 ───────── */

// 異体字（NFKC で揃わないもの）
const ITAIJI = { 髙: "高", 﨑: "崎", 嵜: "崎", 濵: "浜", 濱: "浜", 德: "徳", 邊: "辺", 邉: "辺", 齋: "斎", 齊: "斉", 澤: "沢", 櫻: "桜", 嶋: "島", 嶌: "島", 廣: "広", 國: "国", 圓: "円", 惠: "恵", 眞: "真", 榮: "栄", 瀨: "瀬", 冨: "富", 塚: "塚", 晴: "晴", 曻: "昇", 隆: "隆", 﨔: "欅", 祐: "祐", 福: "福", 神: "神", 藏: "蔵", 龍: "竜", 辻: "辻", 黑: "黒", 會: "会", 舘: "館", 劍: "剣", 竈: "竃", 實: "実", 學: "学", 增: "増", 縣: "県", 鐵: "鉄", 驛: "駅", 豐: "豊", 禮: "礼", 萬: "万", 與: "与" };
const ITAIJI_RE = new RegExp(`[${Object.keys(ITAIJI).join("")}]`, "g");
// 法人格（NFKC・小文字化の後に当てる）。社名の側とページの側の両方から外して比べる
const CORP_RE = /(?:株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|公益社団法人|一般財団法人|公益財団法人|社会福祉法人|社会医療法人|医療法人社団|医療法人財団|医療法人|学校法人|宗教法人|特定非営利活動法人|npo法人|地方独立行政法人|独立行政法人|国立大学法人|公立大学法人|\((?:株|有|同|医|社福|学|財|社)\))/g;
const CORP_EN_RE = /\b(?:co\.?,?\s*ltd|inc|corporation|corp|llc|ltd|k\.k)\b\.?/g;
const HONORIFIC_RE = /(?:様|さま|御中|殿)$/;

/** 社名・ページ本文を、照合用に揃える（全角半角・大小文字・空白・中黒・長音・異体字・法人格） */
function normName(s, keepCorp = false) {
  let t = String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(ITAIJI_RE, (c) => ITAIJI[c]);
  if (!keepCorp) t = t.replace(CORP_RE, "").replace(CORP_EN_RE, "");
  return t
    // ヴとブの揺れ（「プロヴディフ」と「プロブディフ」）
    .replace(/ヴァ/g, "バ").replace(/ヴィ/g, "ビ").replace(/ヴェ/g, "ベ").replace(/ヴォ/g, "ボ").replace(/ヴ/g, "ブ")
    .replace(/[\s​　]+/g, "")
    .replace(/[・･·•‧]/g, "")
    .replace(/[‐‑‒–—―−ー\-~〜]/g, "ー")
    .replace(/[.,、。'"“”‘’「」『』]/g, "");
}

/** 社名の照合キー。「A株式会社（現：B株式会社）」「A／B」は複数のキーにする。どれか1つが出れば一致 */
function nameKeys(raw) {
  const s = String(raw ?? "").normalize("NFKC");
  const keys = new Set();
  const parts = [];
  // 括弧の中は、旧社名・新社名・英字の別名のときだけ別名として使う（「（東京都）」のような所在地は使わない）
  const outer = s.replace(/[（(]([^）)]*)[）)]/g, (_, inner) => {
    const t = inner.replace(/^(?:現|旧|略称|通称|英文名|英語名)\s*[:：・]?\s*/, "");
    if (/^(?:現|旧|略称|通称)/.test(inner) || CORP_RE.test(inner.toLowerCase()) || /^[a-z0-9&.\- ]{3,}$/i.test(t)) parts.push(t);
    CORP_RE.lastIndex = 0;
    return " ";
  });
  // 「A生活協同組合ほか複数」「A社など」の後ろは外す
  const body = outer.replace(/\s*(?:ほか|他)(?:複数|\d+社)?(?:の(?:企業|法人|団体))?\s*$|\s*(?:など|等)\s*$/, "");
  parts.unshift(...body.split(/[／/、,，]|および|及び/));   // 「&」は社名の中にも出る（B&V・I&H）ので分けない
  // 「A株式会社・B株式会社」のように法人格の付いた社名を中黒でつないだものは、各社に分ける（中黒は社名の中にも出るので法人格がある時だけ）
  for (const p of [...parts]) {
    const pieces = p.split(/[・･]/);
    if (pieces.length > 1 && pieces.every((x) => /株式会社|有限会社|合同会社|法人|\(株\)/.test(x))) parts.push(...pieces);
  }
  for (const p of parts) {
    const k = normName(p.replace(HONORIFIC_RE, "").trim().replace(HONORIFIC_RE, ""));
    if (k.length >= 2) keys.add(k);
  }
  return [...keys];
}

/** 中核が1文字の社名（「社会福祉法人 紡」）は、法人格を付けたまま照合する（ページ側も法人格を外さずに揃える） */
function shortKeys(raw) {
  const s = String(raw ?? "").normalize("NFKC").replace(/[（(][^）)]*[）)]/g, " ").replace(HONORIFIC_RE, "").trim();
  return normName(s).length === 1 ? [normName(s, true)] : [];
}

/** 空白で区切られた社名（「トヨタ自動車株式会社 元町工場」）は、各部分がすべてページに出れば一致とみなす */
function nameSegments(raw) {
  const s = String(raw ?? "").normalize("NFKC").replace(/[（(][^）)]*[）)]/g, " ");
  const segs = s.split(/\s+/).map((x) => normName(x.replace(HONORIFIC_RE, ""))).filter((x) => x.length >= 2);
  return segs.length >= 2 ? segs : [];
}

/** 対象外（社名ではないもの）なら理由を返す */
function excludedReason(raw) {
  const s = String(raw ?? "").normalize("NFKC").trim();
  if (!s) return "社名が空";
  if (/非公開|匿名|仮名|推定|非開示|不明|具体名なし|名称なし|社名なし|記載なし/.test(s)) return "社名が非公開・匿名など";
  if (/某/.test(s)) return "社名が「某」";
  if (/^(?:記載なし|なし|未記載|該当なし|-|ー)$/.test(s)) return "社名が「記載なし」など";
  if (/^[a-z](?:\.|\s)?(?:様|さま|さん|氏|社)/i.test(s)) return "社名が頭文字だけ（「O様」など）";
  // 「社会福祉法人」「医療法人社団」「一般財団法人さま（非営利団体）」のように法人格しかない
  if (!normName(s.replace(/[（(][^）)]*[）)]/g, "").replace(HONORIFIC_RE, "").trim().replace(HONORIFIC_RE, ""))) return "社名が法人格だけ";
  if (/(?:^|[^a-z])[a-z]\s?社/i.test(s) || /[〇○●×]{1,}社/.test(s)) return "社名が「A社」の形";
  // 「大手電機メーカー」のような呼び方（法人格を含むものは社名として扱う）
  if (/^(?:大手|中堅|中小|地方の|地域の|ある|国内の?|外資系|全国)/.test(s) && !/株式会社|有限会社|法人|\(株\)/.test(s)) return "社名ではなく呼び方（大手〜など）";
  return null;
}

/* 数字＋単位（scripts/link-only/check.mjs と同じ考え方。ヶ所・万単位などを足した） */
function normNum(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .replace(/(\d),(?=\d{3})/g, "$1")
    .replace(/[～~]/g, "〜")
    .replace(/[ヶカヵケ]月/g, "か月")
    .replace(/[ヶカヵケ箇]所/g, "か所")
    .replace(/(\d)\s+(?=\D)/g, "$1");
}
const UNIT = "(?:%|割|倍|[万億千]?円|[万億]?(?:時間|件|名|人|社|台|回|本|枚|個|店舗|店|拠点)|分|秒|週間|か月|か所|年|日|校|床|坪|㎡|km|kg|t|ポイント|pt)";
const TOKEN = new RegExp(`\\d+(?:\\.\\d+)?${UNIT}`, "g");
const STRONG_UNIT = /^(?:%|割|倍|[万億千]?円|[万億]?時間|週間|か月|年|ポイント|pt)$/;
function numberKeys(text) {
  const out = new Set();
  for (const m of normNum(text).matchAll(TOKEN)) {
    const tok = m[0];
    const digits = tok.match(/^\d+(?:\.\d+)?/)[0];
    if (digits.length === 1 && !STRONG_UNIT.test(tok.slice(digits.length))) continue; // 「3件」「1回」は普通の文にも出る
    if (/^(?:19|20)\d{2}年$/.test(tok)) continue; // 西暦は成果の数字ではない（「2026年1月〜2月」の期間など）
    out.add(tok);
  }
  return [...out];
}

/* ───────── HTML からテキストを取り出す ───────── */

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "・", ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®", trade: "™", times: "×", yen: "¥", laquo: "«", raquo: "»" };
const decodeEnt = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)); try { return String.fromCodePoint(n); } catch { return m; } }
  return ENT[e.toLowerCase()] ?? m;
});
const stripTags = (s) => decodeEnt(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function metaContent(html, key) {
  const out = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const c = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (c) out.push(decodeEnt(c));
  }
  return out;
}

function jsonStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => jsonStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => jsonStrings(x, out));
  return out;
}

/** ページの各部分。text＝本文、meta＝title・og・alt・JSON-LD、script＝その他のインラインスクリプト中のデータ（JS描画のページ用） */
function parsePage(html) {
  const ld = [], scripts = [];
  let body = html.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, inner) => {
    if (/application\/ld\+json/i.test(attrs)) {
      try { ld.push(...jsonStrings(JSON.parse(inner), [])); } catch { ld.push(inner); }
    } else if (!/\bsrc\s*=/i.test(attrs) && inner.trim()) {
      // \uXXXX を戻す（__NEXT_DATA__・__NUXT__ などの埋め込みデータ）
      scripts.push(inner.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
    }
    return " ";
  });
  body = body.replace(/<(style|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
  const title = stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const alts = [...body.matchAll(/\b(?:alt|title)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => decodeEnt(m[1] ?? m[2] ?? "")).filter(Boolean);
  const metas = ["og:title", "og:description", "description", "twitter:title", "twitter:description"].flatMap((k) => metaContent(html, k));
  const text = stripTags(body.replace(/<head\b[\s\S]*?<\/head>/i, " "));
  return { title, h1, text, meta: [title, ...metas, ...alts, ...ld].join(" "), script: scripts.join(" ") };
}

/** 不一致のときに添える「社名らしい文字列」。title・h1 を優先し、本文は出現回数の多い順。最大3つ */
const STOP = "\\s、。,，「」『』【】\\[\\]|｜:：/／()（）<>＜＞\"'…・";
const CORP_JA = "株式会社|有限会社|合同会社|医療法人(?:社団|財団)?|社会医療法人|社会福祉法人|学校法人|一般社団法人|一般財団法人|公益社団法人|公益財団法人|地方独立行政法人|独立行政法人|国立大学法人";
const CAND_PATTERNS = [
  new RegExp(`(?:${CORP_JA})\\s?[^${STOP}]{2,20}`, "g"),
  new RegExp(`[^${STOP}]{2,20}\\s?(?:株式会社|有限会社|合同会社)`, "g"),
];
const CAND_SAMA = new RegExp(`[^${STOP}]{2,20}様`, "g");
function candidates(page) {
  const score = new Map();
  const add = (s, w) => {
    s = s.normalize("NFKC").trim().replace(/^[ぁ-ん]+/, "").replace(/^.*[ぁ-ん](?=[^ぁ-ん]{2,}(?:株式会社|有限会社|合同会社)$)/, "");
    if (s.replace(/(株式会社|有限会社|合同会社|様)/g, "").length < 2) return;
    score.set(s, (score.get(s) ?? 0) + w);
  };
  const strong = [page.title, ...page.h1].join(" ｜ ");
  for (const re of [...CAND_PATTERNS, CAND_SAMA]) for (const m of strong.normalize("NFKC").matchAll(re)) add(m[0], 100);
  for (const re of CAND_PATTERNS) for (const m of page.text.normalize("NFKC").matchAll(re)) add(m[0], 1);
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
}

/* ───────── 文字コード ───────── */

function decodeBytes(buf, headerCharset) {
  let cs = headerCharset;
  if (!cs) {
    const head = buf.subarray(0, 4096).toString("latin1");
    cs = head.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i)?.[1];
  }
  cs = (cs || "utf-8").toLowerCase().replace(/^(x-)?sjis$|^shift-jis$|^windows-31j$|^cp932$/, "shift_jis");
  try { return new TextDecoder(cs).decode(buf); } catch { return new TextDecoder("utf-8").decode(buf); }
}

/* ───────── 手で保存したページ（manual_inbox/done） ───────── */

const normUrl = (u) => { try { const x = new URL(u); x.hash = ""; return (x.host.toLowerCase().replace(/^www\./, "") + x.pathname.replace(/\/(index\.html?)?$/, "") + x.search); } catch { return u; } };

function readMhtml(raw) {
  const s = raw.toString("latin1");
  const boundary = s.match(/boundary="?([^";\r\n]+)"?/i)?.[1];
  if (!boundary) return null;
  for (const part of s.split("--" + boundary)) {
    const sep = part.search(/\r?\n\r?\n/);
    if (sep < 0) continue;
    const head = part.slice(0, sep);
    if (!/content-type:\s*text\/html/i.test(head)) continue;
    let bodyStr = part.slice(sep).replace(/^\r?\n\r?\n/, "");
    let bytes;
    if (/content-transfer-encoding:\s*quoted-printable/i.test(head)) {
      bodyStr = bodyStr.replace(/=\r?\n/g, "");
      const arr = [];
      for (let i = 0; i < bodyStr.length; i++) {
        if (bodyStr[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(bodyStr.slice(i + 1, i + 3))) { arr.push(parseInt(bodyStr.slice(i + 1, i + 3), 16)); i += 2; }
        else arr.push(bodyStr.charCodeAt(i) & 0xff);
      }
      bytes = Buffer.from(arr);
    } else if (/content-transfer-encoding:\s*base64/i.test(head)) bytes = Buffer.from(bodyStr.replace(/\s+/g, ""), "base64");
    else bytes = Buffer.from(bodyStr, "latin1");
    const loc = head.match(/content-location:\s*(\S+)/i)?.[1];
    const html = decodeBytes(bytes, head.match(/charset="?([\w-]+)/i)?.[1]);
    return loc ? `<!-- saved from url=${loc} -->\n${html}` : html;
  }
  return null;
}

function savedSourceUrl(html) {
  return html.match(/saved from url=\(?\d*\)?\s*(https?:\/\/[^\s>]+)/i)?.[1]
    ?? html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](https?:[^"']+)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["'](https?:[^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
    ?? html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["'](https?:[^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["'](https?:[^"']+)["'][^>]+property=["']og:url["']/i)?.[1];
}

function loadSaved() {
  const map = new Map();
  if (!fs.existsSync(SAVED_DIR)) return map;
  // manual_inbox/urls.txt（「ファイル名 URL」）で出典URLを指定したファイルもある
  const overrides = new Map();
  const urlsTxt = path.join(SAVED_DIR, "..", "urls.txt");
  if (fs.existsSync(urlsTxt)) for (const line of fs.readFileSync(urlsTxt, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^(.+?)\s+(https?:\/\/\S+)$/);
    if (m) overrides.set(m[1], m[2]);
  }
  for (const f of fs.readdirSync(SAVED_DIR)) {
    if (!/\.(html?|mhtml?)$/i.test(f)) continue;
    try {
      const raw = fs.readFileSync(path.join(SAVED_DIR, f));
      const html = /\.mht/i.test(f) ? readMhtml(raw) : decodeBytes(raw);
      if (!html) continue;
      const url = overrides.get(f) ?? savedSourceUrl(html);
      if (url) map.set(normUrl(url), { file: f, html });
    } catch { /* 読めない保存ファイルは使わない */ }
  }
  return map;
}

/* ───────── robots.txt ───────── */

const robotsMem = new Map();
function parseRobots(txt) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (let line of txt.split(/\r?\n/)) {
    line = line.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === "allow" || key === "disallow") && val) cur.rules.push({ allow: key === "allow", path: val });
    }
  }
  return groups.filter((g) => g.agents.includes("*")).flatMap((g) => g.rules);
}
function robotsAllows(rules, url) {
  const u = new URL(url);
  const p = u.pathname + u.search;
  let best = null;
  for (const r of rules) {
    if (!r.re) {
      // * は任意の文字列、末尾の $ は終端。それ以外は文字どおり
      const anchored = r.path.endsWith("$");
      const body = anchored ? r.path.slice(0, -1) : r.path;
      r.re = new RegExp("^" + body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (anchored ? "$" : ""));
    }
    if (!r.re.test(p)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}
async function robotsFor(origin) {
  if (robotsMem.has(origin)) return robotsMem.get(origin);
  const file = path.join(ROBOTS, sha1(origin) + ".json");
  let rec = !REFRESH && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  if (!rec) {
    try {
      const res = await fetch(origin + "/robots.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
      rec = { origin, status: res.status, body: res.ok ? (await res.text()).slice(0, 500000) : "" };
    } catch (e) { rec = { origin, status: 0, body: "", error: String(e?.name ?? e) }; }
    fs.writeFileSync(file, JSON.stringify(rec));
  }
  // 取得できない robots.txt（404 など）は「制限なし」とみなす
  const rules = rec.status >= 200 && rec.status < 300 ? parseRobots(rec.body) : [];
  robotsMem.set(origin, rules);
  return rules;
}

/* ───────── ページ取得（キャッシュつき） ───────── */

const TRANSIENT = new Set(["timeout", "network", "5xx", "429"]);
function cachePaths(url) { const h = sha1(url); return { meta: path.join(CACHE, h + ".json"), html: path.join(CACHE, h + ".html") }; }

/** 戻り値 { ok, html?, finalUrl?, status, reason, kind, from: "cache"|"saved"|"net" } と、ネットに取りに行ったかどうか */
async function getPage(url, saved) {
  const sv = saved.get(normUrl(url));
  if (sv) return { page: { ok: true, html: sv.html, finalUrl: url, status: 200, reason: `手で保存したページ（${sv.file}）`, from: "saved" }, net: false };

  const cp = cachePaths(url);
  if (!REFRESH && fs.existsSync(cp.meta)) {
    const meta = JSON.parse(fs.readFileSync(cp.meta, "utf8"));
    if (!(RETRY_FAILED && !meta.ok)) {
      return { page: { ...meta, html: meta.ok ? fs.readFileSync(cp.html, "utf8") : undefined, from: "cache" }, net: false };
    }
  }
  const page = await fetchPage(url);
  const { html, ...meta } = page;
  meta.fetchedAt = new Date().toISOString();
  if (page.ok) fs.writeFileSync(cp.html, html);
  fs.writeFileSync(cp.meta, JSON.stringify({ url, ...meta }));
  return { page: { ...page, from: "net" }, net: page.kind !== "robots" };
}

async function fetchPage(url) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, status: 0, kind: "badurl", reason: "sourceUrl が不正" }; }
  if (/\.pdf$/i.test(u.pathname)) return { ok: false, status: 0, kind: "pdf", reason: "PDF" };
  const rules = await robotsFor(u.origin);
  if (!robotsAllows(rules, url)) return { ok: false, status: 0, kind: "robots", reason: "robots.txt で禁止されているパス" };

  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(3000 * attempt);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "Accept-Language": "ja,en;q=0.7" },
        signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow",
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.status === 429) { last = { ok: false, status: 429, kind: "429", reason: "アクセス拒否（429 リクエスト過多）" }; await res.body?.cancel(); continue; }
      if (res.status >= 500) { last = { ok: false, status: res.status, kind: "5xx", reason: `サーバーエラー（${res.status}）` }; await res.body?.cancel(); continue; }
      if (res.status === 401 || res.status === 403) { await res.body?.cancel(); return { ok: false, status: res.status, kind: "denied", reason: `アクセス拒否（${res.status}）` }; }
      if (res.status === 404 || res.status === 410) { await res.body?.cancel(); return { ok: false, status: res.status, kind: "notfound", reason: `ページがない（${res.status}）` }; }
      if (!res.ok) { await res.body?.cancel(); return { ok: false, status: res.status, kind: "http", reason: `HTTP ${res.status}` }; }
      if (/application\/pdf/i.test(ct)) { await res.body?.cancel(); return { ok: false, status: res.status, kind: "pdf", reason: "PDF" }; }
      if (ct && !/html|xml|text\/plain/i.test(ct)) { await res.body?.cancel(); return { ok: false, status: res.status, kind: "type", reason: `HTMLではない（${ct.split(";")[0]}）` }; }
      // 大きすぎるページは先頭だけ読む
      const chunks = []; let size = 0;
      for await (const chunk of res.body) { chunks.push(chunk); size += chunk.length; if (size > MAX_BYTES) break; }
      const buf = Buffer.concat(chunks);
      const html = decodeBytes(buf, ct.match(/charset=([\w-]+)/i)?.[1]);
      return { ok: true, status: res.status, finalUrl: res.url, html, kind: "ok", reason: "" };
    } catch (e) {
      const timeout = e?.name === "TimeoutError" || e?.name === "AbortError";
      last = { ok: false, status: 0, kind: timeout ? "timeout" : "network", reason: timeout ? "タイムアウト（20秒）" : `接続失敗（${e?.cause?.code ?? e?.name ?? "error"}）` };
    }
  }
  return last;
}

/* ───────── 1件の判定 ───────── */

const SOFT404 = /404|not\s*found|ページが見つかりません|お探しのページ|ページは存在しません|ページが存在しません|ページは削除|指定されたページ/i;

function judge(c, page) {
  const name = c.customer?.name ?? "";
  const base = { nums: "", cands: "" };
  const ex = excludedReason(name);
  if (ex) return { ...base, verdict: "対象外", reason: ex };
  if (!page.ok) return { ...base, verdict: "取得失敗", reason: page.reason };

  const p = parsePage(page.html);
  // 数字（判定には使わない）
  const tokens = [...new Set([...(c.results ?? []), ...(c.scale ?? [])].flatMap((r) => numberKeys(r?.value)))];
  const numHay = normNum([p.text, p.meta, p.script].join(" ")).replace(/\s+/g, "");
  const missing = tokens.filter((t) => !numHay.includes(t));
  const nums = missing.length ? `${missing.join(" / ")}（${tokens.length}件中${missing.length}件）` : "";

  const main = normName(p.text + " " + p.meta);
  const script = normName(p.script);
  const keys = nameKeys(name);
  const hit = keys.find((k) => main.includes(k));
  if (hit) return { ...base, nums, verdict: "一致", reason: page.from === "saved" ? page.reason : "" };
  const segs = nameSegments(name);
  if (segs.length && segs.every((s) => main.includes(s))) return { ...base, nums, verdict: "一致", reason: "空白で区切った各部分がページに出る" };
  const sHit = keys.find((k) => script.includes(k));
  if (sHit) return { ...base, nums, verdict: "一致", reason: "スクリプト内のデータに出る（JS描画のページ）" };
  const short = shortKeys(name);
  if (short.length && short.some((k) => normName(p.text + " " + p.meta, true).includes(k))) return { ...base, nums, verdict: "一致", reason: "法人格を含めて一致（中核が1文字の社名）" };

  // 取得はできたが中身がないページは、不一致ではなく取得失敗にする
  if (page.finalUrl && page.from !== "saved") {
    try {
      const a = new URL(c.sourceUrl), b = new URL(page.finalUrl);
      if (/^\/?(index\.\w+)?$/.test(b.pathname) && !/^\/?(index\.\w+)?$/.test(a.pathname)) return { ...base, verdict: "取得失敗", reason: `トップページへ転送された（${b.href}）` };
      // 事例ページが別のページ（移転先の商品ページ・一覧など）へ転送されている。そのページに社名が無くても誤りとは言えない
      if (normUrl(a.href) !== normUrl(b.href) && normUrl(decodeURI(a.href)) !== normUrl(decodeURI(b.href))) return { ...base, verdict: "取得失敗", reason: `別のページへ転送された（${b.href}）` };
    } catch { /* noop */ }
  }
  if (SOFT404.test(p.title) || p.h1.some((h) => SOFT404.test(h) && h.length < 40)) return { ...base, verdict: "取得失敗", reason: "ページが見つからない（ソフト404）" };
  if (p.text.replace(/\s+/g, "").length < 300) return { ...base, verdict: "取得失敗", reason: "本文がほぼ空（JavaScriptで描画するページの可能性）" };

  return { ...base, nums, verdict: "不一致", reason: "社名がページに出てこない", cands: candidates(p).join(" / ") };
}

/* ───────── 実行 ───────── */

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const blocked = new Set(read("data/blocked_vendors.json").vendors.map((v) => v.domain));
const linkOnlyVendors = new Set(read("data/link_only_vendors.json").vendors.map((v) => v.domain));
const all = JSON.parse(fs.readFileSync(INPUT ? path.resolve(INPUT) : path.join(ROOT, "data/cases.json"), "utf8"));

let targets = all.filter((c) => !blocked.has(c.vendor));
const nBlocked = all.length - targets.length;
if (VENDOR) targets = targets.filter((c) => c.vendor === VENDOR || c.vendor === VENDOR.replace(/^www\./, ""));
if (IDS) targets = targets.filter((c) => IDS.has(c.id));
if (LIMIT) targets = targets.slice(0, LIMIT);
if (IDS && targets.length < IDS.size) {
  const got = new Set(targets.map((c) => c.id));
  console.error(`見つからない（または掲載禁止の提供元）: ${[...IDS].filter((i) => !got.has(i)).join(", ")}`);
}

const stateOf = (c) => (c.hidden ? "非表示" : c.linkOnly || linkOnlyVendors.has(c.vendor) ? "リンクのみ" : "公開");
const saved = loadSaved();
console.log(`照合 ${targets.length} 件（掲載禁止の提供元 ${nBlocked} 件は除外）／手で保存したページ ${saved.size} 件／出力 ${path.relative(ROOT, OUT)}`);

// ホストごとに並べ、ホストの中は1件ずつ（同時1接続・1〜2秒間隔）。件数の多いホストから始めて、最後に長い1社だけが残るのを避ける
const byHost = new Map();
const results = new Map();
for (const c of targets) {
  if (excludedReason(c.customer?.name) && !FETCH_EXCLUDED) { results.set(c.id, judge(c, { ok: false })); continue; }
  let host = "";
  try { host = new URL(c.sourceUrl).host.toLowerCase(); } catch { results.set(c.id, { verdict: "取得失敗", reason: "sourceUrl が不正・空", nums: "", cands: "" }); continue; }
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push(c);
}
const hosts = [...byHost.entries()].sort((a, b) => b[1].length - a[1].length);

const total = targets.length;
const counts = { 一致: 0, 不一致: 0, 取得失敗: 0, 対象外: 0 };
for (const r of results.values()) counts[r.verdict]++;
let done = results.size, nNet = 0;
const t0 = Date.now();
let lastLog = 0;
function progress(force = false) {
  const now = Date.now();
  if (!force && now - lastLog < 30000) return;
  lastLog = now;
  const el = (now - t0) / 1000;
  const rate = done / Math.max(el, 1);
  const eta = rate > 0 ? (total - done) / rate : 0;
  console.log(`  ${done}/${total}  一致 ${counts.一致}・不一致 ${counts.不一致}・取得失敗 ${counts.取得失敗}・対象外 ${counts.対象外}  （取得 ${nNet} 回、経過 ${Math.round(el / 60)}分、残り約 ${Math.round(eta / 60)}分）`);
}

async function worker() {
  for (;;) {
    const next = hosts.shift();
    if (!next) return;
    const [, list] = next;
    for (const c of list) {
      let r;
      try {
        const { page, net } = await getPage(c.sourceUrl, saved);
        r = judge(c, page);
        if (net) { nNet++; await sleep(1000 + Math.random() * 1000); }
      } catch (e) {
        r = { verdict: "取得失敗", reason: `照合中のエラー（${e?.message ?? e}）`, nums: "", cands: "" };
      }
      results.set(c.id, r);
      counts[r.verdict]++;
      done++;
      progress();
    }
  }
}
await Promise.all(Array.from({ length: PARALLEL }, worker));
progress(true);

/* ───────── 出力 ───────── */

const esc = (v) => { const s = String(v ?? ""); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const header = ["id", "提供元", "社名", "判定", "理由", "社名の候補", "数字の不一致", "sourceUrl", "現在の状態"];
const lines = [header.join(",")];
for (const c of targets) {
  const r = results.get(c.id);
  lines.push([c.id, c.vendor, c.customer?.name ?? "", r.verdict, r.reason, r.cands, r.nums, c.sourceUrl, stateOf(c)].map(esc).join(","));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, "﻿" + lines.join("\r\n") + "\r\n");

console.log(`\n■ 判定ごとの件数（${total} 件）`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(4, "　")} ${String(v).padStart(6)}`);
const failKinds = new Map();
for (const r of results.values()) if (r.verdict === "取得失敗") { const k = r.reason.replace(/（.*$/, ""); failKinds.set(k, (failKinds.get(k) ?? 0) + 1); }
if (failKinds.size) {
  console.log("  取得失敗の内訳: " + [...failKinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("、"));
}
const nNumMiss = [...results.values()].filter((r) => r.nums).length;
console.log(`  数字の要確認（ページに出てこない数字が1つ以上）: ${nNumMiss} 件`);

const byVendor = new Map();
for (const c of targets) if (results.get(c.id).verdict === "不一致") byVendor.set(c.vendor, (byVendor.get(c.vendor) ?? 0) + 1);
if (byVendor.size) {
  console.log("\n■ 提供元ごとの不一致（多い順・上位20）");
  for (const [v, n] of [...byVendor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const all = targets.filter((c) => c.vendor === v).length;
    console.log(`  ${String(n).padStart(5)} / ${String(all).padEnd(5)} ${v}`);
  }
}
const cross = (state, verdict) => targets.filter((c) => stateOf(c) === state && results.get(c.id).verdict === verdict).length;
console.log(`\n■ 状態との突き合わせ`);
console.log(`  リンクのみ で「一致」（公開に戻せる候補）: ${cross("リンクのみ", "一致")} 件`);
console.log(`  公開中 で「不一致」（すぐ対処が要るもの）: ${cross("公開", "不一致")} 件`);
console.log(`\nCSV → ${OUT}`);

if (INPUT && counts.不一致 > 0) process.exitCode = 1;
