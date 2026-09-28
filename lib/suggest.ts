import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { allCases, tagCounts } from "./cases";
import { INDUSTRIES, industryLabel } from "./taxonomy";
import type { CaseStudy } from "./types";
import { searchKey } from "../components/CaseGrid";

/* 「会社URLを入れると、似た事例をメールでサジェストする」機能の頭脳部分。
   1) 相手サイトを取得してテキスト化
   2) Bedrock(Haiku)で業種・困りごと・キーワードを推定（当サイトの語彙にマッピング）
   3) 掲載事例をスコアリングして「同業の事例」「同じ困りごとの事例」を選ぶ

   認証: 本番SSRはAWS既定チェーンが使えないため、APP_AWS_* をnext.configでビルド時に
   焼き込んで渡す（vizlabo_xと同方式）。ローカルは既定チェーン（~/.aws）で動く。 */

const MODEL = process.env.BEDROCK_MODEL_ID || "global.anthropic.claude-haiku-4-5-20251001-v1:0";

function bedrock() {
  const id = process.env.APP_AWS_ACCESS_KEY_ID;
  const secret = process.env.APP_AWS_SECRET_ACCESS_KEY;
  return new BedrockRuntimeClient({
    region: "ap-northeast-1",
    ...(id && secret ? { credentials: { accessKeyId: id, secretAccessKey: secret } } : {}),
  });
}

export type CompanyProfile = {
  summary: string;      // 何の会社か（1文）
  industry: string;     // 当サイトの業種slug
  tags: string[];       // 当サイトの困りごとタグから最大5つ
  keywords: string[];   // 事例検索用キーワード（3〜6語）
};

/** 相手サイトを取得して本文テキストに落とす（6秒であきらめる） */
export async function fetchSiteText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; jirei-navi/1.0; +https://main.d1aevqtzq18hw.amplifyapp.com)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 100) throw new Error("本文が取得できませんでした");
    return text.slice(0, 4000);
  } finally {
    clearTimeout(timer);
  }
}

/** サイト本文から会社プロフィールを推定（当サイトの語彙へマッピング） */
export async function analyzeCompany(siteText: string): Promise<CompanyProfile> {
  const industries = INDUSTRIES.map((i) => `${i.slug}（${i.label}）`).join(", ");
  const topTags = tagCounts().slice(0, 60).map(([t]) => t).join(", ");

  const prompt = [
    "あなたはBtoB導入事例データベースの分析係です。以下の会社サイトの本文から、この会社のプロフィールを推定してください。",
    "必ず次のJSONだけを出力してください（説明文は不要）:",
    `{"summary":"何をしている会社かを50字以内で","industry":"次のslugから最も近い1つ: ${industries}","tags":["次の語彙から、この会社が抱えていそうな業務課題を最大5つ: ${topTags}"],"keywords":["この会社に似た導入事例を探すための検索語を3〜6個（業種名・業務名など短い日本語）"]}`,
    "--- サイト本文 ---",
    siteText,
  ].join("\n");

  const res = await bedrock().send(new ConverseCommand({
    modelId: MODEL,
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 500, temperature: 0 },
  }));
  const out = res.output?.message?.content?.[0]?.text ?? "";
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("分析結果を解析できませんでした");
  const j = JSON.parse(m[0]);
  return {
    summary: String(j.summary ?? "").slice(0, 80),
    industry: String(j.industry ?? "").split("（")[0].trim(),
    tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 5) : [],
    keywords: Array.isArray(j.keywords) ? j.keywords.map(String).slice(0, 6) : [],
  };
}

export type Suggestions = {
  sameIndustry: CaseStudy[];  // 同業の会社が何かを解決した事例
  similar: CaseStudy[];       // 業種は違うが同じ困りごとの事例
};

/** プロフィールに近い事例を選ぶ（数値成果あり優先） */
export function matchCases(p: CompanyProfile): Suggestions {
  const kws = p.keywords.map((k) => k.toLowerCase()).filter(Boolean);
  const scored = allCases().map((c) => {
    const hay = searchKey(c);
    let score = 0;
    const sameInd = c.customer.industry === p.industry;
    if (sameInd) score += 3;
    for (const t of p.tags) if ((c.tags ?? []).includes(t)) score += 2;
    for (const k of kws) if (hay.includes(k)) score += 1;
    if (c.hasNumbers) score += 1;
    if (c.image) score += 0.2;
    return { c, score, sameInd };
  }).filter((x) => x.score > 1);

  scored.sort((a, b) => b.score - a.score);
  const usedVendors = new Set<string>();
  const pick = (arr: typeof scored, n: number) => {
    const out: CaseStudy[] = [];
    for (const x of arr) {
      if (out.length >= n) break;
      if (usedVendors.has(x.c.vendor)) continue;  // 同一ベンダーに偏らせない
      usedVendors.add(x.c.vendor);
      out.push(x.c);
    }
    return out;
  };
  const sameIndustry = pick(scored.filter((x) => x.sameInd), 4);
  const similar = pick(scored.filter((x) => !x.sameInd), 4);
  return { sameIndustry, similar };
}

const SITE = "https://vizlabo.com";

/** 訪問者へ送るサジェストメールの本文 */
export function buildSuggestMail(url: string, p: CompanyProfile, s: Suggestions): string {
  const line = (c: CaseStudy) => {
    const r = c.results.find((x) => /\d/.test(x.value)) ?? c.results[0];
    const stat = r ? `【${r.metric}: ${r.value}】` : "";
    return `■ ${c.title}\n  ${c.customer.name || "導入企業非公開"}（${industryLabel(c.customer.industry)}）${stat}\n  ${SITE}/cases/${c.id}`;
  };
  const parts = [
    "事例マニアをご利用いただきありがとうございます。",
    `ご入力いただいたサイト（${url}）をAIが拝見し、`,
    `「${p.summary}」と理解しました。掲載${allCases().length}件の事例から、貴社に近いものをお送りします。`,
    "",
  ];
  if (s.sameIndustry.length) {
    parts.push(`▼ 同じ業界（${industryLabel(p.industry)}）の会社が解決した事例`, "", ...s.sameIndustry.map(line), "");
  }
  if (s.similar.length) {
    parts.push("▼ 業界は違っても、同じ困りごとを解決した事例", "", ...s.similar.map(line), "");
  }
  parts.push(
    "────────────────",
    "もっと探す（課題・業種・困りごとから検索できます）",
    `${SITE}/cases`,
    "",
    "毎週金曜、事例セレクション5本を届けるメルマガもあります",
    `${SITE}/newsletter`,
    "",
    "※本メールはご入力いただいたアドレスに1回だけお送りしています。",
    "※内容へのご質問・配信のご要望は、このメールへの返信でどうぞ。",
    "",
    "BtoB導入事例メディア「事例マニア」",
  );
  return parts.join("\n");
}

/* ── HTMLメール版 ──
   メールクライアント互換のため、スタイルはすべてインライン・構造は素直なdivで組む。
   サイトの誌面トーン（インク色・罫線・成果数字の強調）を踏襲。 */

const C = {
  ink: "#1a1a1a",
  body: "#374151",
  muted: "#6b7280",
  line: "#e5e1da",
  soft: "#f7f5f1",
  accent: "#e2590b",
  bg: "#fdfcfa",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function caseCardHtml(c: CaseStudy): string {
  const r = c.results.find((x) => /\d/.test(x.value)) ?? c.results[0];
  const stat = r
    ? `<div style="margin-top:6px;font-size:12px;color:${C.muted};">${esc(r.metric)}：<span style="color:${C.accent};font-weight:bold;font-size:14px;">${esc(r.value)}</span></div>`
    : "";
  return `
  <div style="border-bottom:1px solid ${C.line};padding:14px 0;">
    <a href="${SITE}/cases/${c.id}" style="color:${C.ink};font-size:14px;font-weight:bold;line-height:1.6;text-decoration:none;">${esc(c.title)}</a>
    <div style="margin-top:4px;font-size:12px;color:${C.muted};">${esc(c.customer.name || "導入企業非公開")}（${esc(industryLabel(c.customer.industry))}）</div>
    ${stat}
    <div style="margin-top:8px;"><a href="${SITE}/cases/${c.id}" style="font-size:12px;color:${C.ink};text-decoration:underline;">この事例の詳細を読む →</a></div>
  </div>`;
}

function sectionHtml(label: string, cs: CaseStudy[]): string {
  if (!cs.length) return "";
  return `
  <div style="margin-top:28px;">
    <div style="font-size:11px;font-weight:bold;letter-spacing:.18em;color:${C.muted};border-bottom:2px solid ${C.ink};padding-bottom:8px;">${esc(label)}</div>
    ${cs.map(caseCardHtml).join("")}
  </div>`;
}

/** 訪問者へ送るサジェストメール（HTML版） */
export function buildSuggestMailHtml(url: string, p: CompanyProfile, s: Suggestions): string {
  return `<!doctype html>
<html lang="ja"><body style="margin:0;padding:0;background:${C.bg};">
<div style="max-width:600px;margin:0 auto;padding:28px 20px;font-family:-apple-system,'Hiragino Sans','Yu Gothic',Meiryo,sans-serif;color:${C.body};">

  <div style="border-top:3px solid ${C.ink};padding-top:16px;">
    <a href="${SITE}" style="text-decoration:none;color:${C.ink};font-size:18px;font-weight:bold;letter-spacing:.08em;">事例マニア</a>
    <span style="font-size:10px;color:${C.muted};letter-spacing:.14em;margin-left:10px;">BtoB導入事例データベース</span>
  </div>

  <p style="margin:24px 0 0;font-size:13.5px;line-height:2;">
    事例マニアのAI事例サジェストをご利用いただきありがとうございます。<br>
    ご入力いただいたサイトを拝見し、貴社を
  </p>
  <div style="margin-top:12px;border:1px solid ${C.line};background:${C.soft};padding:14px 16px;font-size:14px;font-weight:bold;color:${C.ink};line-height:1.8;">
    「${esc(p.summary)}」
  </div>
  <p style="margin:12px 0 0;font-size:13.5px;line-height:2;">
    と理解しました。掲載事例の中から、貴社に近いものをお送りします。
  </p>

  ${sectionHtml(`同じ業界（${industryLabel(p.industry)}）の会社が解決した事例`, s.sameIndustry)}
  ${sectionHtml("業界は違っても、同じ困りごとを解決した事例", s.similar)}

  <div style="margin-top:32px;text-align:center;">
    <a href="${SITE}/cases" style="display:inline-block;background:${C.ink};color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;padding:12px 28px;">もっと事例を探す →</a>
    <div style="margin-top:10px;font-size:11.5px;color:${C.muted};">課題・業種・困りごとから検索できます</div>
  </div>

  <div style="margin-top:32px;border:1px solid ${C.line};padding:16px;text-align:center;">
    <div style="font-size:13px;font-weight:bold;color:${C.ink};">週刊 事例マニア（毎週金曜配信）</div>
    <div style="margin-top:6px;font-size:12px;color:${C.body};line-height:1.9;">事例セレクション5本と、note連載2本をメールで届けます</div>
    <a href="${SITE}/newsletter" style="display:inline-block;margin-top:10px;font-size:12.5px;color:${C.ink};text-decoration:underline;">メルマガの内容を見る →</a>
  </div>

  <div style="margin-top:28px;border-top:1px solid ${C.line};padding-top:14px;font-size:11px;color:${C.muted};line-height:1.9;">
    ※本メールはご入力いただいたアドレスに1回だけお送りしています。<br>
    ※内容へのご質問・配信のご要望は、このメールへの返信でどうぞ。<br>
    BtoB導入事例メディア「事例マニア」 <a href="${SITE}" style="color:${C.muted};">${SITE.replace("https://", "")}</a>
  </div>
</div>
</body></html>`;
}
