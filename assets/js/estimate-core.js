// 見積もりの計算ロジック（画面から独立。ブラウザとテストの両方で使う）
//
// catalog = {
//   plans:   [{ id, name, price }],
//   options: [{ id, name, price, requires?: 'lme', includedIn?: ['trial','basic','lme'] }],
//   ops:     [{ id, name, price }],
//   line:    [{ id, name, price }],
//   lme:     [{ id, name, price }],   // 'none' = 使わない
// }
// selection = { plan, options: [id...], ops, line, lme }

export const DEFAULT_SELECTION = { plan: 'basic', options: [], ops: 'none', line: 'free', lme: 'none' };

const find = (list, id) => list.find((x) => x.id === id);

/** エルメを使う構成かどうか（エルメ基本構築プランを選んだとき） */
export function usesLme(selection) {
  return selection.plan === 'lme';
}

/** その条件でオプションを選べるか。選べない場合は理由を返す */
export function optionState(catalog, selection, optionId) {
  const opt = find(catalog.options, optionId);
  if (!opt) return { available: false, reason: 'unknown' };
  if (opt.includedIn && opt.includedIn.includes(selection.plan)) {
    return { available: false, reason: 'included' };
  }
  if (opt.requires === 'lme' && !usesLme(selection)) {
    return { available: false, reason: 'needs-lme' };
  }
  return { available: true, reason: null };
}

/** 矛盾のある選択を、矛盾のない形に直す（二重請求・前提条件の崩れを防ぐ） */
export function normalize(catalog, input) {
  const s = { ...DEFAULT_SELECTION, ...input };
  if (!find(catalog.plans, s.plan)) s.plan = DEFAULT_SELECTION.plan;
  if (!find(catalog.ops, s.ops)) s.ops = DEFAULT_SELECTION.ops;
  if (!find(catalog.line, s.line)) s.line = DEFAULT_SELECTION.line;
  if (!find(catalog.lme, s.lme)) s.lme = DEFAULT_SELECTION.lme;

  if (usesLme(s)) {
    if (s.lme === 'none') s.lme = 'free';
  } else {
    s.lme = 'none';
  }

  const seen = new Set();
  s.options = (Array.isArray(s.options) ? s.options : []).filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return optionState(catalog, s, id).available;
  });
  return s;
}

/** 金額を計算する */
export function calculate(catalog, input) {
  const s = normalize(catalog, input);
  const plan = find(catalog.plans, s.plan);
  const options = s.options.map((id) => find(catalog.options, id));
  const ops = find(catalog.ops, s.ops);
  const line = find(catalog.line, s.line);
  const lme = find(catalog.lme, s.lme);

  const optionsTotal = options.reduce((sum, o) => sum + o.price, 0);
  const initial = plan.price + optionsTotal;
  const monthly = ops.price + line.price + lme.price;

  return {
    selection: s,
    plan,
    options,
    ops,
    line,
    lme,
    initial,
    monthly,
    firstMonth: initial + monthly,
    firstYear: initial + monthly * 12,
  };
}

export const yen = (n) => `${n.toLocaleString('ja-JP')}円`;

/** 見積もりを共有URL用のクエリ文字列にする */
export function encode(selection) {
  const p = new URLSearchParams();
  p.set('plan', selection.plan);
  if (selection.options.length) p.set('opt', selection.options.join('.'));
  p.set('ops', selection.ops);
  p.set('line', selection.line);
  p.set('lme', selection.lme);
  return p.toString();
}

/** クエリ文字列から選択内容を復元する（不正な値は normalize で落とす） */
export function decode(catalog, query) {
  const p = new URLSearchParams(query);
  if (!p.has('plan') && !p.has('opt')) return null;
  return normalize(catalog, {
    plan: p.get('plan') ?? undefined,
    options: (p.get('opt') ?? '').split('.').filter(Boolean),
    ops: p.get('ops') ?? undefined,
    line: p.get('line') ?? undefined,
    lme: p.get('lme') ?? undefined,
  });
}

/** LINEに貼り付けるための見積もり文面 */
export function toText(result) {
  const lines = ['【ばってんLabo 見積もり（概算）】', ''];
  lines.push(`■ 初期費用：${yen(result.initial)}`);
  lines.push(`・${result.plan.name}　${yen(result.plan.price)}`);
  for (const o of result.options) lines.push(`・${o.name}　${yen(o.price)}`);
  lines.push('');
  lines.push(`■ 毎月の費用：${yen(result.monthly)}`);
  lines.push(`・運用サポート：${result.ops.name}　${yen(result.ops.price)}`);
  lines.push(`・LINE公式アカウント利用料：${result.line.name}　${yen(result.line.price)}`);
  if (result.lme.id !== 'none') lines.push(`・エルメ利用料：${result.lme.name}　${yen(result.lme.price)}`);
  lines.push('');
  lines.push(`初月の合計：${yen(result.firstMonth)}`);
  lines.push(`初年度の合計：${yen(result.firstYear)}`);
  lines.push('');
  lines.push('※税込の概算です。この内容で相談したいです。');
  return lines.join('\n');
}
