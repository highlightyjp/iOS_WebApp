---
name: artifact-to-standalone-port
description: claude.ai のアーティファクトを単体の HTML や PWA に移すときに、実行環境への依存（専用API・CDN・保存方式）を抽出して置き換え表を作り、本体を改変せず互換層を分離して移植し、構造検査を S8、外部送信の確認を S16 に渡して、依存の置き換え表・移植版・未対応の機能を出す。
---

# claude.ai アーティファクトの単体移植（S15）

状態: 清書（ラウンド3）。評価（試行・採点）は未実施。
由来: ラウンド2の S15。統合リスト（ラウンド1）の 25。統合リストの原文は未取得（INDEX 12章）。
旧下書き: `artifact-standalone-port`（INDEX 4章の 07）。番号と旧下書きの対応付けは本清書の作成セッションによる評価・解釈で、本人の決定ではない。

## 目的

claude.ai の実行環境でしか動かないアーティファクトを、GitHub Pages やローカルで単体で動くようにする。その際、アプリ本体（ロジック・定数・構造・保存スキーマ・入出力形式）は改変せず、実行環境の違いは本体と分けた互換層で吸収する。移植で失われる機能は「未対応の機能」として明示する。

方針（依頼文の指定）:

- 本体を改変しない。
- 互換層を本体から分離する（別の `<script>` ブロック、または別のファイル・モジュール）。

## 発動条件

- claude.ai のアーティファクトを、単体の HTML として、または PWA としてリポジトリに移す
- 移植済みのアプリに、実行環境の違いを吸収する機能（保存・同期・中継など）を足す（例: `cd631bb`「同期設定UI（アプリ本体は無変更）」、`e404261` mcp 中継）

## 入力

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| アーティファクトのソース | 必須 | 本体のファイル一式（HTML、または JSX など）。取得元と取得日時を記録する。ソースを受け取った時点の SHA-256 を記録する |
| 配置先 | 必須 | 例: `coorde/`、`dasgen/` |
| 本体改変の承認 | 任意 | 本人が承認した本体の改変（無ければ0件）。注意点 G1 |

## 手順

1. ソースを固定する。受け取ったファイルの SHA-256 を記録する（`sha256sum <ファイル>`）。以後、本体の非改変はこの値と照合して確かめる。

2. 実行環境への依存を抽出する。3種類に分けて全件を列挙する。
   ```bash
   F=<本体ファイル>
   # 専用API（claude.ai の実行環境が提供する機能）
   grep -noE "window\.claude[.\w]*|claude\.use\(['\"][a-z]+['\"]\)|window\.storage[.\w]*|api\.anthropic\.com[^\"'\`]*|anthropic-version|x-api-key|anthropic-dangerous-direct-browser-access" $F
   # CDN・外部URL（スクリプト・スタイル・フォント・API）
   grep -noE "(src|href)=\"https?://[^\"]+\"|import[^;]+from\s+['\"][^.'\"/][^'\"]*['\"]|https?://[A-Za-z0-9./_-]+" $F | sort -u
   # 保存方式
   grep -noE "localStorage\.[a-zA-Z]+|sessionStorage\.[a-zA-Z]+|indexedDB\.open\([^)]*\)|document\.cookie" $F
   ```
   - 専用API の名前の一覧は、本リポジトリの移植例（`coorde` の `claude.use("db"|"user"|"sample"|"mcp"|"downloads")`、`dasgen` の `api.anthropic.com/v1/messages`）から作ったもの。claude.ai の実行環境が提供する機能の全一覧とは照合していない（未確認）。grep に当たらない呼び出しがないか、`window.` で始まる未定義の名前をソース全体で目視する。
   - import 文の素の指定子（例: `react`）は、アーティファクトの実行環境が解決していた依存として扱う。

3. 置き換え表を作る（出力の「依存の置き換え表」）。依存1件ごとに、単体での代わりの実装と、代わりが無い場合の挙動を決める。決め方は本人の承認を得る。
   | 依存（例） | 代わりの実装の例（本リポジトリでの実装） |
   | --- | --- |
   | `claude.use("db")` | IndexedDB ＋ `navigator.storage.persist`。失敗時はメモリだけで動かし、保存できないことを画面に出す。旧 localStorage からの初回移行（`coorde/index.html:517-518`） |
   | `claude.use("user")` | 固定 ID（`coorde` は `"local"`） |
   | `claude.use("downloads")` | Blob と `<a download>` |
   | `claude.use("sample")`・`claude.use("mcp")` | 未対応は `null`。`coorde` は後から GitHub Actions 経由の中継を互換層に追加（`e404261`） |
   | `api.anthropic.com` の呼び出し | 利用者が端末で入力する API キー（`dasgen` は sessionStorage に保存）。キーをコード・seed に含めない |
   | CDN | 版を固定した URL に置き換えるか、そのまま使うかを依存ごとに決め、記録する |
   代わりが無いものは「未対応の機能」に入れる。黙って削らない。

4. 移植する。
   1. 互換層を本体より前の独立したブロック（または別ファイル）に置く。互換層は、すでに `window.claude.use` がある場合は何もしない（`coorde/index.html:520`）。これで claude.ai 上でも同じファイルが動く。
   2. 本体はソースのまま置く。手順1の SHA-256 と、移植版の本体部分の SHA-256 を比べる。単一HTMLで互換層を同じファイルに入れる場合は、本体部分が元のソースと一字一句同じであることを `diff` で確かめる（差分が互換層のブロックの追加だけであること）。
   3. 本体の改変が避けられない場合は、改変せずに指摘として報告し、本人の承認を待つ。承認を得た改変は件数と内容を README などに列挙する（例: `dasgen/README.md`「移設時の承認済み改変（2件のみ）」）。
   4. 初期データ・seed から個人のデータを除く（例: `coorde/index.html:515` の seed は `{}`、`7962ec5`「standalone, no personal data」）。除いたことの確認は S16 で行う。

5. 構造を検査する。S8（単一HTML改変の安全手順。本リポジトリの旧下書きでは `single-html-integrity-check`・`regenerated-code-regression-guard`。S8 の清書は PR #5（未マージ）の `S8-single-html-safe-modification`）に渡す。

6. 外部送信を確認する。手順2で抽出した外部 URL と、互換層が足した送信先（例: `api.github.com`）を S16（公開前の個人情報・秘密・外部送信チェック。旧下書きでは `public-repo-exposure-check`、清書は PR #5（未マージ）の `S16-prepublish-exposure-check`）に渡す。

7. PWA にする場合は S14 を呼ぶ。

8. 未対応の機能を書く（出力の「未対応の機能」）。claude.ai 上では動いて、移植版では動かない、または動きが変わる機能を全件書く。

## 出力

```markdown
## アーティファクトの単体移植（<アプリ>、<日付>）
- ソース: <取得元>（取得 <日時>、SHA-256 <値>）
- 配置先: <パス>

### 依存の置き換え表
| # | 種類（専用API / CDN / 保存方式） | 依存（ファイル:行） | 単体での代わり | 代わりが無いときの挙動 | 本人の承認 |
| --- | --- | --- | --- | --- | --- |

### 移植版
- 互換層: <ファイル:行範囲 / 別ファイル>
- 本体の非改変の確認: <ソースの SHA-256> と <移植版の本体部分の SHA-256>、または diff の結果
- 本体の改変: <0件 / 承認済み N件（内容）>
- S8 の結果: <要約と参照>
- S16 の結果: <要約と参照>

### 未対応の機能
| # | 機能 | claude.ai での動き | 移植版での動き | 理由 |
| --- | --- | --- | --- | --- |
```

## 根拠（本清書の作成時に確認した事実）

| # | 事実 | 区分 |
| --- | --- | --- |
| E1 | `coorde/index.html:517` のコメント「claude.use() 互換層。db=IndexedDB(+navigator.storage.persist) / user=固定id / sample,mcp=null / downloads=Blob保存」。`:520` で `window.claude.use` があれば何もしない。`:515` の seed は `{}` | 確認済み（main `48949ec` の grep・読解、2026-11-02） |
| E2 | `coorde/index.html:639` で互換層の末尾に `window.claude = { async use(name) { ... } }` を定義。`:2683` の本体は `claude.use("db")` などを呼ぶ | 確認済み（同上） |
| E3 | `coorde/index.html` の外部 URL に `fonts.googleapis.com`・`fonts.gstatic.com`（フォント）、`api.github.com`（同期）、`api.open-meteo.com`・`www.jma.go.jp`・`msearch.gsi.go.jp`・`www.uniqlo.com`・`www.gu-global.com` などがある | 確認済み（grep、2026-11-02）。各 URL を本体と互換層のどちらが使うかは本清書では分類していない |
| E4 | `dasgen/src/App.jsx` は `https://api.anthropic.com/v1/messages`（96行）、`x-api-key`（100行）、`anthropic-dangerous-direct-browser-access`（102行）、`sessionStorage`（95・551行）を使う。`dasgen/README.md` は承認済み改変2件（ヘッダの追加、APIキーの sessionStorage 保存）を列挙 | 確認済み（`claude/dasgen-local-setup-929p4z` の grep・読解、2026-11-02） |

## 注意点

旧下書きと依頼文の定義の差異（統合していない。本人確認事項）:

| # | 旧下書き 07 | 依頼文の定義 | 本清書の扱い |
| --- | --- | --- | --- |
| G1 | 入力に「承認済み改変リスト」を置き、本体の改変をその範囲に限る（例: dasgen の2件） | 「本体を改変しない方針」 | 本体を改変しないことを原則とし、改変が必要なら指摘として報告し承認を待つとした（手順4の3）。dasgen の2件は `App.jsx`（本体）の中の改変で、互換層の分離ではない（E4）。dasgen の形を今後も認めるかは本人が決める |
| G2 | 依存の棚卸しは `claude.use`・`window.claude`・Anthropic API だけ | 「専用API・CDN・保存方式」 | CDN と保存方式を手順2に加えた |
| G3 | 手順5で個人データ除去を `public-repo-exposure-check` に、手順8で `single-html-integrity-check`・`ios-standalone-webapp-check`・`pwa-service-worker-release` を呼ぶ | 構造検査は S8、外部送信の確認は S16 | 依頼文の番号に従った。iOS の表示確認は、PWA にする場合に S14 で行う。PWA にしない単体HTMLの iOS 表示確認をどこで行うかは未決定（S14 の注意点 G2 と同じ） |
| G4 | 手順7「外部依存（別リポジトリのワークフロー名、許可ホスト、トークン権限）を記録する」 | 記載なし | 手順3の置き換え表に、互換層が足した依存として含める（評価・解釈）。独立した手順にはしていない |
| G5 | ― | 出力に「移植版」 | 本体の非改変を SHA-256 または diff で確かめる手順（手順1・手順4の2）を加えた。旧下書きには無い（評価・解釈） |

S8・S16 の清書は PR #5（`claude/affectionate-clarke-fowag0`、未マージ）にある。本ブランチには含まれないため、旧下書きの名前を併記した。

品質ルール:

- 根拠区分は「確認済み／評価・解釈／未確認」の3つだけを使う。claude.ai 上での動きは、実際に claude.ai で動かして確かめたものだけを確認済みとし、ソースを読んで推定した動きは評価・解釈とする。
- 未対応の機能を「無し」と書く場合は、手順2の3種類の抽出結果がすべて置き換え表に載っていることを示す。
- 肯定のみの報告をしない。

してはいけないこと:

- 本体のロジック・定数・構造・保存スキーマ・入出力形式を「ついで」に改変しない。
- 互換層を本体の中に混ぜない。
- API キー・トークンをコード・seed・コミットに含めない。
- 互換層で保存の失敗を握りつぶさない（保存できない状態を画面に出す）。
- 置き換えられない機能を黙って削らない。

## 他のスキルとの境界

| スキル | 境界 |
| --- | --- |
| S8 単一HTML改変の安全手順 | 移植版の構造検査（手順5） |
| S16 公開前の個人情報・秘密・外部送信チェック | 外部送信と個人データの確認（手順4の4、手順6） |
| S14 PWA更新リリース | PWA にする場合（手順7） |
| S13 保存スキーマ移行 | 互換層で保存先を変える場合（例: 旧 localStorage → IndexedDB の初回移行）は S13 の手順で移行する |

## 抽出元

`skills-drafts/INDEX.md` の「12. ラウンド3 清書（S12〜S15）」を参照。
