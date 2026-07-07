# A1 議事録整形ツール(minutes-formatter)

v0.1.0 — 社内利用中。B2フェーズでの外部販売を想定した汎用パッケージ構成。

## 何をするツールか
会議ログ(文字起こし後のテキスト)から、A1運用手順(`sidebiz/A1_minutes/operation.md`)
が定める7セクション構成の議事録を作成する作業を支援する。
- **決定的に処理する部分(コード)**: タイムスタンプ除去・整形、出力の必須セクション有無チェック、
  Markdown→HTML変換
- **意味理解が必要な部分(Claude)**: 口語→文語変換、ひらがな→漢字変換、セクション分類

## 使い方(Claude Codeモード・APIキー不要)
```
node format-minutes.mjs prepare <raw_log.txt> --out=output
# → output/task_package.md が生成される
# Claude Codeセッションでこのファイルを読み、契約(prompt-template.md)に従って
# output/minutes_output.md を作成する
node format-minutes.mjs validate output/minutes_output.md
node format-minutes.mjs render output/minutes_output.md --out=output/minutes_output.html
```

## 使い方(APIモード・顧客が自分のAnthropicキーで単体実行する想定)
```
export ANTHROPIC_API_KEY=sk-...
node format-minutes.mjs run <raw_log.txt> --out=output
```

## サンプル(架空データ)
`sample-input/raw_log_sample.txt` → `sample-output/minutes_output.md`
→ `sample-output/minutes_output.html` の一連の動作を確認済み。
出品ページのポートフォリオ添付候補。

## 制約・注意事項
- 匿名化は行わない(NDA同意取得プロセス側で別途対応。`contracts/nda_ai_usage_clause.md`参照)
- 原文にない情報を補完・創作しない契約になっている(prompt-template.md参照)
- 本ツールのQA(`validate`)は必須セクションの有無という形式チェックのみ。
  誤変換・文脈誤りの検知はできないため、A1運用手順が定める人力検品は省略できない
- 所要時間短縮効果は未計測(プロンプト実行+人力検品の合計時間を今後の受注実績で計測し、
  A1運用手順の所要時間根拠を更新する)

## 販売パッケージ化にあたっての未決事項
- 価格:B2_products/operation.md では議事録整形プロンプト集として3,000円を仮置き。
  本ツール(コード同梱)としての適正価格は未検証 → pending_decisions化を検討
- 顧客のVBA/Excelスキル水準に応じたセットアップ手順(Node.js導入案内)が別途必要
