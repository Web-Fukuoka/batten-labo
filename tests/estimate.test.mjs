// 見積もり計算のテスト。実行: npm test（Node.js 20以上、追加パッケージ不要）
// 料金は index.html から読み取るので、料金表を書き換えたらこのテストも実際の値で確かめられる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, normalize, optionState, encode, decode, toText } from '../assets/js/estimate-core.js';

// index.html の data 属性からカタログを組み立てる（ブラウザ側と同じ情報源）
function catalogFromHtml() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const catalog = { plans: [], options: [], ops: [], line: [], lme: [] };
  const groups = { plan: 'plans', opt: 'options', ops: 'ops', line: 'line', lme: 'lme' };
  for (const [tag] of html.matchAll(/<input\b[^>]*data-price[^>]*>/g)) {
    const attr = (n) => (tag.match(new RegExp(`\\b${n}="([^"]*)"`)) || [])[1];
    const item = { id: attr('value'), name: attr('data-name'), price: Number(attr('data-price')) };
    if (attr('data-requires')) item.requires = attr('data-requires');
    if (attr('data-included-in')) item.includedIn = attr('data-included-in').split(' ');
    catalog[groups[attr('name')]].push(item);
  }
  return catalog;
}

const catalog = catalogFromHtml();
const base = { plan: 'basic', options: [], ops: 'none', line: 'free', lme: 'none' };

test('料金表を index.html から読み取れる', () => {
  assert.equal(catalog.plans.length, 4);
  assert.equal(catalog.options.length, 17);
  assert.equal(catalog.ops.length, 4);
  assert.equal(catalog.line.length, 3);
  assert.equal(catalog.lme.length, 4);
  for (const list of Object.values(catalog)) {
    for (const item of list) {
      assert.ok(item.id && item.name, `id と名前がある: ${JSON.stringify(item)}`);
      assert.ok(Number.isInteger(item.price) && item.price >= 0, `金額が正しい: ${item.id}`);
    }
  }
});

test('基本構築プランだけなら初期9,800円・月額0円', () => {
  const r = calculate(catalog, base);
  assert.equal(r.initial, 9800);
  assert.equal(r.monthly, 0);
  assert.equal(r.firstMonth, 9800);
  assert.equal(r.firstYear, 9800);
});

test('初期費用 = プラン + オプション', () => {
  const r = calculate(catalog, { ...base, options: ['coupon', 'shopcard', 'pop'] });
  assert.equal(r.initial, 9800 + 1500 + 2500 + 2500);
});

test('毎月の費用 = 運用 + LINE公式 + エルメ、初年度は12か月分', () => {
  const r = calculate(catalog, { plan: 'lme', options: [], ops: 'broadcast', line: 'light', lme: 'standard' });
  assert.equal(r.initial, 19800);
  assert.equal(r.monthly, 7800 + 5500 + 10780);
  assert.equal(r.firstMonth, 19800 + 24080);
  assert.equal(r.firstYear, 19800 + 24080 * 12);
});

test('プランに含まれるリッチメニューは二重請求しない', () => {
  for (const plan of ['trial', 'basic', 'lme']) {
    const r = calculate(catalog, { ...base, plan, options: ['richmenu_template'] });
    assert.deepEqual(r.selection.options, [], plan);
    assert.equal(optionState(catalog, { ...base, plan }, 'richmenu_template').reason, 'included');
  }
  const alone = calculate(catalog, { ...base, plan: 'none', options: ['richmenu_template'] });
  assert.equal(alone.initial, 4000);
});

test('エルメ専用オプションはエルメ基本構築のときだけ選べる', () => {
  const lmeOnly = catalog.options.filter((o) => o.requires === 'lme').map((o) => o.id);
  assert.ok(lmeOnly.length >= 4);
  const without = calculate(catalog, { ...base, options: lmeOnly });
  assert.deepEqual(without.selection.options, []);
  assert.equal(without.initial, 9800);
  const withLme = calculate(catalog, { ...base, plan: 'lme', options: lmeOnly });
  assert.deepEqual(withLme.selection.options, lmeOnly);
});

test('プランを変えたら、合わなくなった選択を外す', () => {
  const s = normalize(catalog, { plan: 'lme', options: ['lme_form', 'coupon'], ops: 'light', line: 'free', lme: 'pro' });
  assert.deepEqual(s.options, ['lme_form', 'coupon']);
  const back = normalize(catalog, { ...s, plan: 'basic' });
  assert.deepEqual(back.options, ['coupon']);
  assert.equal(back.lme, 'none');
});

test('エルメ基本構築ではエルメ利用料が「使わない」にならない', () => {
  assert.equal(normalize(catalog, { ...base, plan: 'lme' }).lme, 'free');
  assert.equal(normalize(catalog, { ...base, plan: 'basic', lme: 'pro' }).lme, 'none');
});

test('不正な値や重複は安全に落とす', () => {
  const s = normalize(catalog, { plan: 'xxx', options: ['coupon', 'coupon', 'nope'], ops: '?', line: null, lme: 1 });
  assert.deepEqual(s, { plan: 'basic', options: ['coupon'], ops: 'none', line: 'free', lme: 'none' });
});

test('共有URLで同じ見積もりを復元できる', () => {
  const s = normalize(catalog, { plan: 'lme', options: ['coupon', 'tab_menu'], ops: 'extended', line: 'standard', lme: 'standard' });
  assert.deepEqual(decode(catalog, encode(s)), s);
  assert.equal(decode(catalog, 'utm_source=x'), null);
  assert.deepEqual(decode(catalog, 'opt=coupon.reserve_form').options, ['coupon', 'reserve_form']);
});

test('コピー用の文面に合計と明細が入る', () => {
  const text = toText(calculate(catalog, { ...base, options: ['coupon'], ops: 'light' }));
  assert.match(text, /初期費用：11,300円/);
  assert.match(text, /毎月の費用：3,000円/);
  assert.match(text, /初年度の合計：47,300円/);
  assert.doesNotMatch(text, /エルメ利用料/);
});
