# DAS-Gen 移設手順（Claude Code）

## 初回セットアップ
    npm install
    npm run dev
ブラウザで http://localhost:3000 を開き、フェーズAでAPIキー入力。

## 常駐運用
    npm run build
    npm i -g pm2 serve
    pm2 start "serve -s dist -l 3000" --name dasgen
    pm2 save

## Claude Codeでの操作
本ディレクトリ直下で claude を起動（CLAUDE.md自動読込）。
App.jsxは凍結対象。変更は監査指摘形式の報告のみ受理。

## 移設時の承認済み改変（2件のみ）
1. callModel: x-api-key / anthropic-version / dangerous-direct-browser-access ヘッダー追加
2. APIキー入力: sessionStorage保存化
上記以外、claude.ai版と完全同一。
