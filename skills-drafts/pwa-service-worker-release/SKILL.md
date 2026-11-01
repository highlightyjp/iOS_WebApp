---
name: pwa-service-worker-release
description: manifest と Service Worker を持つアプリ（例: coorde/, machiapp-techo/）を新規PWA化またはリリース更新するときに、参照資産とプリキャッシュ一覧の突合、キャッシュ戦略に応じた版更新、旧キャッシュ削除範囲、更新導線を確認する。同一オリジンの他アプリのキャッシュを消さないことを確認する。
---

# PWA化・Service Worker 更新リリース

## 目的
Service Worker のキャッシュにより「更新したのに旧版が表示される」「オフラインで一部資産が欠ける」「他アプリのキャッシュを消す」事象をリリース前に防ぐ。

## 発動条件
- アプリに manifest / Service Worker / アイコンを新規追加する
- PWA化済みアプリの `index.html` や資産を更新してリリースする
- アイコン・ライセンス文書等、配信ファイルを追加・削除する

## 入力
| 項目 | 内容 |
|---|---|
| アプリディレクトリ | 例: `machiapp-techo/` |
| 新しい版番号 | `app-variant-lineage-registry` で確定したもの |
| 配信オリジン | 例: `https://highlightyjp.github.io`（同一オリジンの他アプリ一覧を含む） |

## 出力
| 項目 | 内容 |
|---|---|
| 資産突合表 | 参照資産 / プリキャッシュ有無 |
| 戦略判定 | cache-first / network-first と、版更新の要否 |
| 版一致表 | `APP_VERSION` と `sw.js` の `VERSION`／キャッシュ名 |
| 削除範囲判定 | activate で削除されるキャッシュ名の条件 |
| 検証結果 | ローカル配信での登録・キャッシュ一覧・オフライン再読込の結果 |

## 手順
1. 構成確認: `<link rel="manifest">`、`apple-touch-icon`、SW 登録が機能検出付き（`'serviceWorker' in navigator`）か。
2. 資産突合: `index.html` と manifest が参照する同一オリジン資産を列挙し、SW のプリキャッシュ一覧と突合する。
   ```bash
   D=machiapp-techo
   grep -ohE '(href|src)="[^"#:$]+"' $D/index.html | sed -E 's/.*="//;s/"$//' | sort -u   # JSテンプレート内の ${...} は除外
   grep -ohE '"src"\s*:\s*"[^"]+"' $D/manifest.webmanifest
   grep -nE 'FILES|A\s*=|addAll' $D/sw.js
   ```
3. キャッシュ戦略を判定する。
   - cache-first（キャッシュ優先）: リリースごとにキャッシュ名（版）の更新が必須。
   - network-first（ネットワーク優先）: 固定名でもオンライン時は新版になるが、オフライン時は最後に取得した版。
4. 版一致: `index.html` の版定数と `sw.js` の版を同じ値に更新する（`app-variant-lineage-registry` の版表記一致表に含める）。
5. activate の削除範囲: 自アプリの接頭辞を持つキャッシュのみを削除する条件になっているか確認する（例: `k.indexOf("machiapp-techo-") === 0 && k !== CACHE`）。
6. 外部オリジン（GitHub API 等）のリクエストをキャッシュしないことを確認する。
7. 更新導線: 新SWの待機時に更新できる手段（`SKIP_WAITING` メッセージ、更新確認ボタン等）があるか確認する。
8. ローカル検証: `python3 -m http.server` で配信し、Playwright で登録・`caches.keys()`・オフライン再読込を確認する（`localhost` は secure context として扱われる）。
9. 結果を報告する。実機 iOS での更新反映は「未確認」とし、確認手順を提示する。

## 注意点（やってはいけないこと）
- activate で自アプリ以外のキャッシュを削除しない（`k !== CACHE` のみの条件は同一オリジンの全キャッシュを消す）。
- cache-first のまま版を据え置いてリリースしない。
- 認証付きAPI応答・個人データを含む応答をキャッシュしない。
- `file://` での動作を SW 検証結果として扱わない（SW は登録されない）。
- 指示なくキャッシュ戦略を変更しない（変更が必要と判断した場合は指摘のみ）。

## 抽出元
`skills-drafts/INDEX.md` の「06」を参照。
