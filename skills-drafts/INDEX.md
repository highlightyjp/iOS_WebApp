# スキル候補 INDEX

調査日: 2026-11-01
対象: `highlightyjp/iOS_WebApp` の全ブランチ（`main` 69コミット、`claude/generate-railway-data-uTIy4` 22コミット、`claude/phase-0-execution-trd0vd` 5コミット、`claude/dasgen-local-setup-929p4z` 1コミット）
本書の構成: 1 調査方法 / 2 リポジトリ概況 / 3 観測した作業パターン / 4 候補一覧 / 5 候補別の選定理由と抽出根拠 / 6 選外 / 7 調査中に検出した逸脱・不整合（事実） / 8 未確認事項 / 9 下書き同梱スクリプトの検証記録

---

## 1. 調査方法

| # | 方法 | 内容 |
|---|---|---|
| M1 | 全履歴取得 | clone が shallow だったため `git fetch --unshallow` で全履歴・全ブランチを取得 |
| M2 | 全ファイル読解 | main の HTML 17本・`coorde/`・`machiapp-techo/`、他ブランチの文書・スクリプトを読解 |
| M3 | 履歴の版ごと検査 | `estateos.html`・`nexa_v1_0_0_full.html` の全46版を取り出し、構造検査（01のスクリプト）と機能台帳差分（02のスクリプト）を実行 |
| M4 | 横断grep | 保存キー、`localStorage.clear()`、特殊入力値、外部URL、スタブ痕跡、viewport 指定 |
| M5 | 類似度計測 | 資産管理系15ファイル間の行単位類似度（`difflib.SequenceMatcher`） |
| M6 | ハッシュ照合 | `PHASE_C_SILENCE_LOCK.md` 記載ハッシュと実ファイルの SHA-256 |
| M7 | 生成データ検査 | 凍結版 `nexa_v1_0_0_full.html` に埋め込まれた駅ID・路線IDの規則準拠 |
| M8 | 公開状態確認 | リポジトリ一覧APIの visibility、GitHub Pages 上の各アプリURLの HTTP ステータス |
| M9 | エミュレーション計測 | Playwright（Chromium・iPhone 13 プロファイル）で幅375/390/430の横はみ出し |

選定基準（全て満たすものを候補とした）:
1. 履歴またはアプリ横断で2回以上発生している作業である
2. その作業で失敗・欠陥・手戻りが実際に記録されている、または手順が明文化されて運用されている
3. 手順・判定を文章またはコマンドで固定できる

---

## 2. リポジトリ概況

| 区分 | ファイル | 作成経路 | 備考 |
|---|---|---|---|
| 資産管理系（単一HTML） | `!DOCTYPE.html` `money.html` `moneyapp.html` `shisanmaru*.html`（5本）`assetmaru.html` `SUI_ver.*.html`（5本）`SUI_ios26.html` | 2026-01-10 に Web UI アップロードで15本を順次追加 | 同一系統の派生が別ファイルで並存 |
| 不動産評価系（単一HTML） | `estateos.html`（23版）`nexa_v1_0_0_full.html`（23版） | 2026-01-17〜02-15 に Web UI で全文差し替えを反復 | `nexa` は別ブランチで Phase A〜C の凍結運用 |
| 移植アプリ（PWA） | `coorde/` `machiapp-techo/` | 2026-10-21〜23 に Claude セッションが作成 | claude.ai ランタイム互換層、SW、manifest |
| 別ブランチ | `data/`・`PHASE_*.md`（鉄道データ生成・凍結）、`sidebiz/`（フェーズゲート運用）、`dasgen/`（Vite/React 移設） | Claude セッション | main 未マージ |
| 配信 | `https://highlightyjp.github.io/iOS_WebApp/` 配下 | GitHub Pages | 全アプリが同一オリジン（M8で HTTP 200 確認） |

---

## 3. 観測した作業パターン

| ID | パターン | 定量根拠 |
|---|---|---|
| P1 | AI出力の全文差し替え・分割貼り付けによる更新 | main 69コミット中、Web UI 既定メッセージ（`〇〇を更新` 39件、`Add files via upload` 17件）が56件。`estateos.html` は23版で `<title>` が14種類（`nexa` は23版で11種類）に変化、行数は 949→526→1082→660→406… と前版比 -50%〜+185% で変動 |
| P2 | 貼り付け後の構造破損と手修正 | `estateos.html` 23版中9版、`nexa` 23版中1版が構造検査 FAIL（M3）。`<script>` タグの付け外しのみの修正コミットが4件（`0a60b9a` `88a5c9d` `616daed` `d9305d4`） |
| P3 | 再生成時の機能消失・スタブ混入 | `estateos` `87e5213→6b492e1` で関数27削除、`nexa` `1fbbe98→44e1db9` で関数16削除（M3）。現行5ファイルに `omitted for brevity` `Stub` `Simplified` 等の痕跡と空関数 |
| P4 | 派生版を別ファイルで量産 | 資産管理系15ファイルを1日で追加。最近傍類似度は 0.21〜0.91（M5）。版表記は `ver.1.0.0`／`_kai_20260110`／`_perfect`／`_super`／`FIXED`／`FINAL` が混在。README は12バイト |
| P5 | 保存キーの版ごとの付け替え・初期化 | SUI 系で `sui_data_v1`→`sui_fixed_data`→`sui_final_data`→`sui_ult_data`、資産丸系で `am_royal_*`→`am_complete_*`→`am_final_*`。`localStorage.clear()` が8ファイル。`machiapp-techo` は版付き保存・移行前退避・読み戻し照合を実装 |
| P6 | iOS ホーム画面向けの表示修正 | `48949ec`（横スクロール修正・入力欄16px・standalone 保存分離警告・persist・バッジ）、`nexa 6aa1234`（title「iOS safe-area 対応」）、`estateos.html` L56「Fix for v19.0 bug」（縦スクロール）。`user-scalable=no` が16ファイル |
| P7 | PWA 化と SW 版更新 | `553ca79`（coorde PWA 追加）、`48949ec`（`APP_VERSION` と `sw.js` の `VERSION` を同時に 2.0.0→2.1.0） |
| P8 | claude.ai アーティファクトの単体移植 | `7962ec5`「standalone, no personal data」（`window.claude.use` 互換層、seed 空）、`cd631bb`「アプリ本体は無変更」で同期追加、`e404261` mcp 中継、`dasgen/README.md`「移設時の承認済み改変（2件のみ）」 |
| P9 | フェーズゲート運用 | railway ブランチで Phase A-0〜C-10 の22コミット、sidebiz で `state.json`／`phase_gates.md`／`execution_log.md`、dasgen `CLAUDE.md` のフェーズ管理条項 |
| P10 | 凍結宣言とハッシュ封印 | `PHASE_B_FREEZE.md`、`PHASE_C_SILENCE_LOCK.md`（15ファイルの SHA-256、`<!-- FROZEN -->` タグ） |
| P11 | スクリプトによるHTML一括置換・データ埋め込み | `data/silentize.py`（置換23件）、`data/embed_data.py`（正規表現で `D`/`LN` を差し替え） |
| P12 | 公的一次データからのデータ生成 | `data/generate_railway_data.py`（国土数値情報 N02-21 → 9,470駅・553路線）、`validate_cases.py`（4ケース）。現行 main の `nexa` は GeoJSON を利用者が読み込む方式 |
| P13 | 公開リポジトリへの個人データ混入への対処 | `7962ec5` の「no personal data」と seed 空化。リポジトリは public（M8） |
| P14 | 外部CDN・API依存 | `chart.js` 版未固定12ファイル、為替API 9ファイル、QR生成API 4ファイル、駅API（`estateos`）、GitHub Actions 中継（`coorde`） |

---

## 4. 候補一覧

| No | スキル（ディレクトリ） | 対応パターン | 主な発動場面 |
|---|---|---|---|
| 01 | `single-html-integrity-check` | P1 P2 | AI出力の貼り付け・差し替え直後、コミット前 |
| 02 | `regenerated-code-regression-guard` | P1 P3 | 全文差し替えの前 |
| 03 | `app-variant-lineage-registry` | P4 P1 | 新版・派生版の作成時 |
| 04 | `storage-schema-migration` | P5 | 保存キー・構造・リセット処理の変更時 |
| 05 | `ios-standalone-webapp-check` | P6 | 新規作成・レイアウト変更・表示不具合報告時 |
| 06 | `pwa-service-worker-release` | P7 | PWA化・リリース時 |
| 07 | `artifact-standalone-port` | P8 | claude.ai 作成物のリポジトリ移植時 |
| 08 | `phase-gate-transition` | P9 | フェーズ付き指示・フェーズ完了宣言時 |
| 09 | `freeze-seal-verify` | P10 | 凍結宣言時・凍結物を含むマージ前 |
| 10 | `deterministic-html-patch` | P11 | スクリプトによる一括置換・埋め込み時 |
| 11 | `open-data-embedding-pipeline` | P12 | 一次データからのデータ生成・更新時 |
| 12 | `public-repo-exposure-check` | P13 P14 | push 前（Pages 公開前） |
| 13 | `external-dependency-inventory` | P14 | 外部依存の追加時・再利用時 |

各ディレクトリの `SKILL.md` は、目的／発動条件／入力／出力／手順／注意点（やってはいけないこと）を含む。

---

## 5. 候補別の選定理由と抽出根拠

### 01 single-html-integrity-check
- 選定理由: 構造破損が履歴上で反復し（P2）、検出を機械化できる。
- 抽出根拠:
  - `estateos.html` FAIL 9版: `1256943` `0a60b9a` `b681945` `88a5c9d` `15365fb` `7665302` `bffa240` `616daed` `d9305d4`。内訳は script 開閉不一致、script 外へのJS漏出（最大124行）、`</html>` 後の残骸（最大159行）、DOCTYPE 2個（文書連結）。
  - `nexa_v1_0_0_full.html` `e1ca891`: インラインJS構文エラー2ブロック（`Invalid left-hand side in assignment`）。
  - `estateos.html` の当時のコード内コメント「Module 1, 2のクラスは既に定義されている前提」「PART 2: THE CORE WORKER」から、分割出力の貼り合わせであることを確認。
  - タグ付け外しのみの修正（`0a60b9a` `88a5c9d` `616daed` `d9305d4`）後も漏出が残存（各版 leak=124/61/51/74）。

### 02 regenerated-code-regression-guard
- 選定理由: 全文差し替えのたびに機能台帳が大きく入れ替わり（P3）、差分を見ずに置換されている。
- 抽出根拠:
  - 関数の削除数（02のスクリプト）: `estateos 87e5213→6b492e1` 27、`e3b6b8f→7f3698a` 13、`e660ca1→1fbbe98` 15、`nexa 1fbbe98→44e1db9` 16。
  - スタブ痕跡: `shisanmaru_kai_20260110.html` L701・L734・L735・L741、`shisanmaru_perfect.html` L658・L675、`shisanmaru_super.html` L650、`assetmaru.html` L576・L618・L621、`SUI_ver.1.0.0.html` L653。
  - `assetmaru.html` は `shisanmaru_super.html` 比で空関数2件（`renderTrend` `recordSnap`）、`renderBS` は `"Loading..."` 表示のみ。

### 03 app-variant-lineage-registry
- 選定理由: 派生ファイルが系譜情報なしで並存し（P4）、どれが現行か・何が変わったかを履歴から再構成できない。
- 抽出根拠:
  - 2026-01-10 の追加順: `!DOCTYPE` → `money` → `moneyapp` → `shisanmaru` → `shisanmaru2` → `_kai_20260110` → `_perfect` → `_super` → `assetmaru` → `SUI_ver.1.0.0` → `1.0.1` → `2.0.0` → `3.0.0` → `4.0.0` → `SUI_ios26`（コミット時刻順）。
  - 最近傍類似度: `_perfect`↔`_super` 0.91、`SUI 3.0.0`↔`4.0.0` 0.73、`money`↔`moneyapp` 0.21。
  - コミットメッセージ: 既定文言56件、内容と一致しない `Update print statement from 'Hello' to 'Goodbye'` 等4件（`6b492e1` `1256943` `4891129` `74a512f`、いずれも `estateos.html` の変更）。
  - 対照例: `48949ec` はメッセージに版と変更要約を記載し、`APP_VERSION` と `sw.js` を同時更新。

### 04 storage-schema-migration
- 選定理由: 端末内保存が唯一の正本であり、キー付け替え・全消去・検証失敗時削除がデータ消失に直結する（P5）。良い実装（machiapp-techo）が既に存在し、手順として抽出できる。
- 抽出根拠:
  - キー付け替え: SUI `sui_data_v1`（1.0.0）→`sui_fixed_data`（1.0.1）→`sui_final_data`（2.0.0）→`sui_ult_data`（3.0.0/4.0.0）、`sui_ios26_data`。
  - `localStorage.clear()`: `money.html` `assetmaru.html` `SUI_ios26.html` `SUI_ver.1.0.0/1.0.1/2.0.0/3.0.0/4.0.0.html`。全アプリが同一オリジン `https://highlightyjp.github.io` で配信されている（M8）。
  - `estateos.html` L340-370: 検証失敗時に `localStorage.removeItem('aegis_state_v21')`。
  - 浅いマージ `{...DEF, ...JSON.parse(s)}`: SUI 1.0.1〜4.0.0・ios26。
  - 参照実装: `machiapp-techo/index.html` L10701-10768（版付き保存、未知版で保存停止、移行前スナップショット、読み戻し件数照合）、L11628-11700（書き出し・読込・復元）。`coorde/index.html` L517-518 コメント（旧 localStorage から IndexedDB へ初回移行）。

### 05 ios-standalone-webapp-check
- 選定理由: iOS 固有の表示・挙動修正が複数アプリで反復している（P6）。
- 抽出根拠:
  - `48949ec`: `overflow-x: clip`、`min-width:0`、`minmax(0,1fr)`、`overflow-wrap:anywhere`、`input[type=date]` の `appearance:none`、`.mono` の 12px→16px、standalone 判定と「Safariのタブとホーム画面アプリでは保存データが別」警告、`navigator.storage.persist`、`setAppBadge`。
  - `nexa 6aa1234` の title「修正版（iOS safe-area 対応）」。
  - `estateos.html` L56「Allow Vertical Scroll (Fix for v19.0 bug)」と `min-height: 100dvh`。
  - 現行 `nexa_v1_0_0_full.html` は viewport 指定なし。M9 で `clientWidth=980`（デスクトップ幅レイアウト）、幅375で横はみ出し1px。

### 06 pwa-service-worker-release
- 選定理由: PWA 化済み2アプリで SW 方針が異なり、版更新・削除範囲・資産突合を毎回確認する必要がある（P7）。
- 抽出根拠:
  - `machiapp-techo/sw.js`: cache-first、`VERSION` 付きキャッシュ名、接頭辞一致のみ削除、`SKIP_WAITING`。`48949ec` で `APP_VERSION` と同時に版更新。
  - `coorde/sw.js`: network-first、固定名 `coorde-v1`、activate で `k !== C` の全キャッシュを削除。プリキャッシュに `icon-180.png`（`apple-touch-icon`）が無い。

### 07 artifact-standalone-port
- 選定理由: claude.ai 作成物の移植が3件（coorde・machiapp-techo・dasgen）あり、「本体非改変・互換層分離・承認済み改変の列挙」という共通方針が記録されている（P8）。
- 抽出根拠:
  - `coorde/index.html` L516-520: `claude.use()` 互換層（db=IndexedDB、user=固定id、sample/mcp=null、downloads=Blob）、既存 `window.claude` があれば無処理。L515 seed `{}`。
  - `cd631bb` 内コメント「同期設定UI（アプリ本体は無変更）」、`e404261` mcp 中継を互換層に追加。
  - `dasgen/README.md`「移設時の承認済み改変（2件のみ）」、`dasgen/CLAUDE.md`「src/App.jsx の既存ロジック・定数・構造は非改変」。

### 08 phase-gate-transition
- 選定理由: フェーズ制が3ブランチで運用され、正本・ゲート・ログの手順が明文化されている（P9）。
- 抽出根拠:
  - `sidebiz/00_core/CLAUDE.md`（読込順、自律範囲、人間承認事項、`pending_decisions`）、`sidebiz/runbook/phase_gates.md`、`state.json`、`execution_log.md`（ゲート未達で据え置いた判断の記録、規約違反手段の不採用記録）。
  - railway ブランチのコミット件名（`Phase A-3 沈黙化完了` 〜 `Phase C-10 永続沈黙固定`）。
  - `dasgen/CLAUDE.md` フェーズ管理条項。

### 09 freeze-seal-verify
- 選定理由: 凍結は宣言・ハッシュで運用されているが、凍結物と main が乖離しており、マージ前照合の手順が必要（P10）。
- 抽出根拠:
  - `PHASE_C_SILENCE_LOCK.md` の15ファイル・8桁ハッシュは、`2b8489a`・`9ec804f` 時点の実ファイルと全件一致（M6）。
  - 凍結版 `nexa_v1_0_0_full.html`（SHA-256 先頭 `324efac8`）と main 現行（先頭 `3802df6e`）が不一致。main は凍結日（2026-02-06）後の `ea4166e`（2026-02-15）で更新。railway ブランチは main 未マージ（分岐点 `f0e1052`）。
  - `B-2/B-3/B-4_*.log` は項目名と PASS のみで、実行コマンド・出力の記録が無い。

### 10 deterministic-html-patch
- 選定理由: 文字列置換スクリプトでのHTML改変が運用されており、ヒット件数検証・相対パス化を手順として固定できる（P11）。
- 抽出根拠:
  - `data/silentize.py`: `content.replace` 23回、件数検証なし、入出力とも絶対パス `/home/user/iOS_WebApp/...`。
  - `data/embed_data.py`: `re.sub` で `const D=` / `const LN=` を置換、件数検証なし、絶対パス。
  - 再現確認: `silentize.py` の置換表を本スキルの `patch.py` に移し、`c596253` 版へ適用した結果が `bcf6686` 版と SHA-256 で一致。凍結版に対しては23件すべて件数0で NG となり適用されないことを確認（9章）。

### 11 open-data-embedding-pipeline
- 選定理由: 一次データからの生成が実施され、仕様検証が件数と4ケースに限定されていたため、全件検証で初めて検出される欠陥が残っている（P12）。
- 抽出根拠:
  - `c596253` コミット本文: 9,470駅、553路線、4ケース PASS、ID設計 `station_{romaji}_{lat6}_{lng6}`。
  - 凍結版の埋め込みデータ（M7）: 駅ID 9,069/9,470（95.8%）、路線ID 528/553（95.5%）が非ASCII文字を含む（例: `station_二月田_…`、`jr_七尾`）。`generate_railway_data.py` の `KANJI_READINGS` は180語。
  - `data/.gitignore` で一次データ・中間ファイルを除外。
  - `estateos.html` L392-395「COMPRESSED MASTER DATA (Simulated LUT)」: 2件のみ、復号すると駅名が `二子玉巜` `上木`（文字化け・欠落）。

### 12 public-repo-exposure-check
- 選定理由: リポジトリが public で、main への push が GitHub Pages で即公開される。個人データ除去の作業（`7962ec5`）が既に発生している（P13）。
- 抽出根拠:
  - リポジトリ visibility: public（M8）。Pages で各アプリが HTTP 200（M8）。
  - `7962ec5`「standalone, no personal data」と seed 空化。
  - `money.html` `moneyapp.html` `!DOCTYPE.html` `shisanmaru.html` の既定データに金融機関名・金額。`machiapp-techo/index.html` の定数に利用者個人の状況を前提とした記述。
  - パスコードの平文 localStorage 保存14ファイル。`coorde` は GitHub トークンを IndexedDB に保存、`dasgen` は APIキーを sessionStorage に保存（README 記載）。
  - `shisanmaru_perfect.html` L540・`shisanmaru_super.html` L523: `JSON.stringify(data)` 先頭200文字を `api.qrserver.com` の URL に含めて送信。
  - 特殊入力値による分岐: `9999`（全消去）・`0000`（初期データで解除）・`8888`（隠し画面）が SUI 系6本・`assetmaru`・`shisanmaru_perfect/super` に存在。

### 13 external-dependency-inventory
- 選定理由: 外部依存が多数あり、版固定・失敗時挙動・外部前提が記録されていない（P14）。
- 抽出根拠:
  - `https://cdn.jsdelivr.net/npm/chart.js`（版未固定）12ファイル、`remixicon@3.5.0`（固定）14ファイル、Google Fonts。
  - `api.exchangerate-api.com` 9ファイル（失敗時 alert のみ）、`api.qrserver.com` 4ファイル、`express.heartrails.com`（`estateos.html`、内部データへフォールバック）。
  - `coorde` の中継は利用者が設定するリポジトリの `actions/workflows/coorde-fetch.yml` に依存（既定値 `highlightyjp/app`）。
  - `sidebiz` `eab899b`: 公式API・フィードの有無を確認し、ブラウザ偽装による取得を不採用とした記録。

---

## 6. 選外とした候補

| 候補 | 選外理由 |
|---|---|
| AIへの生成依頼文（プロンプト）作成 | 依頼文がリポジトリに残っておらず、抽出根拠が無い（`estateos.html` の「Copyright 2026 Y.T. & Gemini」から外部AI利用の事実のみ確認） |
| テーマ・配色の切替実装 | 見た目の設計判断であり、手順として固定する対象ではない |
| 為替レート取得 | 単一機能。外部依存の観点は13に包含 |
| デザインシステム（DADS）トークン適用とライセンス表記 | 発生2件（coorde・machiapp-techo）が同一期間の作成で、手順の揺れを判断できる履歴が無い。ライセンス・出典の公開面は12の対象 |
| 副業案件の出品文・提案文作成 | Webアプリ開発・運用の範囲外。`sidebiz/*/operation.md` が既に手順書として存在 |
| ローカル常駐（pm2）運用 | 発生1件（dasgen）のみ |

---

## 7. 調査中に検出した逸脱・不整合（事実）

本PRではいずれも修正していない。

| # | 対象 | 事実 |
|---|---|---|
| D1 | `nexa_v1_0_0_full.html` | railway ブランチで凍結（2026-02-06、SHA-256 先頭 `324efac8`）された版と main 現行版（先頭 `3802df6e`、`ea4166e` 2026-02-15）が異なる。凍結ブランチは main 未マージ |
| D2 | `PHASE_C_SILENCE_LOCK.md` | ハッシュが先頭8桁のみ記録（照合は全件一致） |
| D3 | `B-2/B-3/B-4_*.log` | 実行コマンド・出力の記録が無い |
| D4 | 凍結版 nexa 埋め込みデータ | 駅ID 9,069/9,470、路線ID 528/553 が非ASCII文字を含み、ID規則 `station_{romaji}_…` と不一致 |
| D5 | `data/silentize.py` `data/embed_data.py` | 絶対パス6箇所、置換件数の検証なし |
| D6 | `estateos.html` L395 | 擬似データ2件、駅名が破損（`二子玉巜` `上木`） |
| D7 | 同一オリジン上の全消去 | `localStorage.clear()` 8ファイル。実行すると同一オリジンの `machiapp-techo`（`mt:*`）・`coorde`（`coorde:*` `coorde.ai`）等の localStorage も消える |
| D8 | `coorde/sw.js` | activate が `coorde-v1` 以外の同一オリジン全キャッシュを削除する（`machiapp-techo-*` を含む）。プリキャッシュに `icon-180.png` が無い |
| D9 | `nexa_v1_0_0_full.html`（main） | viewport 指定なし |
| D10 | 16ファイル | `user-scalable=no` 指定 |
| D11 | 14ファイル | パスコードを localStorage に平文保存 |
| D12 | 9ファイル | 特殊入力値 `9999` / `0000` / `8888` による全消去・解除・隠し画面の分岐 |
| D13 | `shisanmaru_perfect.html` `shisanmaru_super.html` | 利用者データ（JSON先頭200文字）を外部QR生成APIへ送信 |
| D14 | 12ファイル | `chart.js` の版未固定 |
| D15 | 5ファイル | スタブ・空関数・「省略」痕跡（5章 02 参照） |
| D16 | main コミット履歴 | 内容と一致しないメッセージ4件、空コミット1件（`c967c93`） |
| D17 | `sidebiz/runbook/execution_log.md` | 先頭が 2026-07-08、続く項目が 2026-07-07 で時系列が逆転。コミット時刻（UTC 07-07 22:25〜07-08 03:33）との対応でタイムゾーン表記なし |
| D18 | `sidebiz/tools/README.md` | 「API키不要」にハングル文字が混入 |
| D19 | `README.md` | 12バイト（アプリ一覧・配信URL・現行版の記載なし） |

---

## 8. 未確認事項

| # | 事項 | 理由 |
|---|---|---|
| U1 | 既定データ（金融機関名・金額等）が実データか架空値か | リポジトリ内に判断材料なし |
| U2 | `coorde-fetch.yml` ワークフローの存在・内容 | 本セッションのアクセス範囲外のリポジトリ |
| U3 | iOS 実機での表示・standalone 挙動 | 実機なし。5章 05 の計測はエミュレーション |
| U4 | どの資産管理系ファイルが現行利用版か | 履歴・文書に記載なし |
| U5 | railway / sidebiz / dasgen ブランチを main へマージする予定の有無 | 記載なし |

---

## 9. 下書き同梱スクリプトの検証記録（2026-11-01）

| スキル | スクリプト | 検証内容 | 結果 |
|---|---|---|---|
| 01 | `check-html.mjs` | main 現行19ファイル | 19件 PASS |
| 01 | 同上 | `estateos` 23版・`nexa` 23版 | FAIL 9版・1版（5章 01 の一覧と一致） |
| 02 | `inventory_diff.py` | `shisanmaru_super.html` → `assetmaru.html` | スタブ3件・空関数2件・外部URL削除1件を検出、終了コード1 |
| 05 | `ios-overflow.cjs` | `machiapp-techo` / `estateos` / `nexa` | 前2者 PASS、`nexa` は幅375で FAIL（viewport 未指定） |
| 10 | `patch.py` | `silentize.py` の置換表23件を `c596253` 版へ適用 | 23件すべて件数1、出力が `bcf6686` 版と SHA-256 一致 |
| 10 | 同上 | 同じ置換表を凍結版へドライラン | 23件 NG（件数0）、適用されず |

スクリプトは各 `SKILL.md` に本文として記載した。リポジトリへの独立ファイルとしての追加は行っていない。
