#!/usr/bin/env node
// A1 議事録整形ツール
// Usage:
//   node format-minutes.mjs prepare <input.txt> [--out=dir]
//   node format-minutes.mjs run     <input.txt> [--out=dir] [--model=claude-sonnet-5]
//   node format-minutes.mjs validate <output.md>
//   node format-minutes.mjs render   <output.md> [--out=file.html]
//
// prepare : 決定的な前処理のみ実行し、Claude Code セッションに渡すタスクパッケージを出力する(APIキー不要)。
// run     : ANTHROPIC_API_KEY が設定されている場合、Anthropic Messages API を直接呼び出して完結させる。
// validate: 出力Markdownが必須スキーマ(7セクション)を満たしているか決定的にチェックする。
// render  : 出力Markdown(本ツールが定義するスキーマのみ対応)を単一HTMLに変換する。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_SECTIONS = [
  '## 1. 会議概要',
  '## 2. アジェンダ・議題',
  '## 3. 決定事項',
  '## 4. 懸案事項',
  '## 5. 次回アクション',
  '## 6. 議論詳細・補足',
  '## 7. 次回開催予定',
];

const FILLER_PATTERNS = [/えーと/g, /あのー/g, /そうですね(、|,)/g, /なんか(、|,)/g];

function parseArgs(argv) {
  const [cmd, input, ...rest] = argv;
  const opts = { cmd, input };
  for (const arg of rest) {
    const m = arg.match(/^--([\w-]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}

function preprocess(raw) {
  return raw
    .replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, '')
    .replace(/\(\d{1,2}:\d{2}(:\d{2})?\)/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}

function buildTaskPackage(preprocessed) {
  const template = readFileSync(join(__dirname, 'prompt-template.md'), 'utf8');
  return template.replace('{{RAW_TRANSCRIPT}}', preprocessed);
}

function validateOutput(text) {
  const missingSections = REQUIRED_SECTIONS.filter((h) => !text.includes(h));
  const fillerHits = [];
  for (const pat of FILLER_PATTERNS) {
    const matches = text.match(pat);
    if (matches) fillerHits.push(...matches);
  }
  const uncheckedFlags = (text.match(/【要確認:[^】]*】/g) || []);
  return { missingSections, fillerHits, uncheckedFlags };
}

function renderHtml(markdown) {
  const escape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = markdown.split('\n');
  const bodyParts = [];
  let inList = false;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    const li = line.match(/^[-・]\s+(.*)$/);
    if (h2) {
      if (inList) { bodyParts.push('</ul>'); inList = false; }
      bodyParts.push(`<h2>${escape(h2[1])}</h2>`);
    } else if (li) {
      if (!inList) { bodyParts.push('<ul>'); inList = true; }
      bodyParts.push(`<li>${escape(li[1])}</li>`);
    } else if (line.trim() === '') {
      if (inList) { bodyParts.push('</ul>'); inList = false; }
    } else {
      if (inList) { bodyParts.push('</ul>'); inList = false; }
      bodyParts.push(`<p>${escape(line)}</p>`);
    }
  }
  if (inList) bodyParts.push('</ul>');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>議事録</title>
<style>
body{font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;max-width:800px;margin:2rem auto;line-height:1.8;color:#222}
h2{border-bottom:2px solid #444;padding-bottom:.3rem;margin-top:2rem}
ul{padding-left:1.5rem}
p{margin:.4rem 0}
</style></head>
<body>
${bodyParts.join('\n')}
</body></html>`;
}

async function callAnthropicApi(taskPackage, model) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が未設定です。--api モードを使うには環境変数を設定してください。');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: taskPackage }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API エラー: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content.map((c) => c.text || '').join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = opts.out || 'sidebiz-output';

  if (!opts.cmd || !opts.input) {
    console.error(
      '使い方: node format-minutes.mjs <prepare|run|validate|render> <file> [--out=dir]'
    );
    process.exit(1);
  }

  if (opts.cmd === 'prepare') {
    const raw = readFileSync(opts.input, 'utf8');
    const preprocessed = preprocess(raw);
    const pkg = buildTaskPackage(preprocessed);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'task_package.md');
    writeFileSync(outPath, pkg);
    console.log(`前処理済みタスクパッケージを出力しました: ${outPath}`);
    console.log('Claude Codeセッションでこのファイルを読み、契約に従って議事録を生成してください。');
    console.log(`生成結果は ${outDir}/minutes_output.md として保存し、'validate' で検証してください。`);
    return;
  }

  if (opts.cmd === 'run') {
    const raw = readFileSync(opts.input, 'utf8');
    const preprocessed = preprocess(raw);
    const pkg = buildTaskPackage(preprocessed);
    const result = await callAnthropicApi(pkg, opts.model);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'minutes_output.md');
    writeFileSync(outPath, result);
    console.log(`APIモードで議事録を生成しました: ${outPath}`);
    const report = validateOutput(result);
    printValidation(report);
    return;
  }

  if (opts.cmd === 'validate') {
    const text = readFileSync(opts.input, 'utf8');
    const report = validateOutput(text);
    printValidation(report);
    process.exit(report.missingSections.length > 0 ? 1 : 0);
  }

  if (opts.cmd === 'render') {
    const text = readFileSync(opts.input, 'utf8');
    const html = renderHtml(text);
    const outPath = opts.out || opts.input.replace(/\.md$/, '.html');
    writeFileSync(outPath, html);
    console.log(`HTML出力: ${outPath}`);
    return;
  }

  console.error(`不明なコマンド: ${opts.cmd}`);
  process.exit(1);
}

function printValidation({ missingSections, fillerHits, uncheckedFlags }) {
  if (missingSections.length === 0) {
    console.log('[QA] 必須7セクション: すべて存在します');
  } else {
    console.log('[QA] 必須セクション欠落:', missingSections);
  }
  if (fillerHits.length > 0) {
    console.log('[QA] 未変換の可能性がある口語表現:', fillerHits);
  }
  if (uncheckedFlags.length > 0) {
    console.log('[QA] 人力確認が必要な箇所:', uncheckedFlags);
  }
  console.log('[QA] 本チェックは人力検品の代替ではありません(A1運用手順の実行フロー準拠)。');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
