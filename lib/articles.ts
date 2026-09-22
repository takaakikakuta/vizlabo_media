import fs from "node:fs";
import path from "node:path";

/* オリジナル記事の読み込み。
   記事＝「型テンプレート（components/articles/*）」×「編集データ（content/articles/*.json）」。
   ここに保存するのは“書かれた部分”だけ。件数・引用・分布などの“計算される部分”は
   テンプレートが cases.json からビルド時に組み立てる（事例が増えれば記事も追随する）。 */

/* ── 型1：分かれ道（事例解体新書） ── */
export type WakaremichiSide = {
  id: string;           // 事例ID（引用・数字はここから引く）
  path: string;         // 選んだ道の名前（例: 読む機械）
  pathNote: string;
  decisionLabel: string;
};

export type WakaremichiArticle = {
  format: "wakaremichi";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（未設定なら記事内の事例画像に自動フォールバック）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  title: string[];      // 行ごと（改行位置は編集判断なので配列で持つ）
  lead: string;
  caseA: WakaremichiSide;
  caseB: WakaremichiSide;
  sharedNote: string;
  readings: { title: string; body: string }[];
  verification: { caseId: string; intro: string; outro: string };
  questions: { q: string; a: string }[];
  pathLists: { title: string; categories: string[]; tags: string[] }[];
  closing: string;
  ctaTag: string;
};

/* ── 型2：導入の現場から（1事例を事例群と照らし、特徴と参考になる条件を読む） ── */
export type GenbaArticle = {
  format: "genba";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（未設定なら記事内事例の画像に自動フォールバック）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  axisId: string;         // 軸事例のID。カルテ・分布・関連事例はここから計算
  title: string[];
  subtitle: string;
  lead: string;           // 事例群から生まれた「問い」で締める（全文書き下ろし）
  paths: { label: string; body: string; caseIds?: string[] }[];  // 一 同じ課題への、いくつかの道
  pathsNote?: string;     // 一の締め（任意）
  axisNote: string;       // 二 軸事例の紹介（問いに必要な範囲）
  features: { title: string; body: string }[];   // 三 特徴の読み（論点数は根拠に合わせる）
  fitIntro: string;       // 四 導入文
  fitConditions: { label: string; body: string }[];  // 四 参考になる条件
  fitCaution: string;     // 四 追加確認・公開情報の限界
  checklist: string[];    // 五 自社と照らす点検項目
  closing: string;        // 結び＝冒頭の問いへの答え
};

/* ── 型3：アンソロジー（導入前の日本） ── */
export type DounyumaeQuote = {
  caseId: string;   // 出典事例。業種・規模・リンクはここから描画する
  text: string;     // 引用本文。speech / article は原典と照合済みの実文を原文のまま入れる
  kind: "speech" | "article" | "summary";  // 当事者の発言 / 原典記事の記述 / 当サイトの課題要約
};

export type DounyumaeArticle = {
  format: "dounyumae";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（未設定なら記事内の事例画像に自動フォールバック）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  axisTag: string;        // 対象の困りごとタグ。該当件数・業種数・分布・導線はここから計算
  title: string[];
  lead: string;
  sourceNote: string;     // 素材の性質の明示（扉直下の枠。公開事例の課題パートである旨など）
  baselineNote: string;   // 対象範囲の節に出す編集メモ（集計基準日・読んだ件数・照合の経緯）
  phrases?: { label: string; pattern: string }[];  // 任意。当サイトの課題要約に表現を含む「事例数」で集計
  types: { title: string; body: string; quotes: DounyumaeQuote[] }[];
  spreadBody?: string;    // 任意。「業種・規模を越えた記述の重なり」の本文
  exitsIntro: string;     // 「各社が変えたこと」の導入文
  exits: { label: string; body: string; caseIds: string[] }[];  // 変更内容を入口にした出口（施策確認済み）
  closingLines: string[]; // 結び（行ごと）
};

/* ── 型4：課題の攻略地図（1つの悩みタグに対する「手の入れ方」の全体像） ── */
export type ChizuArticle = {
  format: "chizu";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（chizu型は事例画像への自動フォールバックなし）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  axisTag: string;        // 対象の困りごとタグ。該当件数・業種数・分布・一覧導線はここから計算
  title: string[];
  lead: string;
  scopeNote: string;      // 一 この記事で扱う悩みの輪郭（タグの中で対象を絞る場合の断りを含む）
  routes: { label: string; body: string; caseIds: string[] }[];  // 二 手の入れ方の地図（業務のどこを変える道か＋代表事例）
  routesNote?: string;    // 二の締め（併用可能・網羅でないことの断り）
  startPoints: { label: string; body: string }[];  // 三 自社ではどこから調べるか
  closing: string;
};

/* ── 型5：業界を越える事例（一見遠い2つの現場を、共通する仕事の構造でつなぐ） ── */
export type EkkyouScene = {
  id: string;           // 事例ID（カルテ・課題文の引用はここから引く）
  sceneLabel: string;   // 現場の呼び名（例: 建設の現場）
  sceneNote: string;    // その現場で何が起きていたか（書き下ろしの要約）
};

export type EkkyouArticle = {
  format: "ekkyou";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（未設定なら記事内の事例画像に自動フォールバック）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  title: string[];
  lead: string;
  caseA: EkkyouScene;
  caseB: EkkyouScene;
  structureIntro: string;   // 二 共通する仕事の構造の導入文
  structure: { label: string; a: string; b: string }[];  // 構造の対応表（誰から誰へ／何を／いつ／途切れる場所）
  structureNote?: string;   // 対応表の締め（比較上の重要な違いの断りなど）
  borrows: { title: string; body: string }[];  // 三 異業種から借りられる工夫
  limits: { label: string; body: string }[];   // 四 そのまま持ち込めない条件
  closing: string;
};

/* ── 型6：導入の舞台裏（事例群の導入・定着の記述を横断し、実行の備えを渡す） ── */
export type ButaiuraArticle = {
  format: "butaiura";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（butaiura型は事例画像への自動フォールバックなし）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  title: string[];
  lead: string;
  scopeNote: string;    // どの事例群の、どの記述を読んだか（対象範囲の明示）
  walls: { label: string; body: string; caseIds?: string[] }[];       // 一 導入時にぶつかった壁
  approaches: { label: string; body: string; caseIds: string[] }[];   // 二 各社が取った対応（選択肢として）
  conditions: { label: string; body: string }[];  // 三 対応が違った条件（読める範囲で）
  conditionsNote?: string;  // 三の締め（限界の断り）
  prep: { label: string; body: string }[];        // 四 自社で準備すること
  closing: string;
};

/* ── 型7：選（テーマ別の事例10選。順位ではなく並列の「選」） ── */
export type SenArticle = {
  format: "sen";
  sponsored?: boolean;  // タイアップ（PR）記事か。未指定＝編集記事
  thumbnail?: string;   // 一覧・トップで使うサムネイル（未設定なら先頭事例の画像に自動フォールバック）
  slug: string;
  no: number;
  series: string;
  publishedAt: string;
  title: string[];
  lead: string;
  criteriaNote: string;   // 選定基準と範囲の明示（母数・基準・順位でないこと）
  items: { caseId: string; headline: string; body: string }[];  // 10本（headline＝見出し、body＝読みどころ2〜3文）
  outroTitle: string;     // まとめの見出し
  outro: string;          // まとめ本文（並べて見えたこと・次の一歩）
  relatedSlugs?: string[]; // 関連する解体新書記事
};

/* 全型共通の任意フィールド。hidden: true で一覧・個別ページとも非公開（データは残る） */
type ArticleCommon = { hidden?: boolean };

export type Article = (
  | WakaremichiArticle
  | GenbaArticle
  | DounyumaeArticle
  | ChizuArticle
  | EkkyouArticle
  | ButaiuraArticle
  | SenArticle
) & ArticleCommon;

const DIR = path.join(process.cwd(), "content", "articles");

export function allArticles(): Article[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8")) as Article)
    .filter((a) => !a.hidden)  // hidden は公開面から完全に外す
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.no - a.no);
}

export function getArticle(slug: string): Article | undefined {
  return allArticles().find((a) => a.slug === slug);
}

import { getCase } from "./cases";

/** 記事で取り上げた事例のID（型ごとの掲載順・重複なし）。末尾のサービス紹介と一括問い合わせが使う。 */
export function articleCaseIds(a: Article): string[] {
  let ids: string[] = [];
  switch (a.format) {
    case "wakaremichi":
      ids = [a.caseA.id, a.caseB.id, a.verification.caseId];
      break;
    case "genba":
      ids = [a.axisId, ...a.paths.flatMap((p) => p.caseIds ?? [])];
      break;
    case "dounyumae":
      ids = [...a.types.flatMap((t) => t.quotes.map((q) => q.caseId)), ...a.exits.flatMap((x) => x.caseIds)];
      break;
    case "chizu":
      ids = a.routes.flatMap((r) => r.caseIds);
      break;
    case "ekkyou":
      ids = [a.caseA.id, a.caseB.id];
      break;
    case "butaiura":
      ids = [...a.walls.flatMap((w) => w.caseIds ?? []), ...a.approaches.flatMap((x) => x.caseIds)];
      break;
    case "sen":
      ids = a.items.map((x) => x.caseId);
      break;
  }
  return [...new Set(ids)].filter(Boolean);
}

/** 記事に登場したサービス（製品×提供元で重複を除いたもの）。紹介は掲載データの範囲で行う。 */
export type ArticleService = {
  name: string;      // サービス名（productが無い事例はベンダードメイン表記）
  vendor: string;    // ベンダードメイン
  category: string;  // productCategory
  caseId: string;    // 記事内の代表事例（初出）
};

export function articleServices(a: Article): ArticleService[] {
  const out: ArticleService[] = [];
  const seen = new Set<string>();
  for (const id of articleCaseIds(a)) {
    const c = getCase(id);
    if (!c) continue;
    const name = (c.product || c.vendor).split(/[（(]/)[0].trim();
    const key = `${c.vendor}｜${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, vendor: c.vendor, category: c.productCategory, caseId: c.id });
  }
  return out;
}

/** 記事のサムネイル。明示指定 > public/thumbnail/<連番>.png（置くだけで反映） > 記事内の主要事例の og:image。 */
export function articleThumb(a: Article): string | undefined {
  if (a.thumbnail) return a.thumbnail;
  const file = `${String(a.no).padStart(3, "0")}.png`;
  if (fs.existsSync(path.join(process.cwd(), "public", "thumbnail", file))) return `/thumbnail/${file}`;
  if (a.format === "wakaremichi") return getCase(a.caseA.id)?.image ?? getCase(a.caseB.id)?.image;
  if (a.format === "genba") return getCase(a.axisId)?.image;
  if (a.format === "ekkyou") return getCase(a.caseA.id)?.image ?? getCase(a.caseB.id)?.image;
  if (a.format === "sen") return a.items.map((x) => getCase(x.caseId)?.image).find(Boolean);
  return undefined;
}
