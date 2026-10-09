"""コラム「事例の数字、いちばん多いのは『工数◯%削減』説」の集計スクリプト。

data/cases.json の成果欄（results の metric / value）を、指標の種類と値の形で機械的に分類して数える。
掲載停止ベンダー（data/blocked_vendors.json）は除外する。
コラム本文の数字はこのスクリプトの出力（numbers.json）から取る。cases.json が更新されたら再実行する。

    python3 content/drafts/kosu-sakugen-setsu/analyze.py

分類は指標名と値に含まれる語で判定する近似なので、境目の事例には誤分類がある。
「分類外」はどの語にも当たらなかった値（室内湿度、会員化率、受賞数など）。
"""
import json, re, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(__file__).resolve().parent / "numbers.json"

cases = json.load(open(ROOT / "data/cases.json", encoding="utf-8"))
blocked = {v["domain"] for v in json.load(open(ROOT / "data/blocked_vendors.json", encoding="utf-8"))["vendors"]}
cases = [c for c in cases if c["vendor"] not in blocked]
facets = json.load(open(ROOT / "data/case_facets.json", encoding="utf-8"))

DIGIT = re.compile(r"[\d０-９]")
SALES = (r"売上|売り上げ|受注|成約|商談|契約(数|件|率|獲得)|客単価|CV|コンバージョン|リード|購入|申込|来店|集客|利益|粗利|収益|業績|"
         r"新規顧客|反響|予約(数|件)|単価|会員|GMV|ROAS|CPA|広告|アポ|資料請求|流入|アクセス|PV|セッション|CTR|開封率|検索|LTV|友だち|"
         r"フォロワー|登録(者|数)|問い合わせ(数|件数)?(増|獲得)|入会|受講者|利用者数|顧客数|取引")
DECREASE = r"削減|減少|短縮|抑制|カット|減$"

CATEGORY_LABEL = {
    "time": "時間・工数・件数", "sales": "売上・集客", "cost": "コスト", "quality": "品質・ミス",
    "people": "採用・定着", "cx": "顧客満足・応対", "env": "環境・エネルギー", "other": "分類外",
}

def category(metric: str, value: str) -> str:
    t = f"{metric} {value}"
    if re.search(SALES, t) and not re.search(DECREASE, value): return "sales"
    if re.search(r"ミス|不良|エラー|品質|精度|正確|誤|不備|クレーム|歩留|ロス|欠品|差異|事故|手戻り|漏れ|トラブル|インシデント", t): return "quality"
    if re.search(r"コスト|費用|経費|人件費|電気代|料金|金額|円|予算|原価|支出|外注費|印刷費|郵送費|保守費|ランニング", t): return "cost"
    if re.search(r"採用|応募|離職|定着|退職|エンゲージメント|従業員満足|内定|入社|研修|教育", t): return "people"
    if re.search(r"顧客満足|CS|NPS|解決率|応答率|満足度|回答率|返信|レビュー|評価|放棄|応対品質|お客様", t): return "cx"
    if re.search(r"CO2|排出|電力|エネルギー|省エネ|燃料|ガス|廃棄", t): return "env"
    if re.search(r"工数|時間|残業|日数|短縮|分|期間|作業|処理|スピード|手間|負荷|稼働|労働|工程|入力|回数|件数|枚|歩|移動|問い合わせ|電話|対応|削減|効率|生産性|リードタイム|納期|自動化|ペーパーレス|紙", t): return "time"
    return "other"

def shape(value: str) -> str:
    v = value.strip()
    if "→" in v or re.search(r"から.*(に|へ)", v): return "前後比較（A→B）"
    if re.search(r"[\d０-９][\d,.．]*\s*[%％]", v): return "パーセント"
    if "倍" in v: return "◯倍"
    if re.search(r"時間|分|日|週|月|秒|年", v) and DIGIT.search(v): return "時間量（月◯時間削減など）"
    if re.search(r"円|万|億", v) and DIGIT.search(v): return "金額"
    if DIGIT.search(v): return "その他の数値"
    return "数字なし"

results = [(c, r.get("metric", ""), r.get("value", "")) for c in cases for r in c["results"]]
numeric = [(c, m, v, category(m, v)) for c, m, v in results if DIGIT.search(v)]
numeric_ids = {c["id"] for c, *_ in numeric}
by_cat_cases = collections.defaultdict(set)
for c, m, v, k in numeric: by_cat_cases[k].add(c["id"])
only_time = [i for i in by_cat_cases["time"] if all(i not in by_cat_cases[k] for k in by_cat_cases if k != "time")]

def shapes(cat): return collections.Counter(shape(v) for c, m, v, k in numeric if k == cat)

time_values = [v for c, m, v, k in numeric if k == "time"]
sales_values = [v for c, m, v, k in numeric if k == "sales"]

# 課題に「売上・リード獲得」が付いた事例のうち、売上系の数字が付いたもの
sales_goal = [c for c in cases if "sales" in c["challenges"]]

# 製品カテゴリ別：売上系／時間系の数字が付いた事例の割合
by_product = {}
for p, n in collections.Counter(c["productCategory"] for c in cases).most_common():
    ids = {c["id"] for c in cases if c["productCategory"] == p}
    by_product[p] = {"cases": n, "sales_numeric": len(ids & by_cat_cases["sales"]), "time_numeric": len(ids & by_cat_cases["time"])}

# ファインダー用の効果ラベル（定性含む）に対して、同じ種類の数字が付いた割合
facet_cross = {}
for eff, cat in [("time", "time"), ("sales", "sales"), ("cost", "cost"), ("quality", "quality"), ("cx", "cx"), ("people", "people")]:
    ids = {cid for cid, f in facets.items() if eff in f.get("effects", [])}
    facet_cross[eff] = {"cases": len(ids), "numeric_same": len(ids & by_cat_cases[cat]), "numeric_any": len(ids & numeric_ids)}

# 数字のない「成果」欄
nondigit = [(c, m, v) for c, m, v in results if not DIGIT.search(v)]
bare = sum(1 for _, _, v in nondigit if re.match(r"^(大幅(な|に)?)?(削減|短縮|向上|改善|増加|減少|軽減)$", v.strip()))

# 数字のない事例の定性成果に出る言葉
no_numeric = [c for c in cases if c["id"] not in numeric_ids]
qual_texts = [(c.get("resultsQualitative") or "") for c in no_numeric]
phrases = {p: sum(1 for t in qual_texts if p in t) for p in ["向上", "軽減", "削減", "改善", "スムーズ", "負担", "大幅", "効率化", "なくな"]}

out = {
    "asOf": max(c["collectedAt"] for c in cases)[:10],
    "cases": len(cases),
    "numericCases": len(numeric_ids),
    "numericResults": len(numeric),
    "casesByCategory": {CATEGORY_LABEL[k]: len(v) for k, v in sorted(by_cat_cases.items(), key=lambda x: -len(x[1]))},
    "onlyTimeCases": len(only_time),
    "timeValueShapes": dict(shapes("time").most_common()),
    "timeValues": len(time_values),
    "salesValueShapes": dict(shapes("sales").most_common()),
    "salesValues": len(sales_values),
    "salesValuesWithYen": sum(1 for v in sales_values if "円" in v),
    "allValueShapes": dict(collections.Counter(shape(v) for c, m, v, k in numeric).most_common()),
    "salesGoalCases": len(sales_goal),
    "salesGoalWithSalesNumber": len([c for c in sales_goal if c["id"] in by_cat_cases["sales"]]),
    "salesGoalWithAnyNumber": len([c for c in sales_goal if c["id"] in numeric_ids]),
    "byProduct": by_product,
    "facetCross": facet_cross,
    "nondigitResultValues": len(nondigit),
    "nondigitResultCases": len({c["id"] for c, _, _ in nondigit}),
    "nondigitTaihaba": sum(1 for _, _, v in nondigit if "大幅" in v),
    "nondigitBareVerb": bare,
    "noNumericCases": len(no_numeric),
    "noNumericQualPhrases": phrases,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=1))
