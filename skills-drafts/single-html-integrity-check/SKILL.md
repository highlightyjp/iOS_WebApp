---
name: single-html-integrity-check
description: 単一HTMLアプリ（CSS/JS内包）を保存・コミットする前に、<script>開閉の不一致、<script>外へのJS漏出、</html>後の残骸、DOCTYPE重複、インラインJSの構文エラーを機械的に検出する。AI出力を分割貼り付け・全文差し替え・<script>タグ手修正した直後に使う。
---

# 単一HTML構造整合チェック

## 目的
単一HTMLファイルが「ブラウザで開くだけで動作する」構造を保っていることを、コミット前に機械的に確認する。
対象は構造破損（タグ対応・コード漏出・構文エラー）のみ。機能・表示・ロジックの妥当性は対象外。

## 発動条件
- AI出力を複数回に分けて1ファイルへ貼り付けた（「PART 2」「Module 1, 2 は定義済み前提」等の分割出力）
- GitHub Web UI 等で全文を差し替えた
- `<script>` / `</script>` を手で追加・削除した
- 対象: リポジトリ直下の `*.html`、各アプリディレクトリの `index.html`

## 入力
| 項目 | 内容 |
|---|---|
| 対象ファイル | HTMLパス（複数可） |

## 出力
| 項目 | 内容 |
|---|---|
| 判定行 | `PASS/FAIL ファイル script=開/閉 doctype=件数 afterHtml=行数 leak=行数 syntax=…` |
| 終了コード | FAIL が1件でもあれば 1 |
| 報告 | FAIL 項目ごとの行番号と該当行（修正案は付けない） |

判定基準: `script` 開閉一致、`doctype=1`（script外で数える）、`afterHtml=0`、`leak=0`、構文エラー0件。全て満たせば PASS。

## 手順
1. 下記 `check-html.mjs` を作業用ディレクトリ（リポジトリ外）に置く。
2. `node check-html.mjs <対象HTML...>` を実行する。
3. FAIL の場合、項目ごとに該当行を特定する。
   - `leak>0`: script/style 除去後に `const|let|var|function|class|window.|return` で始まる行を列挙する
   - `afterHtml>0`: 最後の `</html>` 以降の非空行を列挙する
   - `doctype>1`: 2つ目の文書開始位置（文書の連結）を示す
   - `syntax`: ブロック番号と行番号、エラーメッセージを示す
4. 結果を監査指摘形式で報告する。修正は利用者の指示を受けてから行う。
5. 修正後は再度 2 を実行し、PASS を確認してからコミットする。

```js
// check-html.mjs  使い方: node check-html.mjs a.html [b.html ...]
import fs from 'node:fs';
import vm from 'node:vm';
let fail = 0;
for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, 'utf8');
  const lines = s.split('\n');
  const open = (s.match(/<script(\s[^>]*)?>/gi) || []).length;
  const close = (s.match(/<\/script>/gi) || []).length;
  const htmlEnd = lines.findLastIndex((l) => /<\/html>/i.test(l));
  const afterHtml = htmlEnd < 0 ? -1 : lines.slice(htmlEnd + 1).filter((l) => l.trim()).length;
  const rest = s.replace(/<script(\s[^>]*)?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const doctype = (rest.match(/<!doctype html/gi) || []).length; // JS文字列内のDOCTYPEは数えない
  const leak = rest.split('\n').filter((l) => /^\s*(const |let |var |function |class |window\.|return )/.test(l)).length;
  const errs = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(s))) {
    i++;
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    const t = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
    if (t && !/^(text|application)\/javascript$/i.test(t[1])) continue; // module / json 等は対象外
    try { new vm.Script(m[2]); } catch (e) { errs.push(`#${i}@L${s.slice(0, m.index).split('\n').length}: ${e.message}`); }
  }
  const ok = open === close && doctype === 1 && afterHtml === 0 && leak === 0 && errs.length === 0;
  if (!ok) fail = 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${f} script=${open}/${close} doctype=${doctype} afterHtml=${afterHtml} leak=${leak}${errs.length ? ' syntax=' + errs.join(' | ') : ''}`);
}
process.exit(fail);
```

検証済み実績（2026-11-01）: main の現行19ファイルは全件 PASS。履歴上の `estateos.html` 23版中9版、`nexa_v1_0_0_full.html` 23版中1版を FAIL として検出。

## 注意点（やってはいけないこと）
- 検出結果を根拠に、指示なくコードを書き換えない。報告のみ行う。
- `<script>` タグの付け外しだけで辻褄を合わせない。履歴上、タグ付け外しのみのコミット（`0a60b9a` `88a5c9d` `616daed` `d9305d4`）は、いずれも直後の版で漏出が残存している。
- 構文 PASS を動作 PASS と記載しない。実行時エラー・未定義参照・外部 `src` スクリプトは検出範囲外であることを報告に明記する。
- `type="module"` / `application/json` ブロックは構文検査対象外であることを報告に明記する。
- 検査スクリプトをリポジトリへ追加しない（追加は利用者の指示がある場合のみ）。

## 抽出元
`skills-drafts/INDEX.md` の「01」を参照。

## 清書版への参照（2026-11-02 追記）

本下書きはラウンド3で S8 `skills-drafts/S8-single-html-safe-modification/SKILL.md` に統合・清書された（構造検査（基線・改変後）として）。本下書きの本文は変更していない。対応表は `skills-drafts/INDEX.md` の「11. ラウンド3 清書（S8・S16）」を参照。
