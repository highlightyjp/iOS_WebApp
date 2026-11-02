---
name: deterministic-html-patch
description: CSS・文言の一括置換やデータ埋め込みなど、スクリプトでHTMLを機械的に書き換えるときに、置換表に期待件数を持たせ、ドライランで実件数を照合し、不一致なら中止する。出力は別名で生成し、差分・前後ハッシュ・構造チェック結果を添えて利用者承認後に反映する。
---

# HTMLへの決定的パッチ適用

## 目的
文字列置換スクリプトの「空振り（0件ヒット）」「想定外の多重置換」「正規表現の過剰マッチ」を検出し、置換結果を再現・監査可能にする。

## 発動条件
- 複数箇所の色・文言・スタイルを一括で置き換える（例: 中立化・沈黙化）
- 生成データ（JSON等）をHTML内の定数定義へ埋め込む
- 同じ置換を複数ファイル・複数版に適用する

## 入力
| 項目 | 内容 |
|---|---|
| 対象ファイル | リポジトリ相対パス |
| 置換表 | `id / old / new / 期待件数 / 種別（literal・regex）` |
| 出力先 | 別名ファイル（既定）または上書き（承認後） |

## 出力
| 項目 | 内容 |
|---|---|
| ドライラン結果 | id / 期待件数 / 実件数 / 判定 |
| 生成ファイル | 別名出力 |
| unified diff | 適用前後 |
| ハッシュ | 適用前後の SHA-256 |
| 構造チェック | `single-html-integrity-check` の結果 |

## 手順
1. 置換表をスクリプト外（JSON 等）に定義し、各行に期待件数（既定1）を持たせる。
2. ドライランで全行の実件数を数え、1行でも期待件数と異なれば適用せず中止・報告する。
3. 適用は件数を返す関数で行い、適用後にも件数を照合する。
4. 出力は別名ファイルに書く。対象が凍結物の場合は適用しない（`freeze-seal-verify`）。
5. 差分・前後ハッシュ・構造チェック結果を利用者に提示し、承認後に反映する。
6. 置換表・スクリプト・結果を同じコミットに含める（再現可能にする）。

```python
#!/usr/bin/env python3
"""patch.py  使い方: python3 patch.py rules.json in.html out.html [--apply]
rules.json: [{"id":"R01","old":"...","new":"...","count":1,"regex":false}, ...]"""
import hashlib, json, re, sys
rules = json.load(open(sys.argv[1], encoding='utf-8'))
src = open(sys.argv[2], encoding='utf-8').read()
ng = 0
for r in rules:
    n = len(re.findall(r['old'], src)) if r.get('regex') else src.count(r['old'])
    ok = n == r.get('count', 1)
    ng += not ok
    print(f"{'OK' if ok else 'NG'} {r['id']} expected={r.get('count', 1)} actual={n}")
if ng or '--apply' not in sys.argv:
    sys.exit(1 if ng else 0)
out = src
for r in rules:
    if r.get('regex'):
        out, n = re.subn(r['old'], r['new'], out)
    else:
        n = out.count(r['old']); out = out.replace(r['old'], r['new'])
    assert n == r.get('count', 1), r['id']
open(sys.argv[3], 'w', encoding='utf-8').write(out)
h = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
print('before', h(src)); print('after ', h(out))
```

注: 置換を順に適用するため、先行ルールの `new` が後続ルールの `old` に一致する設計にしない（ドライランは元テキストに対する件数）。

## 注意点（やってはいけないこと）
- ヒット件数を確認しない `replace` / `re.sub` で書き換えない。
- 入れ子構造（JSON・JS定数）を正規表現の貪欲・非貪欲マッチだけで置換しない。開始・終了マーカーを明示し、件数1を確認する。
- 絶対パス（例: `/home/user/...`）をスクリプトに書かない。リポジトリ相対パスまたは引数で受け取る。
- 凍結物へ直接適用しない。
- スクリプト適用後に手作業の修正を混ぜない（混ぜる場合は別コミットに分ける）。

## 抽出元
`skills-drafts/INDEX.md` の「10」を参照。

## 清書版への参照（2026-11-02 追記）

本下書きはラウンド3で S8 `skills-drafts/S8-single-html-safe-modification/SKILL.md` に統合・清書された（改変中の期待件数の宣言と照合として）。本下書きの本文は変更していない。対応表は `skills-drafts/INDEX.md` の「11. ラウンド3 清書（S8・S16）」を参照。
