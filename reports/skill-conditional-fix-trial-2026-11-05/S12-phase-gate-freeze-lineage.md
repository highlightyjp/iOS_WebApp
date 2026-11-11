# 試運転記録: S12 `phase-gate-freeze-lineage`（フェーズゲート・凍結・系譜）

- 試運転日: 2026-11-05（実行 2026-11-05T00:07Z〜00:08Z）
- 手順書: `highlightyjp/iOS_WebApp` PR #7 のブランチ `claude/kind-cray-alyc2p`（コミット 6e218b9）の `skills-drafts/S12-phase-gate-freeze-lineage/SKILL.md`（blob ca59c3d、193行、SHA-256 5a176ec7536aa1e19581edaf3a5d8474d77ad3ae8c716fe6e98700cd1fad881c）
- 手順書は変更していない。`L<n>` は上記 blob の行番号。
- 実行環境: git 2.43.0、GNU coreutils `sha256sum`

## 1. サンプルタスク

- 発動条件 L22「次のフェーズを始める」を模擬し、手順 D（改変の検知、L83〜94）だけを実行した。手順 A・B・C・E は対象外。
- 対象: railway ブランチ `claude/generate-railway-data-uTIy4`（HEAD 9ec804f）の封印台帳 `PHASE_C_SILENCE_LOCK.md`（15件）。
- 比較先: (1) railway HEAD、(2) 台帳の「コミットID」`2b8489a`、(3) `main`（48949ec）。

## 2. 出力（L127〜129 の形式）

```markdown
## 改変検知の結果（2026-11-05T00:08Z、比較先 claude/generate-railway-data-uTIy4 @ 9ec804f / 2b8489a / main @ 48949ec）
```

台帳の値は先頭8桁のみ（`PHASE_C_SILENCE_LOCK.md:9-23`）。照合は前方一致（手順13）。

| ファイル | 台帳の値 | 再計算した値（railway HEAD、64桁） | 一致（railway HEAD） | 一致（2b8489a） | main | 比較先での最終更新（railway） |
| --- | --- | --- | --- | --- | --- | --- |
| nexa_v1_0_0_full.html | 324efac8 | 324efac81a3eba1dfbed92442c3afddf779d3af72d9c0d5b82cb3b1fe3d1241b | 一致（前方） | 一致（前方） | 不一致（3802df6e346cf6e5823f0218fa90765d9d58d622be6bb51d9aaa2e4c176d0b1c、最終更新 ea4166e 2026-02-15 10:49:46 +0900） | 1b235d6 2026-02-05 03:30:04 +0000 |
| PHASE_B_CONSTITUTION.md | c82723f0 | c82723f0b19d4739e97622e0ff813d5223ebcada7fa7dbd391cb100f5b677a34 | 一致（前方） | 一致（前方） | 存在しない | 5c7fb89 2026-02-05 03:31:15 +0000 |
| PHASE_B_FREEZE.md | 4c8fe53e | 4c8fe53e989aa4f8f1c64f9a0746619893e411f7b97d3f75aef3ab23cb67085c | 一致（前方） | 一致（前方） | 存在しない | 1aec24f 2026-02-05 14:10:33 +0000 |
| PHASE_C_CONSTITUTION.md | d9f54f42 | d9f54f421b1465c8135be2e3850556c271163b0c82304c0dc3084e505583c1be | 一致（前方） | 一致（前方） | 存在しない | 7c888de 2026-02-05 14:14:51 +0000 |
| PHASE_C_INVARIANTS.md | 3aba714c | 3aba714cec6093d48e12241d23f7815ee714586722b8e3b20a469d63b57db733 | 一致（前方） | 一致（前方） | 存在しない | e1e41f3 2026-02-05 14:17:03 +0000 |
| PHASE_C_BOUNDARY_EVENTS.md | 66b07ff2 | 66b07ff28618c50f0ef4aa7dc1a447fd4ef485effbb89a814978f74fb2ce69e8 | 一致（前方） | 一致（前方） | 存在しない | d0b2449 2026-02-06 08:23:15 +0000 |
| PHASE_C_TRANSITION_TABLE.md | 653f0909 | 653f090999bdbab541028aafd5ab9dcc2538a2191fe866d6e0d7bd966dd994f2 | 一致（前方） | 一致（前方） | 存在しない | 6f59f2c 2026-02-06 08:38:58 +0000 |
| PHASE_C_INVARIANT_CHECK.md | b3004ffe | b3004ffe0e400927d04d07a1351160d379b20534541c105e01851dafe2a07f35 | 一致（前方） | 一致（前方） | 存在しない | e4f6cfc 2026-02-06 09:07:38 +0000 |
| PHASE_C_OBSERVABILITY_AUDIT.md | 7f1a23ab | 7f1a23ab8cd8df064214e678d46856f8e411609849d79cb9a7585696d7bef749 | 一致（前方） | 一致（前方） | 存在しない | a4a159f 2026-02-06 09:08:58 +0000 |
| PHASE_C_ISOMORPHISM_AUDIT.md | e3a8867e | e3a8867e97fba72fae8864d73a718336ede6768732d10c52e01f02e88d2e964f | 一致（前方） | 一致（前方） | 存在しない | 578643e 2026-02-06 09:10:34 +0000 |
| PHASE_C_OBSERVABILITY_BLOCK_AUDIT.md | b36caa39 | b36caa397ed8555c65a84fa7d405e813b27ed08442f0fad6248d255f7ceea596 | 一致（前方） | 一致（前方） | 存在しない | 45f90bf 2026-02-06 09:12:08 +0000 |
| PHASE_C_TERMINAL_CONSISTENCY_AUDIT.md | 4c1f1e14 | 4c1f1e14961ce1585a184198a0db04d8e581465bf15b8420ed8eb52ccd4bbf97 | 一致（前方） | 一致（前方） | 存在しない | 2b8489a 2026-02-06 11:06:56 +0000 |
| B-2_INTERNAL_AUDIT.log | 7e912263 | 7e912263e4f1e5ac213a75a5ccc11e29bdd6179174f5acb9cec162f7e56bef05 | 一致（前方） | 一致（前方） | 存在しない | f189262 2026-02-05 06:17:35 +0000 |
| B-3_NONDETERMINISM_AUDIT.log | 7a4ab155 | 7a4ab1554c89839a1d8bcfdbaedf9f0f29971ca4bba3178f3cacdf4b827fbbdf | 一致（前方） | 一致（前方） | 存在しない | 52b86de 2026-02-05 14:07:44 +0000 |
| B-4_REPRODUCIBILITY_LOCK.log | 403d0802 | 403d0802f865bd40772d0b6021fd90c5c50b8670acc0fde388b2633998342569 | 一致（前方） | 一致（前方） | 存在しない | 3b60b56 2026-02-05 14:09:08 +0000 |

- 前方一致: railway HEAD 15/15、`2b8489a` 15/15。全長64桁での照合は台帳が8桁のためできない（手順13）。
- `2b8489a`（台帳の「コミットID」、`PHASE_C_SILENCE_LOCK.md:51`）は実在し（`git cat-file -t` = commit、件名「Phase C-9 終端整合性監査…」）、`git branch -r --contains` は railway ブランチのみ。`2b8489a..9ec804f` の差分は `A PHASE_C_SILENCE_LOCK.md` の1件のみ。
- `main`: 15件中14件は存在しない。`nexa_v1_0_0_full.html` は存在し不一致（INDEX の既知事実 E1 と同じ値）。
- 事実の報告のみ。どちらを正とするか、解消の方法は本人が決める（手順14）。凍結物は編集していない。
- 根拠区分: 上表の値はすべて確認済み（`git show <rev>:<path> | sha256sum`、2026-11-05T00:08Z）。

## 3. 手順の追従状況

| 手順 | 実施 | 備考 |
| --- | --- | --- |
| 12 再計算 | 実施（変更あり） | `sha256sum -c` は台帳が8桁のため使えず、前方一致の比較をシェルで行った（J1）。`git show <ブランチ>:<path> \| sha256sum`・`git log -1`・`git branch -r --contains` は L89〜91 のとおり |
| 13 切り詰め | 実施 | 前方一致で照合したこと、全長照合ができないことを記録 |
| 14 報告のみ | 実施 | 編集・revert・上書きなし |
| A〜C・E | 対象外 | サンプルタスクの範囲外 |

前提: 初回の clone は shallow（`git rev-parse --is-shallow-repository` = true）。`git fetch --depth=1000 origin main` 後に false。履歴を揃えた後に「比較先での最終更新」15件を再取得し、上表と同一であることを確認した（`diff` 差分なし）。

## 4. 条件付き修正（PR #7）部分の検証

| 修正 | 試運転での確認 |
| --- | --- |
| データ来歴の参照先を S7 `data-lineage-generation-audit` に更新（L61・L189） | 手順4（A）は今回実行していないため、参照先への引き継ぎは発生していない。参照先の実在は `highlightyjp/app` の `claude/vibrant-brown-27k6az` を本試運転では取得しておらず未確認。app PR #11 のブランチ（f91197f）には `skills-drafts/data-lineage-generation-audit/SKILL.md` があることを `git ls-tree` で確認した |

## 5. 手順書にない判断

| # | 行 | 判断 |
| --- | --- | --- |
| J1 | L86〜87・L93 | `sha256sum -c` の代わりに、台帳の8桁と再計算値の先頭8桁を比べるシェルの繰り返しを作った |
| J2 | L85・L90 | 比較先として、railway HEAD に加え、台帳の「コミットID」`2b8489a` と `main` を選んだ。比較先の選び方は手順書に無い |
| J3 | L129 | `main` に存在しないファイルを「一致」欄で「不一致」とせず「存在しない」と書き分けた |
| J4 | L22 | 発動条件「次のフェーズを始める」は模擬。railway の次フェーズ開始の指示は無い |

## 6. 手順書で曖昧だった箇所

| # | 行 | 内容 |
| --- | --- | --- |
| A1 | L87・L93 | 台帳が切り詰められている場合、L87 の `sha256sum -c` は使えない。代わりの照合方法（コマンド）が書かれていない |
| A2 | L85・L90 | 「台帳の値と比べる」相手（台帳のあるブランチの HEAD、封印したコミット、統合先ブランチ）の選び方が無い |
| A3 | L127〜129 | 出力の「一致」欄に、比較先にファイルが存在しない場合の値が無い |
| A4 | L124・L129 | 封印したコミット（台帳の「コミットID」）と、台帳自体が追加されたコミット（今回 9ec804f）が異なる場合の記録欄が無い |

## 7. 問題点・リスク

- 台帳が8桁のため、前方一致は改変の不在を保証しない（衝突の可能性。評価・解釈）。手順13 の記録どおり。
- shallow clone のままだと `git log -1` の最終更新が境界コミットになりうる。S12 に履歴の取得範囲の注意が無い（S6 L129 には有る）。

## 8. 未解決点（本人の判断事項）

- U-S12-1: `nexa_v1_0_0_full.html` の railway（凍結版）と `main` の乖離をどう扱うか（既知。本試運転で再確認）。
- U-S12-2: 改変検知の比較先の既定（A2）。
- U-S12-3: 比較先に存在しない場合の記録値（A3）。
