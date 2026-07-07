#!/usr/bin/env node
// A2 VBA仕様書復元ツール:機械的に抽出可能な構造情報のみを決定的に抽出する。
// 処理内容の意味的な説明・リスク評価はClaudeが prompt-template.md の契約に従って追記する。
//
// Usage:
//   node extract-structure.mjs <macro.bas> [--out=dir]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const SUB_FUNC_RE =
  /^\s*(Public\s+|Private\s+)?(Sub|Function)\s+(\w+)\s*\(([^)]*)\)(?:\s+As\s+(\w+))?/gim;
const CALL_RE = /\bCall\s+(\w+)\b|(?<![\w.])(\w+)\s*(?:\(|$)/gm;
const RANGE_CELLS_RE = /\b(Range|Cells)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
const SHEET_RE = /\b(?:Sheets|Worksheets)\s*\(\s*"([^"]+)"\s*\)/g;
const EXTERNAL_RE =
  /\b(Workbooks\.Open|ADODB\.Connection|CreateObject\s*\(\s*"ADODB[^)]*\)|FileSystemObject|Shell\s*\()/g;

function parseArgs(argv) {
  const [input, ...rest] = argv;
  const opts = { input };
  for (const arg of rest) {
    const m = arg.match(/^--([\w-]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}

function extractSubsAndFunctions(code) {
  const results = [];
  let m;
  SUB_FUNC_RE.lastIndex = 0;
  while ((m = SUB_FUNC_RE.exec(code))) {
    results.push({
      visibility: (m[1] || 'Public').trim(),
      kind: m[2],
      name: m[3],
      params: m[4].trim(),
      returns: m[5] || (m[2] === 'Function' ? '(不明)' : '—'),
    });
  }
  return results;
}

function extractBody(code, name) {
  const startRe = new RegExp(`(Sub|Function)\\s+${name}\\s*\\(`, 'i');
  const startMatch = startRe.exec(code);
  if (!startMatch) return '';
  const start = startMatch.index;
  const endRe = /\n\s*End\s+(Sub|Function)\b/gi;
  endRe.lastIndex = start;
  const endMatch = endRe.exec(code);
  return endMatch ? code.slice(start, endMatch.index) : code.slice(start);
}

function extractCallGraph(code, knownNames) {
  const edges = [];
  for (const caller of knownNames) {
    const body = extractBody(code, caller);
    for (const callee of knownNames) {
      if (callee === caller) continue;
      const re = new RegExp(`\\b(Call\\s+)?${callee}\\s*(\\(|\\b)`, 'i');
      if (re.test(body)) edges.push([caller, callee]);
    }
  }
  return edges;
}

function extractRangeCells(code) {
  const found = new Set();
  let m;
  RANGE_CELLS_RE.lastIndex = 0;
  while ((m = RANGE_CELLS_RE.exec(code))) {
    found.add(`${m[1]}(${m[2].trim()})`);
  }
  return [...found];
}

function extractSheets(code) {
  const found = new Set();
  let m;
  SHEET_RE.lastIndex = 0;
  while ((m = SHEET_RE.exec(code))) found.add(m[1]);
  return [...found];
}

function extractExternal(code) {
  const found = new Set();
  let m;
  EXTERNAL_RE.lastIndex = 0;
  while ((m = EXTERNAL_RE.exec(code))) found.add(m[1].split(/[\s(]/)[0]);
  return [...found];
}

function toMermaid(edges) {
  if (edges.length === 0) return 'flowchart TD\n  %% 呼び出し関係を検出できませんでした(要:人力確認)';
  const lines = ['flowchart TD'];
  for (const [a, b] of edges) lines.push(`  ${a} --> ${b}`);
  return lines.join('\n');
}

function buildReport(fileName, subs, edges, ranges, sheets, external) {
  const table = subs
    .map((s) => `| ${s.kind} | ${s.name} | ${s.params || '(なし)'} | ${s.returns} |`)
    .join('\n');
  return `# VBA構造抽出スケルトン(自動生成・要:意味記述の追記)

対象ファイル: ${fileName}
抽出方式: 正規表現によるベストエフォート抽出。ネストしたコメントアウト・条件コンパイルは
考慮していないため、本スケルトンの内容は人力で必ず現物のExcel実機と突合すること
(A2運用手順の実行フロー「人力検証」を省略しない)。

## 1. 検出したSub/Function一覧
| 種別 | 名前 | 引数 | 戻り値 |
|---|---|---|---|
${table || '| - | (検出なし) | - | - |'}

役割列は本スケルトンに含まれない。Claudeが各Subの処理内容を読み、
「関数/サブルーチン一覧と役割」として役割列を追記すること(prompt-template.md参照)。

## 2. 呼び出し関係(簡易・ベストエフォート、処理フロー図のたたき台)
\`\`\`mermaid
${toMermaid(edges)}
\`\`\`
自動抽出は単純な名前一致によるものであり、Property経由の間接呼び出し・
On Error GoTo によるフロー分岐は反映されていない。Claudeが実処理を読み、
正しい処理フロー図に修正すること。

## 3. 検出したセル/シート参照
- Range/Cells呼び出し: ${ranges.length > 0 ? ranges.join(', ') : '検出なし'}
- シート名参照: ${sheets.length > 0 ? sheets.join(', ') : '検出なし'}

## 4. 検出した外部リソース参照
${external.length > 0 ? external.map((e) => `- ${e}`).join('\n') : '- 検出なし'}

## 5. 未実装セクション(Claudeが追記する範囲)
- 各Sub/Functionの処理内容の説明(上記1表の「役割」相当)
- 入出力仕様の意味的整理(何のためのセル範囲か・データの流れ)
- 改修時の影響範囲・リスク指摘書(事実と評価を分離して記載。A2運用手順の注意事項準拠。
  「改修すべき」という推奨は書かない)
`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('使い方: node extract-structure.mjs <macro.bas> [--out=dir]');
    process.exit(1);
  }
  const code = readFileSync(opts.input, 'utf8');
  const subs = extractSubsAndFunctions(code);
  const names = subs.map((s) => s.name);
  const edges = extractCallGraph(code, names);
  const ranges = extractRangeCells(code);
  const sheets = extractSheets(code);
  const external = extractExternal(code);

  const report = buildReport(basename(opts.input), subs, edges, ranges, sheets, external);
  const outDir = opts.out || 'sidebiz-output';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'structure_skeleton.md');
  writeFileSync(outPath, report);
  console.log(`構造抽出スケルトンを出力しました: ${outPath}`);
  console.log(`検出: Sub/Function ${subs.length}件, 呼び出し関係 ${edges.length}件, ` +
    `Range/Cells参照 ${ranges.length}件, シート参照 ${sheets.length}件, 外部参照 ${external.length}件`);
}

main();
