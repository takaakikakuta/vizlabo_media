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

const SITE = "https://main.d1aevqtzq18hw.amplifyapp.com";

/** 訪問者へ送るサジェストメールの本文 */
export function buildSuggestMail(url: string, p: CompanyProfile, s: Suggestions): string {
  const line = (c: CaseStudy) => {
    const r = c.results.find((x) => /\d/.test(x.value)) ?? c.results[0];
    const stat = r ? `【${r.metric}: ${r.value}】` : "";
    return `■ ${c.title}\n  ${c.customer.name || "導入企業非公開"}（${industryLabel(c.customer.industry)}）${stat}\n  ${SITE}/cases/${c.id}`;
  };
  const parts = [
    "事例naviをご利用いただきありがとうございます。",
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
    "BtoB導入事例メディア「事例navi」",
  );
  return parts.join("\n");
}
