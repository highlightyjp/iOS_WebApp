---
name: regenerated-code-regression-guard
description: AI（Gemini/Claude等）に再生成させた全文で既存HTMLを置き換える前に、旧版と新版の機能台帳（関数・DOM id・保存キー・外部URL・タイトル）を差分比較し、無断削除・スタブ化・「省略」痕跡を検出して利用者に提示する。
---

# 再生成コードの差し替え前回帰チェック

## 目的
全文差し替えによって既存機能・保存キー・画面要素が無断で失われること、および生成側の「省略」「Stub」による空実装の混入を、差し替え前に検出する。
判定（差し替えてよいか）は利用者が行う。本スキルは差分台帳の作成と提示まで。

## 発動条件
- 既存HTMLを、AIが出力した全文で置き換えようとしている
- 差し替え前後で行数が ±30% 以上変動する
- 新版に `omitted` `for brevity` `Stub` `Simplified` `省略` `同様` 等のコメントがある
- 指示文に「最終版」「完全版」「修正版」等があり、旧版との差分が明示されていない

## 入力
| 項目 | 内容 |
|---|---|
| 旧版 | `git show HEAD:<path>` で取得したファイル |
| 新版 | 差し替え候補ファイル |
| 変更意図 | 利用者が指示した追加・削除の範囲（あれば） |

## 出力
| 項目 | 内容 |
|---|---|
| 行数変化 | 旧→新、変化率 |
| 台帳差分 | `title` / `function` / `dom_id` / `storage_key` / `external_url` ごとの削除(-)・追加(+) |
| スタブ痕跡 | 行番号付き一覧 |
| 空関数 | `function x(){}` / `function x(){ /* … */ }` の一覧 |
| 判定材料 | 「指示された変更」と「指示外の削除」の対照表 |
| 終了コード | 削除・スタブ・空関数のいずれかがあれば 1 |

## 手順
1. 旧版を取り出す: `git show HEAD:<path> > /tmp/old.html`
2. 新版を一時ファイルに保存する（まだ置き換えない）。
3. `python3 inventory_diff.py /tmp/old.html <新版>` を実行する。
4. 削除項目を、利用者の指示範囲と照合し「指示された削除」「指示外の削除」に分類する。
5. 保存キー（`storage_key`）の削除・改名がある場合は `storage-schema-migration` を発動する。
6. 指示外の削除・スタブ・空関数が1件でもあれば、差し替えを保留し、台帳差分をそのまま利用者に提示する。
7. 利用者の承認後に差し替え、`single-html-integrity-check` を実行してからコミットする。

```python
#!/usr/bin/env python3
"""inventory_diff.py  使い方: python3 inventory_diff.py OLD.html NEW.html"""
import re, sys

STUB = re.compile(r'omitted|for brevity|\bstub|simplified|same as previous|similar implementation|coming soon|省略|同様|未実装|TODO|FIXME', re.I)
EMPTY_FN = re.compile(r'function\s+(\w+)\s*\([^)]*\)\s*\{\s*(/\*.*?\*/)?\s*\}')
KW = {'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with'}

def methods(s):  # クラス/オブジェクトのメソッド定義（行頭の name(...) { 形式）
    return {m for m in re.findall(r'^\s*(?:async\s+|static\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{', s, re.M) if m not in KW}

def inv(s):
    return {
        'title': set(re.findall(r'<title>(.*?)</title>', s, re.S)),
        'function': set(re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', s))
                    | set(re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=', s))
                    | set(re.findall(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>', s))
                    | methods(s),
        'dom_id': set(re.findall(r'\bid=["\']([^"\'$]+)["\']', s)),
        'storage_key': set(re.findall(r'localStorage\.\w+Item\(\s*["\']([^"\']+)', s))
                       | set(re.findall(r'(?:KEY|_KEY|KEY_\w*)\s*=\s*["\']([^"\']+)', s)),
        'external_url': set(re.findall(r'https?://[^\s"\'`)<>]+', s)),
    }

old, new = (open(p, encoding='utf-8').read() for p in sys.argv[1:3])
a, b = inv(old), inv(new)
removed_any = False
lo, ln = old.count('\n') + 1, new.count('\n') + 1
print(f'lines: {lo} -> {ln} ({(ln - lo) / lo:+.0%})')
for k in a:
    rm, ad = sorted(a[k] - b[k]), sorted(b[k] - a[k])
    removed_any |= bool(rm)
    print(f'[{k}] removed={len(rm)} added={len(ad)}')
    for x in rm: print(f'  - {x}')
    for x in ad: print(f'  + {x}')
stubs = [(i + 1, l.strip()[:120]) for i, l in enumerate(new.splitlines()) if STUB.search(l)]
empties = EMPTY_FN.findall(new)
print(f'[stub_marker] {len(stubs)}')
for n, l in stubs: print(f'  L{n}: {l}')
print(f'[empty_function] {len(empties)}: ' + ', '.join(e[0] for e in empties))
sys.exit(1 if removed_any or stubs or empties else 0)
```

抽出の限界（報告時に併記する）: 正規表現による静的抽出であり、動的生成の id・キー、文字列連結で組み立てたURLは検出しない。

## 注意点（やってはいけないこと）
- スタブ・空関数を自分の判断で実装補完しない。
- 削除された機能を指示なく復元しない。
- 「Simplified」「省略」等のコメントだけを消して痕跡を隠さない。
- 行数の増減を品質の良否として評価しない（事実として提示するのみ）。
- 差し替えの可否を代行判断しない。
- 旧版を上書きしてから差分を取らない（必ず差し替え前に実行する）。

## 抽出元
`skills-drafts/INDEX.md` の「02」を参照。
