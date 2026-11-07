# 試運転記録: S11 `external-material-rights-review`（外部素材の権利条件確認、`highlightyjp/app`）

- 試運転日: 2026-11-05（実行 2026-11-05T00:07Z〜00:10Z）
- 手順書の取得: このセッションに `highlightyjp/app` は直接追加されていない。GitHub MCP の PR 取得は「repository is not configured for this session」で拒否された。公開リポジトリの匿名 git 読み取りで `refs/pull/11/head` を取得した（`git fetch --depth=50 origin refs/pull/11/head`）。PR #11 のタイトル・本文は取得できていない（未確認）。
- 手順書: `highlightyjp/app` `refs/pull/11/head`（コミット f91197f、2026-11-04T11:11:46Z）の `skills-drafts/external-material-rights-review/SKILL.md`（blob 63339e5、201行、SHA-256 540aa69c7900f04cfe9f45a6828479f7abcc29814e53ec215c7f6b0fb2785b6e）
- PR #11 のコミット f91197f の変更: L179（範囲節）の露出確認の参照先を B12 から S16 に更新（1行）。
- 手順書は変更していない。`L<n>` は上記 blob の行番号。
- 実行環境: git 2.43.0、curl（エージェントプロキシ経由）

## 1. サンプルタスク

- 発動条件 L66「外部素材を含む成果物を公開する前（公開範囲を広げる前を含む）」を模擬した。
- 対象: `highlightyjp/iOS_WebApp` `main`（48949ec）の `machiapp-techo/` 一式（7ファイル）。
- 本書 L199「DADS の表記（上記の所在）にも適用していない」の対象（L26 の `machiapp-techo/LICENSES.txt`）を選んだ。

## 2. 入力

| 項目 | 値 | 根拠 |
| --- | --- | --- |
| 素材の一覧 | 手順1で作成 | — |
| 使用形態 | 手順4でコードから確認 | 本人の申告なし（J1） |
| 公開範囲 | 一般公開 | リポジトリ public（`gh api -X GET search/repositories -f q='repo:highlightyjp/iOS_WebApp'` の `visibility`）、`https://highlightyjp.github.io/iOS_WebApp/machiapp-techo/` が HTTP 200（2026-11-05T00:10Z）。本人には確認していない（J1） |

## 3. 出力（L136〜157 の形式）

### 素材台帳（取得日 2026-11-05、公開範囲 一般公開（GitHub Pages））

- 抽出に使ったコマンドと件数（L83〜87 を対象ディレクトリ `machiapp-techo` で実行）:
  - 外部の script / link / import / fetch: 0件
  - 著作権表示・ライセンス名: index.html 8行、LICENSES.txt 多数（Apache License 本文を含む）、sw.js 1行（`LICENSES.txt` をキャッシュ対象に含む行）
  - 依存定義: `package.json`・`requirements*.txt` なし（`ls` 終了コード 2）
  - 追加（L90）: フォント指定 `index.html:75`（`"Noto Sans JP"`）、画像 `icon-192.png`・`icon-512.png`・`apple-touch-icon.png`

| 素材（配布物） | 版 | 取得元 | 条件の原文（URL・版・取得日時） | 許諾（引用） | 義務（引用） | 禁止（引用） | 適用除外（引用） | 使用形態（ファイル:行） | 発生する義務 | 満たし方 | 判定（○△×） | 区分 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 DADS コードスニペット由来のデザイントークン値（`design-system-example-components-html` `src/global.css`） | サイト表示 v2.18.2（`index.html:19`）。コードスニペット側のタグ・コミットは未確認 | `index.html:17-21` の記載 | (a) `https://raw.githubusercontent.com/digital-go-jp/design-system-example-components-html/main/LICENSE`（main ブランチ、版の固定なし、2026-11-05T00:08Z、SHA-256 ae61e7a436d5e708b3341beb7ca88fc467d4b0362b2c096c19e37afdb3be7f8f）。(b) 利用上の注意事項 `https://design.digital.go.jp/dads/introduction/notices/`（「2026年8月5日更新」、2026-11-05T00:09Z、SHA-256 fe7ab2b5d1916a86a872d9780de86256793b8e58fba4af06517651d867c2c8db） | (a)「to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software」 | (a)「The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.」(b) コードスニペット 2-2「編集・加工等をせずに利用し公開する場合は出典を記載してください。」 | 記載なし（(a)(b) の全文を確認） | (b) コードスニペット 2-1「編集・加工等して作成されたUI等の画面パーツを利用者のウェブサイト等で利用する場合、出典を明記する必要はありません。」 | 加工して同梱（`index.html:17-21` の記載「Values are used and adapted here」。値の照合は未実施） | MIT の著作権表示・許諾表示の保持（トークン値が「substantial portions」に当たる場合。評価・解釈） | 現状: `index.html:23-40` のコメントと `LICENSES.txt:8-28` に保持済み | 未決（○ と △ の両方の条件に当たる。A1） | 条件: 確認済み（原文）。版の一致: 未確認。判定: 評価・解釈 |
| M2 DADS 本体（サイトのコンテンツ）としてのトークン値 | サイト表示 v2.18.2 | `LICENSES.txt:3` `https://design.digital.go.jp/dads/` | (b) 上記。(c) デジタル庁コピーライトポリシー `https://www.digital.go.jp/copyright-policy`（2026-11-05T00:08Z、SHA-256 97454b78cfdbb638ae60700263ee88e4e46ade72921b7cc81a0b06f1ad877286） | (c)「権利表記の記載がない限り『公共データ利用規約（第1.0版）』（PDL1.0）が適用されています。」 | (b) 本体 1-1「コンテンツを利用する際は出典を記載してください。」1-2「編集・加工などを行ったことを記載してください。」 | (b) 本体 1-2「編集・加工した情報を、あたかもデジタル庁が作成したかのような態様で公表・利用してはいけません。」 | (c) 1.4「組織や特定の事業を表すシンボルマーク、ロゴ、キャラクターデザインロゴの使用については…申請をお願いします。」 | トークン値が本体のコンテンツに当たるかは未確認（M1 との関係。要・法務確認 #1） | 出典の記載、加工した旨の記載（本体に当たる場合） | 現状: `index.html:11789`「出典：デジタル庁デザインシステム（β版、サイト表示 v2.18.2）のトークン値を利用し、加工しています…」、`LICENSES.txt:3-5` | △ | 条件: 確認済み（原文）。PDL1.0 本文は未取得。判定: 評価・解釈 |
| M3 jsQR | 1.4.0（`index.html:280` のコメント。`unpkg.com/jsqr@1.4.0/package.json` の `version` と一致） | `https://unpkg.com/jsqr@1.4.0/dist/jsQR.js` | `https://unpkg.com/jsqr@1.4.0/LICENSE`（1.4.0、2026-11-05T00:08Z、SHA-256 c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08）。`package.json` の `license` は `Apache-2.0` | 2.「copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work」 | 4(a)「You must give any other recipients of the Work or Derivative Works a copy of this License」4(c)「You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices」4(d) NOTICE ファイルがある場合の表示 | 6.「This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor」 | 記載なし（全文を確認） | 未加工で同梱（`index.html:282-10383` は `dist/jsQR.js` 1.4.0 と行末の改行1つを除き一致。`diff` で確認） | 4(a) 許諾書の写しの提供。4(b) は未加工のため不発生（評価・解釈）。4(c) 配布物に著作権表示なし（`dist/jsQR.js` の `copyright` 0件）。4(d) パッケージに NOTICE なし（`unpkg.com/jsqr@1.4.0/?meta` のファイル一覧に 0件） | 現状: `LICENSES.txt:34-235` は取得した LICENSE と同一（行末空白を除いて `diff` 差分なし）。`index.html:280`・`:11789` に名称・版・ライセンス名 | 未決（○ と △ の両方の条件に当たる。A1） | 条件: 確認済み（原文）。判定: 評価・解釈 |
| M4 Noto Sans JP（フォント名の指定のみ） | — | `index.html:75` | 取得していない（J3） | — | — | — | — | 参照のみ: `font-family` に名前を書くだけで、フォントファイルの同梱・外部読込は無い（`@font-face`・`@import` 0件、`<link>` は `index.html:7-8` の manifest・apple-touch-icon の2件のみ） | 未確認 | — | 判定保留（原文未取得。L124 により ○ にしない） | 未確認 |
| M5 アイコン画像（`icon-192.png`・`icon-512.png`・`apple-touch-icon.png`） | — | 不明（`022dffc` で追加。作成元の記載なし） | 不明 | — | — | — | — | 同梱（`manifest.webmanifest`・`sw.js:4`） | 未確認 | — | 判定保留（外部素材か自作かが未確認） | 未確認 |

#### 使っていないもの（参考にした対象との関係）

| 参考にした対象 | 項目 | 扱い |
| --- | --- | --- |
| 不明 | — | `machiapp-techo/` に参考対象の記載（README 等）が無い。本人に確認が要る |

### 出典表示の文案（提案。書き換えはしていない）

- M2（本体に当たる場合）: 利用上の注意事項 本体 1-2 の記載例1に従う案「出典：デジタル庁デザインシステムウェブサイト https://design.digital.go.jp/dads/ のコンテンツを加工して作成」
- 置く場所: 現状の `index.html:11789`（アプリ情報）と `LICENSES.txt:3`。現状の文言は記載例と表現が異なる（URL がアプリ情報の文言に無い）。差し替えるかは本人が決める。
- 付記: `LICENSES.txt:1` は「マチアプ手帳 v2.0.0」で、`index.html:10388` の `APP_VERSION = "2.1.0"` と異なる（S6 の範囲。既知の取り残し候補）。

### 要・法務確認

| # | 素材 | 論点 | 関係する原文（引用） | 判断が必要な理由 |
| --- | --- | --- | --- | --- |
| 1 | M1・M2 | トークン値がコードスニペット（MIT）とデザインシステム本体（コピーライトポリシー・PDL1.0）のどちらの条件に服するか | 利用上の注意事項「『デザインシステム本体』とは…デザインデータ（Figma）とコードスニペットを除いたもの」 | 取得元はコードスニペットの `src/global.css` と記載されているが、同じ値はサイトにも掲載されうる |
| 2 | M1 | 「加工して作成されたUI等の画面パーツ」は出典不要という記載と、MIT の表示保持義務の関係 | コードスニペット 2-1、MIT「shall be included in all copies or substantial portions」 | 規約同士の関係（app `docs/app-build-guide_v5.md:363` も要・法務確認としている） |
| 3 | M1 | CSS 変数の値の集合が MIT の「substantial portions of the Software」に当たるか | MIT 本文 | 原文の解釈が分かれうる |
| 4 | M4 | 名前の指定だけのフォントに権利条件の確認が要るか | — | 参照のみの利用の扱い（L131） |

### 原文を取得できなかったもの

| 素材 | 試した経路 | 失敗理由 | 次に試せる経路 | 判定への影響 |
| --- | --- | --- | --- | --- |
| M3（GitHub 側） | `https://raw.githubusercontent.com/cozmo/jsQR/1.4.0/LICENSE` | HTTP 404（タグ名 `1.4.0` の参照先なし） | GitHub のタグ一覧で正しいタグ名を確認 | なし（unpkg の公開物から取得済み） |
| M2（利用上の注意事項） | `https://design.digital.go.jp/dads/introduction/notes/`（本セッションの推測URL） | HTTP 404 | — | なし（`/dads/introduction/` のリンクから `/notices/` を取得済み） |
| M2（PDL1.0 本文） | 試していない | — | コピーライトポリシーからのリンク先 | 判定 △ のまま |
| M1（版の一致） | コードスニペットの v2.18.2 相当のタグを探していない | — | リポジトリのタグ一覧 | 版の一致は未確認 |
| M4・M5 | 試していない | — | 本人に作成元を確認 | 判定保留 |

## 4. 手順の追従状況

| 手順 | 実施 | 備考 |
| --- | --- | --- |
| 1 配布物ごとに分ける | 実施 | L83〜87 を改変せず実行（対象ディレクトリを置換） |
| 2 原文の取得 | 一部実施 | 上表。取得したテキストの SHA-256 を記録 |
| 3 引用 | 実施 | 改変せずに短く引用 |
| 4 使用形態との照合 | 実施 | jsQR は公開物と `diff` で照合。DADS トークン値の照合は未実施 |
| 5 ○△× | 一部未決 | M1・M3 は A1 により未決。M2 △。M4・M5 判定保留 |
| 6 使っていないもの | 実施（情報なし） | 本人確認が要る |
| 7 要・法務確認 | 実施 | 4件 |

## 5. 条件付き修正（PR #11）部分の検証

| 修正 | 試運転での確認 |
| --- | --- |
| L179 の参照先を S16 `prepublish-exposure-check`（iOS_WebApp `claude/affectionate-clarke-fowag0`）に更新 | 参照先 `skills-drafts/S16-prepublish-exposure-check/SKILL.md` は `highlightyjp/iOS_WebApp` の `claude/affectionate-clarke-fowag0` と、それを土台とする PR #8 のブランチ `claude/kind-cray-alyc2p-s8-s16` の両方に実在することを確認（`git cat-file -e`）。本試運転では露出確認の引き継ぎは発生していない（S11 の範囲外の事項が無かった） |
| L23・L25 の B12 の記述 | PR #11 は変更していない（コミットメッセージどおり）。L23 は B12 を名前で挙げたまま |

## 6. 手順書にない判断

| # | 行 | 判断 |
| --- | --- | --- |
| J1 | L73・L74 | 使用形態・公開範囲を本人に確認せず、コードと公開状態の実測から決めた（L74「推測で決めない」には実測で応じたが、「本人に確認する」は行っていない） |
| J2 | L95 | jsQR の原文を GitHub のタグではなく npm 公開物（unpkg）から取得した。GitHub のタグで 404 だったため |
| J3 | L90・L95 | 名前の指定だけのフォント（M4）は原文を取得しなかった |
| J4 | L111 | 「加工したか」を、jsQR は公開物との `diff` で確認し、DADS トークンは `index.html` のコメントの記載によった（値の照合はしていない） |
| J5 | L92 | 利用上の注意事項のURLを推測で1回試し（404）、DADS サイトのリンクから正しいURLを特定した |

## 7. 手順書で曖昧だった箇所

| # | 行 | 内容 |
| --- | --- | --- |
| A1 | L120〜121 | ○「義務がない、または満たせる義務のみ」と △「出典表示・著作権表示の保持などの義務がある（満たす方法を明記）」が重なる。著作権表示の保持という満たせる義務だけがある素材（M1・M3）がどちらになるか決まらない |
| A2 | L73・L111 | 使用形態は「本人に確認する」とあり、同時に「コードから確かめられる部分は手順4で確かめる」とある。本人の申告が無い場合に、コードの確認だけで入力を埋めてよいかが不明 |
| A3 | L95 | 「使用する版のもの」が取得元（GitHub のタグ・npm の公開物）で食い違う・片方が無い場合の優先が無い |
| A4 | L90・L131 | 名前の指定だけのフォント・自作か不明な画像を素材台帳に入れるか、入れた場合の判定（判定保留を許すか）が無い。出力形式の判定欄は ○△× の3値のみ |
| A5 | L83 | 抽出の例（`grep -rnoE …`）は外部参照のみを拾い、単一HTMLに埋め込まれた第三者コード（今回の jsQR）は2本目の `copyright|license` 検索とコメントでしか分からない。L201 の記載どおりだが、埋め込みコードの抽出手段が無い |

## 8. 問題点・リスク

- DADS コードスニペットの LICENSE は main ブランチから取得しており、v2.18.2 時点の条件と同じかは未確認。
- GitHub MCP で `highlightyjp/app` の PR を取得できず、PR #11 のタイトル・本文・状態（open/merged）は未確認。

## 9. 未解決点（本人の判断事項）

- U-S11-1: ○ と △ の境界（A1）。
- U-S11-2: DADS トークン値の条件の帰属（要・法務確認 #1〜#3）。
- U-S11-3: アイコン画像の作成元、参考にした対象の有無。
- U-S11-4: 出典表示の文言を記載例に合わせるか。
