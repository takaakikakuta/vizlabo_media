#!/usr/bin/env python3
"""事例3選の候補一覧を出す。

課題＝困りごとタグ。素材条件（数値成果あり・課題文80字以上・sampleでない）を満たす事例を母集団とし、
比較軸ごとに「値が3つ以上あり、提供元の異なる3社を1値ずつ選べる」組み合わせを候補にする。
出力: content/articles/SEN3-CANDIDATES.md（全候補）と標準出力（要約）
"""
import json, collections, re, sys

cs = json.load(open('data/cases.json', encoding='utf-8'))
fac = json.load(open('data/case_facets.json', encoding='utf-8'))
ax = json.load(open('data/case_axes.json', encoding='utf-8'))
byid = {c['id']: c for c in cs}

IND = {'manufacturing':'製造','it':'IT','retail':'小売','medical':'医療','food':'食品','education':'教育','finance':'金融',
       'construction':'建設','logistics':'物流','public':'公共','hr-service':'人材','energy':'エネルギー','other-industry':'その他'}
EFF = {'time':'時間削減','quality':'品質向上','visibility':'見える化','standard':'標準化','cost':'コスト削減','sales':'売上増',
       'risk':'リスク低減','people':'人材・定着','cx':'顧客体験','staffing':'人員確保','environment':'環境'}
SIZE = {'s1':'小','small':'小','s2':'小','s3':'中','s4':'中','s5':'大','large':'大'}
CAT = {'saas':'SaaS','other-product':None,'consulting':'コンサル・支援','security':'セキュリティ製品','cloud':'クラウド基盤','hrtech':'HR系SaaS',
       'martech':'マーケ系ツール','iot':'IoT・センサー','ai':'AI','core-system':'基幹システム','dev':'受託開発','crm':'CRM','rpa':'RPA','robot':'ロボット','accounting':'会計系'}

def pool_ok(c):
    return any(re.search(r'\d', r.get('value','')) for r in (c.get('results') or [])) and len(c.get('challengeDetail') or '') >= 80 and not c.get('sample')

def single(axis, cid):
    v = ax[cid][axis]
    return v[0] if v and len(set(v)) == 1 else None

def axis_value(axis, c):
    cid = c['id']
    if axis == '規模':       return SIZE.get(fac[cid]['size'])
    if axis == '業種':       return IND.get(c['customer']['industry']) if c['customer']['industry'] != 'other-industry' else None
    if axis == '成果の種類': e = fac[cid]['effects']; return EFF.get(e[0]) if e else None
    if axis == '解き方(製品区分)': return CAT.get(c.get('productCategory'))
    return single(axis, cid)

AXES = ['解き方(製品区分)', '規模', '業種', '出発点', '成果の種類', '作り方', '期間', 'きっかけ']
ORDER = {'規模': ['小','中','大'], '期間': ['1か月以内','〜半年','〜1年','1年以上']}

def quality(c, tag=None):  # 同じ値の中でどの事例を代表にするか：タグの関連度（先頭に近い）→ 数字の入った成果の数 → 課題文の厚さ
    tags = c.get('tags') or []
    rel = -(tags.index(tag)) if tag in tags else -9
    numeric = sum(1 for r in (c.get('results') or []) if re.search(r'\d', r.get('value', '')))
    return (rel, numeric, len(c.get('challengeDetail') or ''))

pool = [c for c in cs if pool_ok(c)]
bytag = collections.defaultdict(list)
for c in pool:
    for t in c.get('tags', []): bytag[t].append(c)

rows = []  # (tag, n_pool, axis, values_count, picks)
for tag, L in bytag.items():
    if len(L) < 6: continue
    for axis in AXES:
        groups = collections.defaultdict(list)
        for c in L:
            v = axis_value(axis, c)
            if v: groups[v].append(c)
        if len(groups) < 3: continue
        # 値の並び：規模・期間は固定順、他は件数順
        vals = [v for v in ORDER[axis] if v in groups] if axis in ORDER else [v for v, _ in sorted(groups.items(), key=lambda kv: -len(kv[1]))]
        # 1値ずつ、提供元が重ならないように代表を選ぶ（値の多い方から）
        picks, used = [], set()
        for v in vals:
            for c in sorted(groups[v], key=lambda c: quality(c, tag), reverse=True):
                if c['vendor'] not in used:
                    picks.append((v, c)); used.add(c['vendor']); break
            if len(picks) == 3: break
        if len(picks) < 3: continue
        rows.append((tag, len(L), axis, {v: len(groups[v]) for v in vals}, picks))

rows.sort(key=lambda r: (-r[1], r[0], AXES.index(r[2])))

def short(c):
    r = c['results'][0]
    return f"{c['customer']['name'] or '非公開'}（{c['customer'].get('size') or '規模不明'}・{IND.get(c['customer']['industry'],'')}）／{c['vendor']}／{r['metric']} {r['value']}"

out = ['# 事例3選 候補一覧（自動抽出）', '',
       f'母集団：数値成果あり・課題文80字以上の {len(pool)} 件。課題＝困りごとタグ（母集団6件以上）。',
       '候補＝その課題で、軸の値が3つ以上あり、提供元の異なる3社を1値ずつ選べたもの。代表事例は数値成果の数と課題文の厚さで機械的に選んだ仮置き。',
       '出発点・作り方・期間・きっかけはキーワード抽出の値なので、採用前に本文で確認する。', '',
       '| 課題 | 母集団 | 軸 | 値の分布 | 代表3社（値：会社／提供元／成果） |', '|---|---|---|---|---|']
for tag, n, axis, dist, picks in rows:
    d = '、'.join(f'{v} {k}件' for v, k in dist.items())
    p = '<br>'.join(f'**{v}**：{short(c)}' for v, c in picks)
    out.append(f'| {tag} | {n} | {axis} | {d} | {p} |')
open('content/articles/SEN3-CANDIDATES.md', 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# 要約
print(f'候補 {len(rows)} 件（課題 {len({r[0] for r in rows})} 種）→ content/articles/SEN3-CANDIDATES.md')
print('\n軸ごとの候補数:', dict(collections.Counter(r[2] for r in rows)))
per = collections.defaultdict(list)
for tag, n, axis, dist, picks in rows: per[tag].append(axis)
print('\n複数の軸が成立する課題（母集団順、上位40）')
for tag, axes in sorted(per.items(), key=lambda kv: -bytag[kv[0]].__len__())[:40]:
    print(f'  {tag}（{len(bytag[tag])}）: ' + '／'.join(axes))
