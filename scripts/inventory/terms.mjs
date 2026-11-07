#!/usr/bin/env node
/* 「事例でわかる技術用語」の用語候補を数える。
 *   node scripts/inventory/terms.mjs   → content/articles/TERMS.md を書き出す
 * 用語（検索語）ごとに、product/title/summary/actions/tags に出る事例を数え、30件以上は業種で割る。
 * 事例件数 = 素材級（課題文80字以上かつ、数値成果あり or 施策80字以上）で導入企業名が公開のもの。
 * hidden・linkOnly・掲載禁止ベンダーは除外。用語を足すときは TERMS に [表示名, 想定検索クエリ, 正規表現] を1行足す。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read=(p)=>JSON.parse(fs.readFileSync(ROOT+"/"+p,"utf8"));
const blocked=new Set(read("data/blocked_vendors.json").vendors.map(v=>v.domain));
const cases=read("data/cases.json").filter(c=>!c.hidden&&!c.linkOnly&&!c.sample&&!blocked.has(c.vendor));
const facets=read("data/case_facets.json");
const IND={manufacturing:"製造業",it:"IT・ソフトウェア",construction:"建設・不動産",logistics:"物流・運輸",medical:"医療・介護",finance:"金融・保険",retail:"小売・EC",food:"飲食・食品",education:"教育",["hr-service"]:"人材サービス",public:"自治体・公共",energy:"エネルギー・環境",["other-industry"]:"その他"};
const sozai=(c)=>(c.challengeDetail||"").length>=80&&(c.hasNumbers||(c.actions||"").length>=80);
const L=(s)=>`(?<![A-Za-z])(?:${s})(?![A-Za-z])`;
const TERMS=[
["ERP・基幹システム","ERPとは",L("ERP")+"|基幹システム"],
["給与計算システム","給与計算システムとは","給与計算"],
["勤怠管理システム","勤怠管理システムとは","勤怠管理"],
["ローコード・ノーコード","ノーコードとは／ローコードとは","ローコード|ノーコード|"+L("kintone")+"|キントーン"],
["BPO","BPOとは",L("BPO")+"|アウトソーシング"],
["グループウェア","グループウェアとは","グループウェア|"+L("Google Workspace|Microsoft 365")],
["クラウドPBX・CTI","クラウドPBXとは／CTIとは","クラウドPBX|"+L("PBX|CTI")],
["QRコード・バーコード","QRコード 在庫管理","QRコード|バーコード|二次元コード"],
["経費精算システム","経費精算システムとは","経費精算"],
["BIツール","BIツールとは",L("BI|BIツール|Tableau|Power BI|Looker")+"|ダッシュボード"],
["CRM","CRMとは",L("CRM")+"|顧客管理システム"],
["SSO・IDaaS","SSOとは／IDaaSとは",L("SSO|IDaaS")+"|シングルサインオン|ID管理"],
["生成AI","生成AIとは 業務",L("ChatGPT|LLM|Copilot|GPT-?4o?")+"|生成AI|大規模言語モデル"],
["ビジネスチャット","ビジネスチャットとは","ビジネスチャット|"+L("Slack|Teams|Chatwork|LINE WORKS")],
["eラーニング・LMS","LMSとは",L("LMS")+"|eラーニング|学習管理システム"],
["MDM（端末管理）","MDMとは",L("MDM")+"|端末管理|デバイス管理"],
["IoT","IoTとは",L("IoT")],
["バックアップ・DR","DRとは（災害復旧）",L("DR")+"|ディザスタリカバリ|バックアップ"],
["iPaaS・データ連携","iPaaSとは／API連携",L("ETL|iPaaS|API")+"連携?|データ連携ツール"],
["電子契約・電子署名","電子契約とは","電子契約|電子署名|クラウドサイン|電子サイン"],
["人事評価システム","人事評価システムとは","人事評価"],
["VPN・SD-WAN","SD-WANとは",L("VPN|SD-WAN")],
["MEO・SEO","MEOとは／SEOとは",L("SEO|MEO")],
["DWH・データ基盤","DWHとは／データ基盤",L("DWH|BigQuery|Snowflake")+"|データウェアハウス|データ基盤|データレイク"],
["RPA","RPAとは",L("RPA")+"|ロボティック・?プロセス"],
["労務管理システム","労務管理システムとは","労務管理|"+L("SmartHR")+"|年末調整"],
["POSレジ・セルフレジ","セルフレジとは",L("POS")+"|セルフレジ|セミセルフ"],
["販売管理システム","販売管理システムとは","販売管理"],
["GPS・動態管理","動態管理とは",L("GPS")+"|動態管理|位置情報"],
["ワークフローシステム","ワークフローシステムとは","ワークフローシステム|電子決裁|電子承認"],
["タレントマネジメント","タレントマネジメントとは","タレントマネジメント"],
["電子日報","日報アプリ","日報"],
["AI-OCR","AI-OCRとは",L("AI-?OCR|AI OCR")],
["チャットボット","チャットボットとは","チャットボット|"+L("chatbot")],
["デジタルサイネージ","デジタルサイネージとは","デジタルサイネージ|サイネージ"],
["MA（マーケティングオートメーション）","MAツールとは","マーケティングオートメーション|"+L("MA|MAツール")],
["ボイスボット・IVR","ボイスボットとは／IVRとは","ボイスボット|音声ボット|電話自動応答|"+L("IVR")],
["CAD・CAM","3D CADとは",L("CAD|CAM|3D ?CAD")],
["シフト管理システム","シフト管理システムとは","シフト管理|シフト作成"],
["RFID","RFIDとは",L("RFID")+"|ICタグ"],
["原価管理システム","原価管理システムとは","原価管理"],
["請求書電子化・インボイス","請求書 電子化とは","請求書.{0,4}電子|電子請求|インボイス制度|電子帳簿保存法"],
["ピッキングシステム","デジタルピッキングとは","ピッキング"],
["FAQシステム・ナレッジベース","FAQシステムとは","FAQシステム|ナレッジベース|ナレッジ共有|社内wiki"],
["ゼロトラスト","ゼロトラストとは","ゼロトラスト"],
["Web予約システム","予約システムとは","予約システム|Web予約|オンライン予約"],
["SFA","SFAとは",L("SFA")+"|営業支援システム"],
["生産管理システム","生産管理システムとは","生産管理システム"],
["音声認識・AI文字起こし","音声認識とは／AI文字起こし","音声認識|文字起こし|書き起こし"],
["AR・VR・MR","AR とは 業務",L("AR|VR|MR|xR|XR")+"|拡張現実|仮想現実|複合現実"],
["VDI・DaaS","VDIとは",L("VDI|DaaS")+"|仮想デスクトップ"],
["標的型メール訓練","標的型メール訓練とは","標的型.{0,4}訓練|セキュリティ教育|セキュリティ研修"],
["RAG","RAGとは",L("RAG")+"|検索拡張生成"],
["遠隔監視・遠隔臨場","遠隔臨場とは","遠隔監視|遠隔臨場|遠隔点検"],
["予知保全・異常検知","予知保全とは","予知保全|予兆保全|異常検知|状態監視"],
["エンゲージメントサーベイ","エンゲージメントサーベイとは","エンゲージメント.{0,5}(サーベイ|調査)|パルスサーベイ|組織サーベイ"],
["文書管理システム","文書管理システムとは","文書管理システム|文書管理"],
["WMS","WMSとは",L("WMS")+"|倉庫管理システム"],
["帳票システム","帳票システムとは","帳票システム|電子帳票"],
["キャッシュレス決済","キャッシュレス決済 導入","キャッシュレス|"+L("QR")+"決済|電子マネー"],
["ECプラットフォーム","ECサイト構築",L("Shopify")+"|ECカート|ECサイト構築|ECプラットフォーム"],
["ATS（採用管理システム）","採用管理システムとは","採用管理システム|"+L("ATS")],
["EDR","EDRとは",L("EDR")],
["オンラインストレージ","オンラインストレージとは","オンラインストレージ|"+L("Box|Dropbox")],
["3Dスキャナ・点群","3Dスキャナとは","3Dスキャ|点群|3Dレーザー"],
["電子申請","電子申請とは","電子申請|オンライン申請"],
["与信管理","与信管理とは","与信"],
["EDI","EDIとは",L("EDI")+"|電子データ交換"],
["安否確認システム","安否確認システムとは","安否確認"],
["ドローン","ドローン 点検","ドローン"],
["スマートグラス・ウェアラブル","スマートグラスとは","スマートグラス|ウェアラブル"],
["介護記録システム","介護記録ソフトとは","介護記録|介護ソフト"],
["産業用ロボット","産業用ロボットとは","産業用ロボット|多関節ロボット|ロボットアーム"],
["ハンディターミナル","ハンディターミナルとは","ハンディターミナル|ハンディ端末"],
["在庫管理システム","在庫管理システムとは","在庫管理システム|在庫管理アプリ"],
["受発注システム","Web受発注システムとは","受発注システム|Web受発注"],
["見積作成システム","見積ソフトとは","見積.{0,4}システム|見積作成"],
["AGV・AMR","AMRとは／AGVとは",L("AGV|AMR")+"|無人搬送"],
["画像検査AI・外観検査","外観検査AIとは","外観検査|画像検査"],
["MES","MESとは",L("MES")+"|製造実行システム"],
["協働ロボット","協働ロボットとは","協働ロボット|協働型ロボット|コボット"],
["電子カルテ","電子カルテとは","電子カルテ"],
["電子黒板・GIGAスクール","電子黒板とは","電子黒板|"+L("GIGA")+"|ICT教育|学習用端末"],
["見守りセンサー","見守りセンサーとは","見守りセンサー|見守りシステム"],
["UTM","UTMとは",L("UTM")+"|統合脅威管理|次世代ファイアウォール"],
["適性検査","適性検査とは 採用","適性検査"],
];
const hitText=(c)=>[c.product,c.title,c.summary,c.actions,...(c.tags||[])].join("\n");
const SPLIT_AT=30; // この件数以上は業種で割る
const out=[];
const stat=(list)=>{const inds=new Set(list.map(c=>c.customer.industry));const vend=new Set(list.map(c=>c.vendor));const nums=list.filter(c=>c.hasNumbers).length;const sizes=new Set(list.map(c=>facets[c.id]?.size||"unknown").filter(s=>s!=="unknown"));return{n:list.length,inds:inds.size,vend:vend.size,nums,sizes:sizes.size};};
const rec=(s,sub)=>{ if(sub) return (s.n>=5&&s.vend>=5&&s.nums>=3&&s.sizes>=2)?5:(s.n>=3?3:0); return (s.n>=5&&s.inds>=3&&s.vend>=5&&s.nums>=3)?5:(s.n>=3?3:0);};
for(const [name,query,pat] of TERMS){
 const re=new RegExp(pat,"i");
 const q=cases.filter(c=>re.test(hitText(c))&&sozai(c)&&c.customer?.name);
 const s=stat(q);
 if(q.length>=SPLIT_AT){
   const by={};for(const c of q){(by[c.customer.industry]??=[]).push(c);}
   const subs=Object.entries(by).map(([k,l])=>({k,l,s:stat(l)})).filter(x=>x.s.n>=5).sort((a,b)=>b.s.n-a.s.n);
   out.push({kind:"parent",name,query,s,rec:rec(s,false),subs:subs.length});
   for(const x of subs){ const qn = x.k==="other-industry" ? `${name.split("・")[0]} 事例（業種横断）` : `${name.split("・")[0]} ${IND[x.k].split("・")[0]} 事例`; out.push({kind:"sub",name:`${name} × ${IND[x.k]}`,query:qn,s:x.s,rec:rec(x.s,true)}); }
 } else {
   out.push({kind:"single",name,query,s,rec:rec(s,false)});
 }
}
const today=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
const lines=[`# 事例でわかる技術用語：用語候補（${today} 時点）`,"","`node scripts/inventory/terms.mjs` で再生成する（用語は同ファイルの TERMS に1行足す）。","",
"事例件数 = 素材級（課題文80字以上かつ、数値成果あり or 施策80字以上）で導入企業名が公開されている件数。hidden・linkOnly・掲載禁止ベンダーは除外。既存セレクションとの重なりは気にしない。",
"30件以上の用語は業種で割り、5件以上の業種だけ載せた。細分化した行の推奨本数は、5件以上・提供元5以上・数字あり3以上・規模帯2以上なら5、3件以上なら3。","",
"| 用語 | 事例件数 | うち数字あり | 想定検索クエリ | 業界の広がり | 提供元数 | 推奨本数 |","|---|---:|---:|---|---:|---:|---:|"];
for(const r of out){ if(r.kind==="sub") lines.push(`| 　└ ${r.name.split(" × ")[1]} | ${r.s.n} | ${r.s.nums} | ${r.query} | 1 | ${r.s.vend} | ${r.rec} |`); else if(r.s.n>=3) lines.push(`| ${r.name}${r.kind==="parent"?"（全体）":""} | ${r.s.n} | ${r.s.nums} | ${r.query} | ${r.s.inds} | ${r.s.vend} | ${r.rec} |`); }
fs.writeFileSync(path.join(ROOT,"content/articles/TERMS.md"),lines.join("\n")+"\n");
console.log(`content/articles/TERMS.md を書き出した（用語 ${TERMS.length}、行 ${out.length}）`);
