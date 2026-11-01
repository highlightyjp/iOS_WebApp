---
name: ios-standalone-webapp-check
description: iPhone の Safari およびホーム画面追加（standalone）で使う単一HTMLアプリについて、viewport・safe-area・高さ指定・横はみ出し・入力欄ズーム・タップ領域・standalone時の保存分離・端末API機能検出をリリース前に点検する。「横スクロールする」「ズームされる」「下が切れる」等の報告時にも使う。
---

# iOSホーム画面アプリ 表示・挙動チェック

## 目的
iOS Safari / standalone 特有の表示崩れ・挙動差を、リリース前にチェック表で確認する。
デザイン（配色・構成）の評価は対象外。

## 発動条件
- 新規アプリ作成、またはレイアウト・CSS変更を含む更新
- 利用者から「横スクロールする」「入力時に拡大される」「下部が隠れる」「保存したデータが無い」等の報告
- PWA化（`pwa-service-worker-release` と併用）

## 入力
| 項目 | 内容 |
|---|---|
| 対象HTML | パス |
| 実機確認の可否 | 利用者が iPhone 実機で確認できるか |

## 出力
| 項目 | 内容 |
|---|---|
| チェック表 | 項目 / 結果（OK・NG・該当なし・未確認）/ 該当行 |
| 横はみ出し計測 | 幅375/390/430での `scrollWidth` と `clientWidth`、はみ出し要素候補 |
| 未確認事項 | エミュレーションで確認できない項目（standalone挙動・バッジ・persist） |

## 手順
1. 静的チェック（grep で該当行を取得）。
   | # | 項目 | 確認内容 |
   |---|---|---|
   | 1 | viewport | `<meta name="viewport">` の有無。`width=device-width, initial-scale=1, viewport-fit=cover` を含むか |
   | 2 | ズーム禁止指定 | `user-scalable=no` / `maximum-scale=1` の有無（有無を報告するのみ） |
   | 3 | ホーム画面メタ | `apple-mobile-web-app-capable` / `mobile-web-app-capable` / `apple-mobile-web-app-title` / `apple-mobile-web-app-status-bar-style` / `apple-touch-icon` / `theme-color` |
   | 4 | safe-area | 固定配置のヘッダ・タブバー・FAB が `env(safe-area-inset-*)` を考慮しているか |
   | 5 | 高さ | `100vh` 固定と `overflow:hidden` の組み合わせで縦スクロール不能になっていないか（`100dvh` / `min-height` の使用状況） |
   | 6 | 横はみ出し対策 | flex子の `min-width:0`、grid の `minmax(0,1fr)`、長文の `overflow-wrap:anywhere`、`input[type=date]` の `appearance` |
   | 7 | 入力欄の文字サイズ | `input` / `textarea` / `select` が 16px 以上か（未満だとフォーカス時に拡大） |
   | 8 | タップ領域 | ボタン・タブの `min-height` が 44px 以上か |
   | 9 | standalone の保存分離 | Safari タブとホーム画面アプリで保存領域が別である旨の案内・判定（`display-mode: standalone` / `navigator.standalone`）があるか |
   | 10 | 端末API の機能検出 | `navigator.storage.persist` / `setAppBadge` / `share` / `vibrate` 等を機能検出してから呼んでいるか |
2. 横はみ出し計測（エミュレーション）。
   ```js
   // ios-overflow.cjs  使い方: node ios-overflow.cjs <HTML...>
   const { chromium, devices } = require('playwright');
   const path = require('path');
   (async () => {
     const browser = await chromium.launch();
     for (const f of process.argv.slice(2)) for (const width of [375, 390, 430]) {
       const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height: 844 } });
       const page = await ctx.newPage();
       await page.goto('file://' + path.resolve(f), { waitUntil: 'load' }).catch(() => {});
       await page.waitForTimeout(500);
       const r = await page.evaluate(() => {
         const W = document.documentElement.clientWidth;
         const over = [...document.querySelectorAll('body *')]
           .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 1; })
           .slice(0, 5).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''));
         return { scrollW: document.documentElement.scrollWidth, W, over };
       });
       console.log(`${r.scrollW > r.W ? 'FAIL' : 'PASS'} ${f} w=${width} scrollWidth=${r.scrollW} clientWidth=${r.W} 候補:${r.over.join(' ')}`);
       await ctx.close();
     }
     await browser.close();
   })();
   ```
   `clientWidth` が 980 前後になる場合は viewport 未指定であり、項目1の NG として扱う。
3. 実機でしか確認できない項目（9・10、ホーム画面起動時の表示）は「未確認」として利用者に確認手順を提示する。
4. チェック表を報告する。修正は利用者の指示を受けてから行う。

## 注意点（やってはいけないこと）
- エミュレーション結果を実機確認済みと記載しない。
- ズーム禁止指定の追加・削除を独断で行わない（有無の報告のみ）。
- 点検に乗じて配色・文言・構成を変更しない。
- 機能検出なしで端末APIを呼ぶ実装を追加しない。
- 修正時、指摘箇所以外のCSSを書き換えない。

## 抽出元
`skills-drafts/INDEX.md` の「05」を参照。
