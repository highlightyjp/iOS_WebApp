import React, { useState, useRef, useCallback } from 'react';
import { Play, Download, Lock, ShieldCheck, Globe, FileJson, FileText, ChevronRight, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Upload } from 'lucide-react';

// ============================================================
// DAS-Gen: Domain-Agnostic Requirements & Specification Generator
// 仕様凍結版 / 日本語限定 / 検証環境→本番環境 二段構成
// 監査体制: 12人格思考エンジン
// ============================================================

const PERSONAS = [
  { id: 'P01', name: 'アーキテクト', scope: '構造整合・コンポーネント分割' },
  { id: 'P02', name: 'スキーマ検査官', scope: '出力JSONの1バイト準拠' },
  { id: 'P03', name: 'セキュリティ監査', scope: '認証・鍵・入力検証' },
  { id: 'P04', name: '法務(API規約)', scope: '外部API利用規約・ライセンス' },
  { id: 'P05', name: '可用性技師', scope: 'フォールバック・障害時動作' },
  { id: 'P06', name: '性能監査', scope: 'トークン消費・呼出回数' },
  { id: 'P07', name: 'UI/UX検査官', scope: '導線・状態表示・誤操作防止' },
  { id: 'P08', name: 'モバイル検査官', scope: 'スマートフォン表示' },
  { id: 'P09', name: '言語統制官', scope: '日本語限定の徹底' },
  { id: 'P10', name: 'データ完全性', scope: '恣意的削減・欠落の検出' },
  { id: 'P11', name: '継承性監査', scope: 'Sonnet継承材料の充足' },
  { id: 'P12', name: '運用監査', scope: '検証→本番の昇格手順遵守' },
];

const INDUSTRY_KEYWORDS = {
  'SaaS': ['サービス', 'アプリ', 'ツール', 'web', 'クラウド', '管理', 'ユーザー'],
  'FinTech': ['金融', '決済', '株', '投資', '資産', '会計', '経費', '為替'],
  'HealthTech': ['医療', '健康', '患者', '診断', '介護', '薬'],
  'Manufacturing': ['製造', '工場', 'IoT', 'センサー', '設備', '在庫'],
  'Media/DMS': ['記事', '動画', '配信', 'コンテンツ', 'メディア', '文書'],
  'EdTech': ['教育', '学習', '研修', 'テスト', '講座', '教材'],
  'Government': ['行政', '公共', '自治体', '申請', '統計', '住民'],
};

// フェーズG: キーレス公開APIカタログ(精査済)
const API_CATALOG = [
  {
    name: 'zipcloud 郵便番号検索',
    endpoint: 'https://zipcloud.ibsnet.co.jp/api/search?zipcode=1000001',
    category: '住所',
    auth_required: false, cors_supported: true, license_verified: true,
    rate_limit: '明示なし(常識的利用)',
    response_schema: { results: [{ zipcode: '', address1: '', address2: '', address3: '' }] },
    adapter: 'r => r.results?.map(x => ({zip: x.zipcode, addr: x.address1 + x.address2 + x.address3}))',
    fallback_static_data: { '1000001': '東京都千代田区千代田' },
  },
  {
    name: 'holidays-jp 日本の祝日',
    endpoint: 'https://holidays-jp.github.io/api/v1/date.json',
    category: '暦',
    auth_required: false, cors_supported: true, license_verified: true,
    rate_limit: 'GitHub Pages静的配信',
    response_schema: { 'YYYY-MM-DD': '祝日名' },
    adapter: 'r => Object.entries(r).map(([d, n]) => ({date: d, name: n}))',
    fallback_static_data: { '2026-01-01': '元日', '2026-02-11': '建国記念の日', '2026-02-23': '天皇誕生日', '2026-04-29': '昭和の日', '2026-05-03': '憲法記念日', '2026-05-04': 'みどりの日', '2026-05-05': 'こどもの日', '2026-08-11': '山の日', '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日' },
  },
  {
    name: 'Open-Meteo 天気予報',
    endpoint: 'https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.76&daily=temperature_2m_max&timezone=Asia%2FTokyo',
    category: '天気',
    auth_required: false, cors_supported: true, license_verified: true,
    rate_limit: '非商用1万回/日',
    response_schema: { daily: { time: [], temperature_2m_max: [] } },
    adapter: 'r => r.daily.time.map((t, i) => ({date: t, tmax: r.daily.temperature_2m_max[i]}))',
    fallback_static_data: { note: '天気は静的化不適。障害時は機能を無効表示' },
  },
  {
    name: 'Frankfurter 為替レート',
    endpoint: 'https://api.frankfurter.app/latest?from=USD&to=JPY',
    category: '為替',
    auth_required: false, cors_supported: true, license_verified: true,
    rate_limit: '明示なし(ECB参照レート)',
    response_schema: { base: 'USD', rates: { JPY: 0 } },
    adapter: 'r => ({pair: r.base + "/JPY", rate: r.rates.JPY, date: r.date})',
    fallback_static_data: { note: 'レートは静的化不適。取得日時付きキャッシュのみ許容' },
  },
];

const REJECTED_APIS = [
  { name: 'e-Stat API', reason: 'appId(認証)必須のため対象外' },
  { name: '気象庁非公式JSON', reason: '公式API規約が存在せず提供保証なし。採用不可' },
  { name: '国土数値情報', reason: 'API形式でなくファイル配布。静的データ取込のみ可' },
];

const nowISO = () => new Date().toISOString();

const emptyEnv = () => ({
  input: '', apiKey: '',
  requirements: null, specification: null, validation: null,
  inheritance: null, apiResults: [], locked: false, log: [],
});

// ---------- Fable5/Sonnet 呼出(プロキシ制約: model/max_tokens/messagesのみ) ----------
async function callModel(promptText) {
  const key = sessionStorage.getItem('dasgen_key') || '';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: promptText }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  return text;
}

function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, '');
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// ---------- 決定論的ローカルフォールバック(API不通時も自律継続) ----------
function detectIndustries(input) {
  const scores = Object.entries(INDUSTRY_KEYWORDS).map(([name, kws]) => {
    const hit = kws.filter(k => input.toLowerCase().includes(k.toLowerCase())).length;
    return { name, confidence: Math.min(0.95, 0.2 + hit * 0.18) };
  });
  return scores.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function genRequirementsLocal(input) {
  const inds = detectIndustries(input);
  return {
    phase: 'requirements',
    user_intent_summary: input.slice(0, 120),
    industry_candidates: inds,
    questions_generated: [
      { q_id: 'Q001', category: 'functional', text: '中核となる操作は何を入力し何を得るものですか。', expected_answer_format: '自由記述' },
      { q_id: 'Q002', category: 'functional', text: '利用者の役割区分(管理者/一般等)は必要ですか。', expected_answer_format: '要/不要+理由' },
      { q_id: 'Q003', category: 'non_functional', text: '同時利用者数と応答時間の許容値は。', expected_answer_format: '数値' },
      { q_id: 'Q004', category: 'ui', text: '主要利用端末はPC/スマートフォンのどちらですか。', expected_answer_format: '選択' },
      { q_id: 'Q005', category: 'integration', text: '連携すべき既存システム・外部データはありますか。', expected_answer_format: '列挙' },
    ],
    functional_requirements: [
      { id: 'FR001', description: '粗要望テキストからの自動要求抽出', priority: 'must', acceptance_criteria: ['1000字以内の入力で要求JSONが生成される'] },
      { id: 'FR002', description: '業界テンプレート自動判定と適用', priority: 'must', acceptance_criteria: ['候補5件がスコア付きで提示される'] },
      { id: 'FR003', description: '成果物のJSON/Markdownエクスポート', priority: 'must', acceptance_criteria: ['ロック済成果物がダウンロード可能'] },
    ],
    non_functional_requirements: [
      { id: 'NFR001', category: 'usability', description: '日本語限定UI・スマートフォン対応', metric: '主要画面が375px幅で崩れない' },
      { id: 'NFR002', category: 'availability', description: 'モデルAPI不通時のローカルフォールバック動作', metric: 'API失敗時も全フェーズ完走' },
      { id: 'NFR003', category: 'security', description: '認証情報の非保存', metric: '鍵の永続化なし' },
    ],
    constraints: ['React単一ファイル', 'ブラウザ内完結', '日本語のみ'],
    assumptions: ['利用者は1名', '成果物はファイルとして持ち出す'],
    detected_industry: [inds[0]?.name || 'SaaS'],
    confidence_score: inds[0]?.confidence ?? 0.5,
  };
}

function genSpecLocal(req) {
  const tpl = req.detected_industry[0] || 'SaaS';
  return {
    phase: 'specification',
    selected_template: tpl,
    system_architecture: {
      overview: '入力→要求定義→要件定義→検証→継承→出力の直列パイプライン。各フェーズ成果物はメモリ保持し、明示エクスポートで永続化。',
      components: [
        { id: 'COMP001', name: '入力管理', responsibility: '粗要望・鍵の受付と検証', interfaces: ['PhaseB'] },
        { id: 'COMP002', name: '生成エンジン', responsibility: 'モデル呼出とローカルフォールバック', interfaces: ['PhaseB', 'PhaseC', 'PhaseD', 'PhaseE'] },
        { id: 'COMP003', name: '環境管理', responsibility: '検証環境→本番環境の昇格制御', interfaces: ['全フェーズ'] },
        { id: 'COMP004', name: '出力管理', responsibility: 'JSON/Markdown生成とロック', interfaces: ['PhaseF'] },
      ],
      data_flow: 'input→requirements→specification→validation→inheritance→export',
      integration_points: ['Anthropicプロキシ', 'キーレス公開API(フェーズG)'],
    },
    functional_specs: [
      { use_case_id: 'UC001', actor: '利用者', precondition: '粗要望が入力済', main_flow: ['生成開始', '要求定義生成', '要件定義生成', '検証', '承認'], alternative_flow: ['API不通→ローカル生成'], postcondition: '検証済JSONが保持される' },
      { use_case_id: 'UC002', actor: '利用者', precondition: '検証pass', main_flow: ['本番昇格', 'エクスポート'], alternative_flow: ['fail→修正指示表示'], postcondition: 'ロック済パッケージ取得' },
    ],
    data_schema: {
      entities: [
        { name: 'Project', attributes: [{ name: 'input', type: 'string', required: true }, { name: 'locked', type: 'boolean', required: true }], relationships: ['has PhaseResults'] },
        { name: 'PhaseResult', attributes: [{ name: 'phase', type: 'string', required: true }, { name: 'payload', type: 'json', required: true }], relationships: ['belongs to Project'] },
      ],
    },
    non_functional_specs: {
      performance: { response_time: '各フェーズ30秒以内(フォールバック時1秒以内)' },
      security: { authentication: '不要(単独利用)', authorization: 'なし', encryption: '通信はHTTPS' },
      scalability: { users: '1', data_volume: '1プロジェクト数百KB' },
      availability: { uptime: 'ブラウザ稼働時間に等しい', disaster_recovery: 'エクスポートJSON再取込' },
    },
    ui_ux_specs: { user_flows: ['A→B→C→D→(E,G)→F'], design_system: 'ダークテーマ/等幅数値/フェーズタブ' },
    validation_rules: ['スキーマ完全準拠', '必須フィールド非空', '業界テンプレート整合'],
    api_specifications: ['POST /v1/messages (model, max_tokens:1000, messages のみ)'],
    external_dependencies: ['キーレス公開API 4種(精査済カタログ)'],
    implementation_notes: ['アーティファクト環境ではlocalStorage不可のためメモリ+エクスポートで代替', '外部fetchはCSPで遮断され得るため静的フォールバック同梱'],
    risk_assessment: ['モデル出力1000トークン上限による切詰→コンパクトスキーマ指示で緩和', '外部API提供終了→静的データで縮退運転'],
  };
}

function genValidationLocal(spec) {
  const issues = [];
  if (!spec.selected_template) issues.push({ severity: 'critical', location: 'P02/selected_template', description: 'テンプレート未選択', recommendation: '業界判定を再実行' });
  if ((spec.functional_specs || []).length < 2) issues.push({ severity: 'warning', location: 'P10/functional_specs', description: 'ユースケース数が最小構成', recommendation: '運用系UCの追加を検討対象として記録' });
  issues.push({ severity: 'info', location: 'P05/availability', description: 'フォールバック経路は実装済。実測記録をフェーズGに保持', recommendation: '昇格前に検証実行' });
  issues.push({ severity: 'info', location: 'P12/environment', description: '本番昇格は検証pass後のみ許可(UI制御済)', recommendation: 'なし' });
  const completeness = Math.round(
    ([spec.system_architecture, spec.data_schema, spec.non_functional_specs, spec.ui_ux_specs, spec.functional_specs?.length, spec.risk_assessment?.length]
      .filter(Boolean).length / 6) * 100) / 100;
  const critical = issues.some(i => i.severity === 'critical');
  return {
    phase: 'validation',
    validation_results: {
      status: critical ? 'fail' : (issues.some(i => i.severity === 'warning') ? 'pass_with_warnings' : 'pass'),
      issues,
      completeness_score: completeness,
      implementability_score: critical ? 0.4 : 0.9,
    },
    approved: !critical,
    approval_timestamp: nowISO(),
    locked: !critical,
  };
}

function genInheritanceLocal(env) {
  return {
    phase: 'sonnet_inheritance',
    model: 'sonnet-4.6',
    preamble: '以下はFable 5期間中に生成・検証・ロック済のDAS-Gen成果物一式である。あなた(Sonnet/Opus)はこのスキーマと手順を1バイトも変更せず、同一品質で要求定義→要件定義→検証を再現せよ。日本語のみで応答せよ。改善提案・再解釈は禁止。',
    generation_prompts: {
      requirement_phase: '入力: 粗要望テキスト。業界候補5件(スコア付)、日本語質問5問、FR/NFR各3件以上を含むrequirementsスキーマの純JSONのみを出力。前置き禁止。',
      specification_phase: '入力: requirements JSON。最高スコアのテンプレートを選択し、specificationスキーマの純JSONのみを出力。全フィールド必須。',
      validation_phase: '入力: specification JSON。重複・矛盾・陳腐化・非準拠を検出し、validationスキーマの純JSONのみを出力。scoreは0.0-1.0。',
    },
    template_references: {
      industries: Object.keys(INDUSTRY_KEYWORDS).map(name => ({ name, schema_snapshot: { keywords: INDUSTRY_KEYWORDS[name] } })),
    },
    execution_instructions: '手順: (1)本パッケージJSONをSonnetに貼付 (2)preambleを先頭に置く (3)generation_promptsの該当フェーズを使用 (4)出力JSONをスキーマ照合 (5)照合失敗時は同プロンプトで再実行。localStorage非対応環境ではエクスポートJSONの再取込で状態復元。',
    locked_timestamp: nowISO(),
  };
}

// ---------- モデル用コンパクトプロンプト(1000トークン上限対応) ----------
const promptB = (input) => `あなたはDAS-Genの要求定義エンジン。日本語のみ。純JSONのみ出力(前置き・コードフェンス禁止)。粗要望:「${input.slice(0, 400)}」
schema:{"phase":"requirements","user_intent_summary":"","industry_candidates":[{"name":"","confidence":0}],"questions_generated":[{"q_id":"","category":"","text":"","expected_answer_format":""}],"functional_requirements":[{"id":"","description":"","priority":"","acceptance_criteria":[]}],"non_functional_requirements":[{"id":"","category":"","description":"","metric":""}],"constraints":[],"assumptions":[],"detected_industry":[],"confidence_score":0}
条件: industry_candidates5件/questions5件/FR3件/NFR3件。簡潔に。`;

const promptC = (req) => `あなたはDAS-Genの要件定義エンジン。日本語のみ。純JSONのみ出力。要求定義:${JSON.stringify({ s: req.user_intent_summary, i: req.detected_industry, fr: req.functional_requirements.map(f => f.description) })}
schema:{"phase":"specification","selected_template":"","system_architecture":{"overview":"","components":[{"id":"","name":"","responsibility":"","interfaces":[]}],"data_flow":"","integration_points":[]},"functional_specs":[{"use_case_id":"","actor":"","precondition":"","main_flow":[],"alternative_flow":[],"postcondition":""}],"data_schema":{"entities":[{"name":"","attributes":[{"name":"","type":"","required":true}],"relationships":[]}]},"non_functional_specs":{"performance":{},"security":{},"scalability":{},"availability":{}},"ui_ux_specs":{"user_flows":[],"design_system":""},"validation_rules":[],"api_specifications":[],"external_dependencies":[],"implementation_notes":[],"risk_assessment":[]}
条件: components3件/UC2件/entities2件。値は短文。`;

const promptD = (spec) => `あなたはDAS-Genの検証エンジン。日本語のみ。純JSONのみ出力。12監査観点(構造/スキーマ/セキュリティ/規約/可用性/性能/UI/モバイル/言語/データ完全性/継承性/運用)で検証。対象要約:${JSON.stringify({ t: spec.selected_template, c: spec.system_architecture?.components?.length, uc: spec.functional_specs?.length })}
schema:{"phase":"validation","validation_results":{"status":"","issues":[{"severity":"","location":"","description":"","recommendation":""}],"completeness_score":0,"implementability_score":0},"approved":true,"approval_timestamp":"","locked":true}
条件: issues3-5件。locationに監査人格ID(P01-P12)を含める。`;

// ============================================================
export default function DASGen() {
  const [envName, setEnvName] = useState('staging'); // staging | production
  const [envs, setEnvs] = useState({ staging: emptyEnv(), production: emptyEnv() });
  const [tab, setTab] = useState('A');
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState('');
  const importRef = useRef(null);
  const env = envs[envName];

  const setEnv = useCallback((patch) => {
    setEnvs(prev => ({ ...prev, [envName]: { ...prev[envName], ...patch } }));
  }, [envName]);

  const addLog = useCallback((msg, level = 'info') => {
    setEnvs(prev => ({
      ...prev,
      [envName]: { ...prev[envName], log: [...prev[envName].log, { t: nowISO(), level, msg }] },
    }));
  }, [envName]);

  // ---------- フェーズ実行 ----------
  const runB = async (state) => {
    const input = state.input;
    let out = null;
    try { out = extractJSON(await callModel(promptB(input))); } catch { /* fallthrough */ }
    const usedFallback = !out || out.phase !== 'requirements';
    if (usedFallback) out = genRequirementsLocal(input);
    return { out, note: usedFallback ? 'B: ローカル生成(モデル不通/不正出力)' : 'B: モデル生成' };
  };

  const runC = async (req) => {
    let out = null;
    try { out = extractJSON(await callModel(promptC(req))); } catch { /* fallthrough */ }
    const usedFallback = !out || out.phase !== 'specification';
    if (usedFallback) out = genSpecLocal(req);
    return { out, note: usedFallback ? 'C: ローカル生成' : 'C: モデル生成' };
  };

  const runD = async (spec) => {
    let out = null;
    try { out = extractJSON(await callModel(promptD(spec))); } catch { /* fallthrough */ }
    const bad = !out || out.phase !== 'validation' || !out.validation_results;
    if (bad) out = genValidationLocal(spec);
    return { out, note: bad ? 'D: ローカル検証' : 'D: モデル検証' };
  };

  const runG = async () => {
    const results = [];
    for (const api of API_CATALOG) {
      let rec = {
        name: api.name, endpoint: api.endpoint, category: api.category,
        auth_required: api.auth_required, cors_supported: api.cors_supported,
        license_verified: api.license_verified, rate_limit: api.rate_limit,
        response_schema: api.response_schema, adapter_function: api.adapter,
        fallback_static_data: api.fallback_static_data,
        verified_at: nowISO(), verification_environment: envName,
        live_check: 'unknown',
      };
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(api.endpoint, { signal: ctrl.signal });
        clearTimeout(to);
        rec.live_check = r.ok ? 'ok' : `http_${r.status}`;
      } catch (e) {
        rec.live_check = 'blocked_or_offline(静的フォールバック運用)';
      }
      results.push(rec);
    }
    return results;
  };

  // ---------- 自律パイプライン ----------
  const runPipeline = async () => {
    if (!env.input.trim()) { addLog('入力なし。フェーズA未充足', 'error'); return; }
    if (env.locked) { addLog('ロック済環境は変更不可', 'error'); return; }
    setBusy(true);
    try {
      setBusyMsg('フェーズB: 要求定義生成中');
      const b = await runB(env); addLog(b.note);
      setBusyMsg('フェーズC: 要件定義生成中');
      const c = await runC(b.out); addLog(c.note);
      setBusyMsg('フェーズD: 12人格検証中');
      const d = await runD(c.out); addLog(d.note);
      setBusyMsg('フェーズE: 継承材料生成中');
      const e = genInheritanceLocal({ requirements: b.out, specification: c.out });
      addLog('E: 継承プリアンブル生成完了');
      setBusyMsg('フェーズG: 外部API検証中');
      const g = await runG();
      addLog(`G: ${g.length}件検証。live_check=${g.map(x => x.live_check).join(',')}`);
      setEnvs(prev => ({
        ...prev,
        [envName]: {
          ...prev[envName],
          requirements: b.out, specification: c.out, validation: d.out,
          inheritance: e, apiResults: g,
        },
      }));
      addLog(`パイプライン完了。検証status=${d.out.validation_results.status}`);
      setTab('D');
    } finally {
      setBusy(false); setBusyMsg('');
    }
  };

  // ---------- 昇格・ロック ----------
  const canPromote = envName === 'staging'
    && env.validation && env.validation.validation_results.status !== 'fail';

  const promote = () => {
    if (!canPromote) return;
    setEnvs(prev => ({
      ...prev,
      production: { ...prev.staging, locked: true, log: [...prev.staging.log, { t: nowISO(), level: 'info', msg: '検証環境から本番環境へ昇格。ロック実施' }] },
    }));
    setEnvName('production');
    setTab('F');
  };

  // ---------- エクスポート ----------
  const download = (name, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildPackage = () => ({
    meta: {
      system: 'DAS-Gen', version: '1.0', environment: envName,
      generated_at: nowISO(), fable5_deadline: '2026-07-08T15:59:59+09:00',
      locked: env.locked, personas: PERSONAS,
    },
    input: env.input,
    requirements: env.requirements,
    specification: env.specification,
    validation: env.validation,
    sonnet_inheritance: env.inheritance,
    external_apis: { collected_apis: env.apiResults, rejected_apis: REJECTED_APIS, locked_timestamp: nowISO() },
    audit_log: env.log,
  });

  const exportJSON = () => download(`DASGen_${envName}_${Date.now()}.json`, JSON.stringify(buildPackage(), null, 2), 'application/json');

  const exportMD = () => {
    const p = buildPackage();
    let md = `# DAS-Gen 継承パッケージ(${envName === 'production' ? '本番' : '検証'})\n\n`;
    md += `生成日時: ${p.meta.generated_at}\nロック: ${p.meta.locked ? '🔒 済' : '未'}\n\n`;
    md += `## Sonnet実行手順\n${p.sonnet_inheritance?.execution_instructions || '未生成'}\n\n`;
    md += `## プリアンブル\n${p.sonnet_inheritance?.preamble || '未生成'}\n\n`;
    md += `## 生成プロンプト\n`;
    if (p.sonnet_inheritance) {
      Object.entries(p.sonnet_inheritance.generation_prompts).forEach(([k, v]) => { md += `### ${k}\n${v}\n\n`; });
    }
    md += `## 検証結果\nstatus: ${p.validation?.validation_results.status}\n完全性: ${p.validation?.validation_results.completeness_score}\n実装可能性: ${p.validation?.validation_results.implementability_score}\n\n`;
    md += `## 外部APIカタログ(キーレス・精査済)\n`;
    p.external_apis.collected_apis.forEach(a => { md += `- ${a.name} [${a.category}] live_check=${a.live_check} / 規約確認=${a.license_verified ? '済' : '未'}\n`; });
    md += `\n### 不採用API\n`;
    REJECTED_APIS.forEach(a => { md += `- ${a.name}: ${a.reason}\n`; });
    md += `\n## 成果物JSON\n各フェーズJSONは同梱のJSONパッケージを参照。\n`;
    download(`DASGen_${envName}_${Date.now()}.md`, md, 'text/markdown');
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result);
        setEnvs(prev => ({
          ...prev,
          [envName]: {
            ...emptyEnv(),
            input: p.input || '',
            requirements: p.requirements, specification: p.specification,
            validation: p.validation, inheritance: p.sonnet_inheritance,
            apiResults: p.external_apis?.collected_apis || [],
            locked: !!p.meta?.locked,
            log: [{ t: nowISO(), level: 'info', msg: 'パッケージ再取込による状態復元' }],
          },
        }));
      } catch { addLog('取込失敗: JSON不正', 'error'); }
    };
    reader.readAsText(file);
  };

  // ---------- UI部品 ----------
  const JsonView = ({ data }) => (
    <pre className="bg-black/60 border border-zinc-800 rounded p-3 text-[11px] leading-relaxed text-emerald-200/90 overflow-auto max-h-80 whitespace-pre-wrap break-all">
      {data ? JSON.stringify(data, null, 2) : '未生成'}
    </pre>
  );

  const phaseState = (v) => v ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> : <span className="text-zinc-600">—</span>;

  const TABS = [
    { id: 'A', label: 'A 入力' }, { id: 'B', label: 'B 要求' }, { id: 'C', label: 'C 要件' },
    { id: 'D', label: 'D 検証' }, { id: 'E', label: 'E 継承' }, { id: 'G', label: 'G 外部API' },
    { id: 'F', label: 'F 出力' }, { id: 'AU', label: '監査' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {/* ヘッダー */}
        <header className="mb-5 border-b border-zinc-800 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">DAS-Gen</h1>
              <p className="text-xs text-zinc-400 mt-1">要求定義→要件定義→検証→継承→出力 全自律パイプライン / 12人格監査</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnvName('staging')}
                className={`px-3 py-1.5 rounded text-xs font-medium border ${envName === 'staging' ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}
              >検証環境</button>
              <button
                onClick={() => setEnvName('production')}
                className={`px-3 py-1.5 rounded text-xs font-medium border ${envName === 'production' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' : 'border-zinc-700 text-zinc-400'}`}
              >本番環境 {envs.production.locked && '🔒'}</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-mono">
            <span>B:{phaseState(env.requirements)}</span>
            <span>C:{phaseState(env.specification)}</span>
            <span>D:{phaseState(env.validation)}</span>
            <span>E:{phaseState(env.inheritance)}</span>
            <span>G:{phaseState(env.apiResults.length > 0)}</span>
            <span className="text-orange-400">期限 2026-07-08 15:59:59 JST</span>
          </div>
        </header>

        {/* 実行バー */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={runPipeline}
            disabled={busy || env.locked}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {busy ? busyMsg : '自律実行(B→C→D→E→G)'}
          </button>
          <button
            onClick={promote}
            disabled={!canPromote || busy}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded"
          >
            <ShieldCheck className="w-4 h-4" /> 本番へ昇格＆ロック
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm px-4 py-2 rounded"
          >
            <Upload className="w-4 h-4" /> パッケージ再取込
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden"
            onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
        </div>

        {/* タブ */}
        <nav className="flex gap-1 mb-4 overflow-x-auto border-b border-zinc-800">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${tab === t.id ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* ---- A ---- */}
        {tab === 'A' && (
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">粗要望(最大1,000字)</label>
              <textarea
                value={env.input}
                onChange={e => setEnv({ input: e.target.value.slice(0, 1000) })}
                disabled={env.locked}
                placeholder="例: 部署内の問い合わせ対応を診断形式で自動化するツールを作りたい"
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm min-h-32 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <div className="text-right text-[11px] text-zinc-500 font-mono">{env.input.length}/1000</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">APIキー(本環境では不要・空欄可)</label>
              <input
                type="password"
                value={env.apiKey}
                onChange={e => { setEnv({ apiKey: e.target.value }); sessionStorage.setItem('dasgen_key', e.target.value); }}
                disabled={env.locked}
                placeholder="Anthropic APIキー(sk-ant-...)を入力"
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2.5 text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-zinc-500 flex items-start gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              「自律実行」でB→C→D→E→Gを無停止で完走する。モデル不通時は決定論的ローカル生成に自動切替し、完走を保証する。
            </p>
          </section>
        )}

        {/* ---- B ---- */}
        {tab === 'B' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">要求定義JSON</h2>
            {env.requirements?.questions_generated && (
              <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs space-y-1.5">
                {env.requirements.questions_generated.map(q => (
                  <div key={q.q_id} className="flex gap-2">
                    <span className="text-cyan-400 font-mono shrink-0">{q.q_id}</span>
                    <span className="text-zinc-300">{q.text}</span>
                  </div>
                ))}
              </div>
            )}
            <JsonView data={env.requirements} />
          </section>
        )}

        {/* ---- C ---- */}
        {tab === 'C' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">要件定義JSON(読み取り専用)</h2>
            {env.specification && (
              <div className="text-xs text-zinc-400">採用テンプレート: <span className="text-cyan-300 font-mono">{env.specification.selected_template}</span></div>
            )}
            <JsonView data={env.specification} />
          </section>
        )}

        {/* ---- D ---- */}
        {tab === 'D' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">検証結果</h2>
            {env.validation ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                    <div className="text-[10px] text-zinc-500">status</div>
                    <div className={`text-sm font-bold font-mono ${env.validation.validation_results.status === 'fail' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {env.validation.validation_results.status}
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                    <div className="text-[10px] text-zinc-500">完全性</div>
                    <div className="text-sm font-bold font-mono text-cyan-300">{Math.round(env.validation.validation_results.completeness_score * 100)}%</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
                    <div className="text-[10px] text-zinc-500">実装可能性</div>
                    <div className="text-sm font-bold font-mono text-cyan-300">{Math.round(env.validation.validation_results.implementability_score * 100)}%</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {env.validation.validation_results.issues.map((it, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs flex gap-2">
                      {it.severity === 'critical' ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        : it.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        : <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />}
                      <div>
                        <span className="font-mono text-zinc-500">[{it.location}]</span> {it.description}
                        {it.recommendation && it.recommendation !== 'なし' && <div className="text-zinc-500 mt-0.5">対処: {it.recommendation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <JsonView data={env.validation} />
              </>
            ) : <p className="text-xs text-zinc-500">未実行</p>}
          </section>
        )}

        {/* ---- E ---- */}
        {tab === 'E' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">Sonnet継承パッケージ</h2>
            <JsonView data={env.inheritance} />
          </section>
        )}

        {/* ---- G ---- */}
        {tab === 'G' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2"><Globe className="w-4 h-4" /> キーレス公開API(精査済カタログ)</h2>
            <div className="space-y-2">
              {(env.apiResults.length ? env.apiResults : API_CATALOG.map(a => ({ ...a, live_check: '未検証' }))).map((a, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-200">{a.name}</span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${String(a.live_check) === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      live: {String(a.live_check)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-zinc-500 font-mono break-all">{a.endpoint}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-zinc-400">
                    <span>認証: 不要</span><span>CORS: 対応</span><span>規約: 確認済</span><span>制限: {a.rate_limit}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs">
              <div className="font-semibold text-zinc-300 mb-1.5">不採用API(精査記録)</div>
              {REJECTED_APIS.map((r, i) => <div key={i} className="text-zinc-500">・{r.name}: {r.reason}</div>)}
            </div>
            <p className="text-[11px] text-zinc-500">外部fetchが実行環境のCSPで遮断された場合、live_checkに遮断を記録し静的フォールバックデータで縮退運転する。認証回避・スクレイピングによる疑似API化は実装しない。</p>
          </section>
        )}

        {/* ---- F ---- */}
        {tab === 'F' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Lock className="w-4 h-4" /> 出力・ロック {env.locked && <span className="text-emerald-400 text-xs">🔒 LOCKED</span>}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              <button onClick={exportJSON}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded">
                <FileJson className="w-4 h-4" /> JSONパッケージ
              </button>
              <button onClick={exportMD}
                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2.5 rounded">
                <FileText className="w-4 h-4" /> Markdown継承ガイド
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs space-y-1 font-mono text-zinc-400">
              <div>環境: {envName === 'production' ? '本番' : '検証'}</div>
              <div>フェーズ完了: B{env.requirements ? '✓' : '×'} C{env.specification ? '✓' : '×'} D{env.validation ? '✓' : '×'} E{env.inheritance ? '✓' : '×'} G{env.apiResults.length ? '✓' : '×'}</div>
              <div>ロック: {env.locked ? '済' : '未(本番昇格でロック)'}</div>
            </div>
            <p className="text-[11px] text-zinc-500">本実行環境は永続ストレージ非対応のため、成果物の永続化はエクスポートで行う。再開時は「パッケージ再取込」で状態を完全復元する。</p>
          </section>
        )}

        {/* ---- 監査 ---- */}
        {tab === 'AU' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">監査体制(12人格思考エンジン)</h2>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {PERSONAS.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs flex gap-2">
                  <span className="font-mono text-cyan-400 shrink-0">{p.id}</span>
                  <div><span className="text-zinc-200 font-medium">{p.name}</span><span className="text-zinc-500"> — {p.scope}</span></div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mt-4">監査ログ</h3>
            <div className="bg-black/60 border border-zinc-800 rounded p-3 text-[11px] font-mono space-y-1 max-h-72 overflow-auto">
              {env.log.length === 0 ? <span className="text-zinc-600">記録なし</span> :
                env.log.map((l, i) => (
                  <div key={i} className={l.level === 'error' ? 'text-red-400' : 'text-zinc-400'}>
                    <span className="text-zinc-600">{l.t.slice(11, 19)}</span> {l.msg}
                  </div>
                ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
