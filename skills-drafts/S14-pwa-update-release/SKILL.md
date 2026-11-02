---
name: pwa-update-release
description: Service Worker・manifest・アイコンを変えてリリースするときに、キャッシュの版を上げ、古いキャッシュの削除範囲と更新の反映方式を確認し、manifest とアイコンの整合を確かめ、iOS ホーム画面アプリでの表示確認項目（standalone 表示・セーフエリアなど）を点検して、リリースのチェック結果と実機確認の依頼手順を出す。実機での結果は未確認として扱う。
---

# PWA更新リリース（S14）

状態: 清書（ラウンド3）。評価（試行・採点）は未実施。
由来: ラウンド2の S14。統合リスト（ラウンド1）の 24 と 23。統合リストの原文は未取得（INDEX 12章）。
旧下書き: `pwa-service-worker-release`（INDEX 4章の 06）、`ios-standalone-webapp-check`（05）。番号と旧下書きの対応付けは本清書の作成セッションによる評価・解釈で、本人の決定ではない。

## 目的

Service Worker のキャッシュが原因の「更新したのに旧版が出る」「オフラインで一部が欠ける」「同じオリジンの他アプリのキャッシュを消す」と、ホーム画面アプリでの表示崩れを、リリースの前に見つける。実機でしか分からない項目は、実機確認の依頼手順として本人に渡す。

## 発動条件

- Service Worker（`sw.js`）を変えてリリースする
- manifest（`manifest.webmanifest`）を変えてリリースする
- アイコン（manifest の `icons`、`apple-touch-icon`）を変えてリリースする
- 上の3つを持つアプリで、本体（`index.html` など）を変えてリリースする（キャッシュの版を上げる必要があるため）

## 入力

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `sw.js` | 必須 | 変更前と変更後 |
| manifest | 必須 | 変更前と変更後 |
| 変更内容 | 必須 | 変えたファイルの一覧（`git diff --name-status <前>..<後> -- <アプリのディレクトリ>`）と、本人の指示 |
| 新しい版番号 | 必須 | S12 手順E で確定した値。未確定なら確認する |
| 配信オリジン | 必須 | 例: `https://highlightyjp.github.io`。同じオリジンで配信される他アプリの一覧を含む |

## 手順

### A. キャッシュの版

1. 版の持ち方を確認する。`sw.js` のキャッシュ名に版が入っているか（例: `machiapp-techo/sw.js` の `VERSION = "2.1.0"`、`CACHE = "machiapp-techo-" + VERSION`）、固定名か（例: `coorde/sw.js` の `C = "coorde-v1"`）を記録する。
2. キャッシュの版を上げる。本体の版定数（例: `APP_VERSION`）と `sw.js` の版を同じ値にする。
   ```bash
   D=machiapp-techo
   grep -nE "APP_VERSION|VERSION\s*=|const C\s*=|caches\.open" $D/index.html $D/sw.js
   ```
   固定名のキャッシュ（`coorde-v1`）の扱いは注意点 G1 のとおり本人確認事項。指示が無いまま版の持ち方（固定名→版付き）を変えない。

### B. 古いキャッシュの削除と更新の反映方式

3. activate で消すキャッシュの条件を読む。自アプリの接頭辞を持ち、かつ現行の名前でないキャッシュだけを消す条件になっているかを確認する。
   - 適合例: `k.indexOf("machiapp-techo-") === 0 && k !== CACHE`（`machiapp-techo/sw.js`）
   - 不適合例: `k !== C` だけ（`coorde/sw.js`）。同じオリジンの他アプリのキャッシュ（`machiapp-techo-*` を含む）も消える（INDEX 7章 D8）。不適合は指摘し、直すかどうかは本人が決める。
4. 更新の反映方式を確認し、表にする。
   | 確認点 | 見る場所 |
   | --- | --- |
   | 取得の方針（キャッシュ優先／ネットワーク優先） | `fetch` ハンドラ |
   | install 時に `skipWaiting()` を呼ぶか、待機中の SW をメッセージ（例: `SKIP_WAITING`）で切り替えるか | `install`・`message` ハンドラ |
   | 切り替え後に画面を再読込するか（`controllerchange`） | 本体の SW 登録部分 |
   | 利用者が更新を実行する手段（更新ボタンなど） | 本体 |
   | 他オリジン（GitHub API など）のリクエストをキャッシュしないか | `fetch` ハンドラの `origin` 判定 |
   | SW を登録する条件（例: `coorde/index.html:638` は `location.protocol === "https:"` のときだけ登録） | 本体の SW 登録部分 |
5. プリキャッシュの一覧と、本体・manifest が参照する同じオリジンの資産を突き合わせる。
   ```bash
   D=coorde
   grep -ohE '(href|src)="[^"#:$]+"' $D/index.html | sed -E 's/.*="//;s/"$//' | sort -u
   grep -ohE '"src"\s*:\s*"[^"]+"' $D/manifest.webmanifest
   grep -nE 'FILES|A\s*=|addAll' $D/sw.js
   ls $D
   ```
   参照されているのにプリキャッシュに無い資産、ディレクトリにあるのにどこからも参照されていない資産を全件列挙する（例: `coorde` の `icon-180.png` は `apple-touch-icon` として参照されるが、プリキャッシュに無い）。

### C. manifest とアイコンの整合

6. manifest の項目を確認する: `name`・`short_name`・`start_url`・`scope`・`display`・`theme_color`・`background_color`・`icons`。
7. アイコンの実寸を、manifest の `sizes` と照らす。
   ```bash
   python3 -c "import struct,sys;[print(f,struct.unpack('>II',open(f,'rb').read(24)[16:24])) for f in sys.argv[1:]]" $D/*.png
   ```
8. 本体の `<meta>` と manifest を照らす: `apple-touch-icon` のファイルが存在するか、`apple-mobile-web-app-title` と `short_name`、`theme-color` と `theme_color` が一致するか。一致しない場合は事実だけを書く（例: `machiapp-techo` は manifest の `theme_color` が `#F2F5F1`、`<meta name="theme-color">` が `#f2f2f2`／`#1a1a1a`。意図的かどうかは未確認）。

### D. iOS ホーム画面アプリの表示確認項目

9. 静的に点検する（grep で該当行を取る）。
   | # | 項目 | 確認内容 |
   | --- | --- | --- |
   | 1 | viewport | `width=device-width, initial-scale=1, viewport-fit=cover` を含むか |
   | 2 | ズーム禁止 | `user-scalable=no`・`maximum-scale=1` の有無（有無を報告するだけ） |
   | 3 | ホーム画面用の指定 | `apple-mobile-web-app-capable`・`apple-mobile-web-app-title`・`apple-mobile-web-app-status-bar-style`・`apple-touch-icon`・`theme-color`、manifest の `display: standalone` |
   | 4 | セーフエリア | 固定配置のヘッダ・タブバー・ボタンが `env(safe-area-inset-*)` を使っているか |
   | 5 | 高さ | `100vh` と `overflow:hidden` の組み合わせで縦にスクロールできなくなっていないか（`100dvh`・`min-height` の使用） |
   | 6 | 横はみ出し | flex の子の `min-width:0`、grid の `minmax(0,1fr)`、長い文字列の `overflow-wrap:anywhere` |
   | 7 | 入力欄の文字の大きさ | `input`・`textarea`・`select` が 16px 以上か（未満だとフォーカス時に拡大される） |
   | 8 | タップ領域 | ボタン・タブの高さが 44px 以上か |
   | 9 | 保存領域の分離 | Safari のタブとホーム画面アプリで保存データが別になることの案内・判定（`display-mode: standalone`・`navigator.standalone`）があるか |
   | 10 | 端末の機能 | `navigator.storage.persist`・`setAppBadge`・`share` などを、存在を確かめてから呼んでいるか |
   ```bash
   grep -nE 'name="viewport"|user-scalable|maximum-scale|apple-mobile-web-app|apple-touch-icon|theme-color|safe-area-inset|100vh|100dvh|display-mode|navigator\.standalone|storage\.persist|setAppBadge' $D/index.html
   ```
10. 横はみ出しを計測する（エミュレーション）。旧下書き 05 の `ios-overflow.cjs`（`skills-drafts/ios-standalone-webapp-check/SKILL.md` 手順2）を使い、幅 375・390・430 で `scrollWidth` と `clientWidth` を比べる。`clientWidth` が 980 前後なら viewport の指定が無い。
11. ローカルで Service Worker を確かめる。`python3 -m http.server` で配信し、Playwright（Chromium）で登録・`caches.keys()`・オフラインでの再読込を見る。`localhost` は安全な配信元として扱われるが、登録の条件が `https:` に限られているアプリ（`coorde`）はローカルの http では登録されない。その場合は「ローカルでは未検証」と書き、条件を変えて検証しない。

### E. 実機確認の依頼

12. 実機でしか確かめられない項目を、本人への依頼手順にまとめる（出力の「実機確認の依頼手順」）。結果を受け取るまで、これらは未確認とする。

## 出力

```markdown
## PWA更新リリースのチェック（<アプリ>、<旧版> → <新版>、<日付>）

### リリースのチェック結果
| # | 項目 | 結果（適合 / 不適合 / 該当なし / 未確認） | 根拠（ファイル:行、コマンド出力） |
| --- | --- | --- | --- |
| A | キャッシュの版（本体の版定数と sw.js） | | |
| B1 | 古いキャッシュの削除範囲 | | |
| B2 | 更新の反映方式（手順4の表） | | |
| B3 | プリキャッシュと参照資産（過不足の一覧） | | |
| C | manifest・アイコン・meta の整合 | | |
| D1〜D10 | iOS の表示確認項目（静的点検） | | |
| D11 | 横はみ出し（幅 375/390/430、エミュレーション） | | |
| D12 | ローカルでの SW 登録・キャッシュ・オフライン（Chromium） | | |
| E | 実機 | 未確認 | 依頼手順を下に記載 |

### 実機確認の依頼手順（iPhone、Safari）
1. Safari で <配信URL> を開き、共有 → 「ホーム画面に追加」。追加画面のアイコンと名前を記録する。
2. ホーム画面から起動し、アドレスバーが出ないこと（standalone 表示）を確かめる。
3. 上端（ステータスバー・ノッチ）と下端（ホームインジケータ）に、文字・ボタンが隠れていないかを確かめる。縦向きで確認する。
4. 入力欄をタップし、画面が拡大されないこと、横にスクロールしないことを確かめる。
5. 旧版を開いた状態で新版を公開した後、アプリを一度閉じて起動し直し、画面上の版表示が <新版> になるまでの操作（再起動の回数、更新ボタン）を記録する。
6. 機内モードで起動し、表示されるかを確かめる。
7. Safari のタブで保存したデータが、ホーム画面アプリ側には無いこと（保存領域が別であること）を確かめる。
8. 結果を項目ごとに「できた／できなかった／分からない」で返してもらう。iOS の版と機種も記録する。
```

## 根拠（本清書の作成時に確認した事実）

| # | 事実 | 区分 |
| --- | --- | --- |
| E1 | `coorde/sw.js`: 固定名 `coorde-v1`、activate は `k !== C` で削除、取得はネットワーク優先、プリキャッシュは `./` `./index.html` `./manifest.webmanifest` `./icon-192.png` `./icon-512.png` | 確認済み（ファイル読解、main `48949ec`、2026-11-02） |
| E2 | `coorde/index.html:8` の `apple-touch-icon` は `icon-180.png`（実寸 180×180）。E1 のプリキャッシュに無い | 確認済み（同上。実寸は PNG ヘッダの読み取り） |
| E3 | `coorde/index.html:638` は `location.protocol === "https:"` のときだけ SW を登録する | 確認済み（grep、2026-11-02） |
| E4 | `machiapp-techo/sw.js`: `VERSION = "2.1.0"`、キャッシュ優先、接頭辞一致で削除、`SKIP_WAITING` メッセージで切り替え。本体 `:11807` で `controllerchange` 時、`updateRequested` が真なら再読込 | 確認済み（ファイル読解・grep、2026-11-02） |
| E5 | `machiapp-techo` の manifest `theme_color` は `#F2F5F1`、本体の `<meta name="theme-color">` は `#f2f2f2`（ライト）・`#1a1a1a`（ダーク） | 確認済み（同上） |
| E6 | 両アプリのアイコン実寸は manifest の `sizes`（192×192、512×512）と一致 | 確認済み（PNG ヘッダの読み取り、2026-11-02） |
| E7 | iOS 実機での表示・更新の反映 | 未確認（実機なし） |

## 注意点

旧下書きと依頼文の定義の差異（統合していない。本人確認事項）:

| # | 旧下書き | 依頼文の定義 | 本清書の扱い |
| --- | --- | --- | --- |
| G1 | 06 手順3: ネットワーク優先なら固定名でもオンライン時は新版になる。版の更新が必須なのはキャッシュ優先の場合 | 手順の最初が「キャッシュの版を上げる」 | 手順2で版を上げるとした。固定名のアプリ（`coorde`）で、固定名のまま運用するか版付きに変えるかは本人が決める。指示なく変えない |
| G2 | 05 の発動条件は「新規作成・レイアウト変更・表示不具合の報告時」を含み、PWA 化していない単一HTMLも対象 | 発動は「SW・manifest・アイコンを変えてリリースするとき」 | 依頼文に従った。PWA でない単一HTMLのレイアウト変更・表示不具合の報告では本スキルは発動しない。その場面をどのスキルが受け持つかは未決定 |
| G3 | 06 発動条件「アイコン・ライセンス文書等、配信ファイルを追加・削除する」 | アイコンは含む。ライセンス文書などの配信ファイルは記載なし | 本体を含む配信ファイルの変更は、キャッシュの版を上げる必要があるため発動条件の4番目に含めた（評価・解釈） |
| G4 | 06 手順8: ローカル配信で検証できる（`localhost` は安全な配信元） | 記載なし | `coorde` は `https:` 以外で登録しないため、ローカル検証ができない場合があることを手順11に加えた（E3） |

品質ルール:

- エミュレーション（Chromium）の結果を、実機確認済みと書かない。根拠区分は「確認済み／評価・解釈／未確認」の3つだけを使い、実機の項目は結果を受け取るまで未確認とする。本人から受け取った実機の結果は、本人の報告があったことは確認済み、報告の中身は未確認として扱う。
- `file://` で開いた結果を SW の検証結果にしない（SW は登録されない）。
- 肯定のみの報告をしない。全項目が適合でも、未確認の項目を書く。

してはいけないこと:

- activate で自アプリ以外のキャッシュを消す条件のままにしない（見つけたら指摘する。直すかどうかは本人が決める）。
- キャッシュ優先のまま版を据え置いてリリースしない。
- 認証付きの API の応答、個人データを含む応答をキャッシュしない。
- 指示なくキャッシュの方針（キャッシュ優先・ネットワーク優先）を変えない。
- ズーム禁止の指定を独断で追加・削除しない。点検に乗じて配色・文言・構成を変えない。

## 他のスキルとの境界

| スキル | 境界 |
| --- | --- |
| S12 フェーズゲート・凍結・系譜 | 版番号の決定と系譜の登録は S12。本スキルは決まった版を SW に反映する |
| S6 `version-diff-audit` | 差分の中に SW・manifest の変更が見つかった場合、S6 から本スキルへ渡される |
| S13 保存スキーマ移行 | localStorage・IndexedDB は S13。本スキルは Cache Storage だけを扱う |
| S15 アーティファクトの単体移植 | 移植の後で PWA にする場合、S15 から本スキルを呼ぶ |
| S2 検証範囲の棚卸し | ラウンド2レビューの骨格には「検証範囲は S2」とあるが、依頼文の定義には無い。本清書では手順に入れていない（本人確認事項） |

## 抽出元

`skills-drafts/INDEX.md` の「12. ラウンド3 清書（S12〜S15）」を参照。
