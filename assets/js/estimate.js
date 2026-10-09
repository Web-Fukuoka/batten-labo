// 料金表を、そのまま見積もりにする。
// 金額は index.html の data-price から読むので、料金を変えるときは index.html だけ直せば反映されます。
import { DEFAULT_SELECTION, calculate, normalize, optionState, usesLme, encode, decode, toText, yen } from './estimate-core.js';
import { track } from './site.js';

const form = document.getElementById('estimate');
const summary = document.getElementById('summary');
if (form && summary) init();

function init() {
  const inputs = (name) => [...form.querySelectorAll(`input[name="${name}"]`)];
  const toItem = (input) => {
    const item = { id: input.value, name: input.dataset.name, price: Number(input.dataset.price) };
    if (input.dataset.requires) item.requires = input.dataset.requires;
    if (input.dataset.includedIn) item.includedIn = input.dataset.includedIn.split(' ');
    return item;
  };
  const catalog = {
    plans: inputs('plan').map(toItem),
    options: inputs('opt').map(toItem),
    ops: inputs('ops').map(toItem),
    line: inputs('line').map(toItem),
    lme: inputs('lme').map(toItem),
  };

  const live = summary.querySelector('.sum__live');
  const out = (key) => summary.querySelector(`[data-sum="${key}"]`);
  const msg = summary.querySelector('[data-sum-msg]');
  const dockTotal = document.querySelector('[data-dock-total]');
  const lmeNote = form.querySelector('[data-lme-note]');
  const WHY = { included: 'プランに含まれます', 'needs-lme': '「エルメ基本構築」で選べます' };

  let touched = false;
  let result;

  const checked = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value;
  const read = () => ({
    plan: checked('plan'),
    options: inputs('opt').filter((i) => i.checked).map((i) => i.value),
    ops: checked('ops'),
    line: checked('line'),
    lme: checked('lme'),
  });

  /** 選択内容を画面に反映する（選べない項目は理由を添えて止める） */
  function write(s) {
    for (const name of ['plan', 'ops', 'line', 'lme']) {
      inputs(name).forEach((i) => { i.checked = i.value === s[name]; });
    }
    inputs('opt').forEach((i) => {
      const state = optionState(catalog, s, i.value);
      const row = i.closest('li');
      i.checked = s.options.includes(i.value);
      i.disabled = !state.available;
      row.classList.toggle('is-off', !state.available);
      row.querySelector('.opt__why')?.remove();
      if (!state.available) {
        const why = document.createElement('span');
        why.className = 'opt__why';
        why.textContent = WHY[state.reason];
        row.querySelector('.opt__name').append(why);
      }
    });
    const lme = usesLme(s);
    inputs('lme').forEach((i) => {
      i.disabled = lme ? i.value === 'none' : i.value !== 'none';
      i.closest('label').classList.toggle('is-off', i.disabled);
    });
    if (lmeNote) lmeNote.textContent = lme ? 'エルメのプランを選んでください' : '「エルメ基本構築」を選ぶと選べます';
  }

  function render() {
    result = calculate(catalog, read());
    write(result.selection);

    for (const key of ['initial', 'monthly']) {
      const el = out(key);
      const next = yen(result[key]);
      if (el.textContent !== next) {
        el.textContent = next;
        el.classList.remove('is-bump');
        void el.offsetWidth; // アニメーションをやり直すため
        el.classList.add('is-bump');
      }
    }
    out('firstMonth').textContent = yen(result.firstMonth);
    out('firstYear').textContent = yen(result.firstYear);

    const row = (name, price, ext = false) => {
      const li = document.createElement('li');
      if (ext) li.className = 'is-ext';
      const a = document.createElement('span');
      const b = document.createElement('span');
      a.textContent = name;
      b.textContent = price;
      li.append(a, b);
      return li;
    };
    const rows = [row(result.plan.name, yen(result.plan.price))];
    for (const o of result.options) rows.push(row(o.name, yen(o.price)));
    if (result.ops.price) rows.push(row(`運用：${result.ops.name}`, `月${yen(result.ops.price)}`));
    if (result.line.price) rows.push(row('LINE公式の利用料（別途）', `月${yen(result.line.price)}`, true));
    if (result.lme.price) rows.push(row('エルメの利用料（別途）', `月${yen(result.lme.price)}`, true));
    out('items').replaceChildren(...rows);

    if (dockTotal) {
      dockTotal.innerHTML = '';
      const initial = document.createElement('b');
      initial.textContent = yen(result.initial);
      const monthly = document.createElement('b');
      monthly.textContent = yen(result.monthly);
      dockTotal.append('初期 ', initial, document.createElement('br'), '毎月 ', monthly);
      dockTotal.hidden = !touched;
    }
  }

  function say(text) {
    msg.textContent = text;
    clearTimeout(say.timer);
    say.timer = setTimeout(() => { msg.textContent = ''; }, 5000);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 古いブラウザや、クリップボードが使えない環境向け
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  form.addEventListener('change', () => {
    if (!touched) { touched = true; track('estimate_start'); }
    render();
  });

  summary.querySelector('[data-sum-copy]').addEventListener('click', async () => {
    const ok = await copy(toText(result));
    track('estimate_copy');
    say(ok ? '見積もりの内容をコピーしました。' : 'コピーできませんでした。画面の内容をそのままお伝えください。');
  });

  summary.querySelector('[data-sum-send]').addEventListener('click', () => {
    // リンクはそのままLINEを開く。開く前に文面をコピーしておく
    copy(toText(result)).then((ok) => say(ok ? 'コピーしました。LINEのトークに貼り付けて送ってください。' : ''));
    track('estimate_complete', { initial: result.initial, monthly: result.monthly });
  });

  summary.querySelector('[data-sum-share]').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?${encode(result.selection)}#price`;
    const ok = await copy(url);
    say(ok ? 'この見積もりを開くURLをコピーしました。' : 'コピーできませんでした。');
  });

  summary.querySelector('[data-sum-reset]').addEventListener('click', () => {
    write(normalize(catalog, DEFAULT_SELECTION));
    touched = false;
    render();
    history.replaceState(null, '', `${location.pathname}#price`);
    say('最初の状態に戻しました。');
  });

  // デモの「この機能の料金を見る」から、該当のオプションにチェックを入れる
  document.addEventListener('estimate:add', (e) => {
    const id = e.detail.option;
    const input = inputs('opt').find((i) => i.value === id);
    if (!input) return;
    if (optionState(catalog, read(), id).available) input.checked = true;
    input.closest('details').open = true;
    touched = true;
    render();
    const name = input.dataset.name;
    say(input.checked ? `「${name}」を見積もりに追加しました。` : `「${name}」はこのプランでは選べません。`);
  });

  // 共有URLから開いたときは、その内容を復元する
  const shared = decode(catalog, location.search);
  if (shared) {
    write(shared);
    touched = true;
    for (const id of shared.options) inputs('opt').find((i) => i.value === id).closest('details').open = true;
  }

  live.hidden = false;
  render();
}
