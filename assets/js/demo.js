// スマホ画面のLINE風デモ。
// すべてこの画面の中だけで動き、入力内容はどこにも送信・保存しません。
// お店の内容を変えたいときは、下の SHOPS を書き換えてください。
import { track } from './site.js';

const ICONS = {
  cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v3M12 3v3"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.300-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  chat: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4.500 4v-4H6a2 2 0 0 1-2-2z"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="16" cy="12" r="1.3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  list: '<path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4" cy="7" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="17" r=".8"/>',
  people: '<circle cx="9" cy="8.500" r="3"/><path d="M3.5 19a5.500 5.500 0 0 1 11 0"/><circle cx="17" cy="9.500" r="2.300"/><path d="M16 14.200a4.500 4.500 0 0 1 5 4.800"/>',
  gift: '<rect x="4" y="10" width="16" height="10" rx="1.500"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-1-3-5-3.500-5-1s3 1 5 1zm0 0c1-3 5-3.500 5-1s-3 1-5 1z"/>',
  help: '<circle cx="12" cy="12" r="8.500"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.400-1 .900-1 1.700"/><circle cx="12" cy="16.800" r=".6"/>',
};

const RESERVE_NOTE = 'デモのため、実際の予約は行われません。';

const SHOPS = {
  cafe: {
    name: 'ばってんcafe',
    hint: '「営業時間」と送ってみる',
    greeting: '友だち追加ありがとうございます。ばってんcafeです☕\n下のメニューから、気になるものをタップしてください。',
    menu: [
      { label: 'メニュー', icon: 'cup', reply: { type: 'list', title: '今月のメニュー', items: [['本日のコーヒー', '480円'], ['カフェラテ', '550円'], ['季節のタルト', '620円'], ['モーニングセット', '700円']] } },
      { label: 'クーポン', icon: 'ticket', reply: { type: 'coupon', title: 'LINE友だち限定', offer: 'ドリンク1杯 50円引き', note: 'お会計のときに、この画面をスタッフに見せてください。' } },
      { label: '営業時間', icon: 'clock', reply: { type: 'text', text: '営業時間は 8:00〜18:00（ラストオーダー 17:30）です。\n定休日は水曜日です。' } },
      { label: '店舗案内', icon: 'pin', reply: { type: 'info', title: 'お店の情報', rows: [['場所', '福岡市内（架空のお店です）'], ['席数', '18席'], ['駐車場', '2台'], ['お支払い', '現金・各種QR決済']] } },
      { label: 'お問い合わせ', icon: 'chat', reply: { type: 'text', text: 'ご質問はこのトークにそのままお送りください。営業時間内にスタッフがお返事します。' } },
      { label: 'ポイントカード', icon: 'card', reply: { type: 'stamps', title: 'ポイントカード', goal: 'スタンプ10個でドリンク1杯サービス' } },
    ],
    keywords: [
      [['営業', '何時', '時間', '定休'], '営業時間は 8:00〜18:00、定休日は水曜日です。'],
      [['駐車'], '駐車場は店舗の横に2台分あります。'],
      [['予約', '貸切', '席'], 'お席のご予約は、お名前・人数・ご希望の日時をこのトークでお知らせください。'],
      [['テイクアウト', '持ち帰'], 'ドリンクと焼き菓子はテイクアウトできます。'],
    ],
  },
  hair: {
    name: 'ヘアサロン ばってん',
    hint: '「駐車場」と送ってみる',
    greeting: '友だち追加ありがとうございます。ヘアサロン ばってんです✂\nご予約や料金の確認は、下のメニューからどうぞ。',
    menu: [
      { label: '予約する', icon: 'calendar', reply: { type: 'reserve', menus: ['カット', 'カット＋カラー', 'カット＋パーマ', 'トリートメント'] } },
      { label: '料金メニュー', icon: 'list', reply: { type: 'list', title: '料金メニュー', items: [['カット', '4,400円'], ['カット＋カラー', '9,900円'], ['カット＋パーマ', '11,000円'], ['トリートメント', '3,300円']] } },
      { label: 'スタッフ紹介', icon: 'people', reply: { type: 'text', text: 'スタイリスト2名でお迎えしています。\nご希望の雰囲気やお悩みを、予約のときに一言そえていただけると当日がスムーズです。' } },
      { label: 'クーポン', icon: 'ticket', reply: { type: 'coupon', title: 'LINEからのご予約限定', offer: 'トリートメント 500円引き', note: 'ご来店のときに、この画面をスタッフに見せてください。' } },
      { label: 'アクセス', icon: 'pin', reply: { type: 'info', title: 'アクセス', rows: [['場所', '福岡市内（架空のお店です）'], ['営業', '10:00〜19:00'], ['定休日', '月曜日'], ['駐車場', '近くのコインパーキング']] } },
      { label: 'お問い合わせ', icon: 'chat', reply: { type: 'text', text: 'ご質問はこのトークにそのままお送りください。施術中はお返事が遅くなることがあります。' } },
    ],
    keywords: [
      [['予約', '空き', '空いて'], { type: 'reserve', menus: ['カット', 'カット＋カラー', 'カット＋パーマ', 'トリートメント'] }],
      [['営業', '何時', '時間', '定休'], '営業時間は 10:00〜19:00、定休日は月曜日です。'],
      [['駐車'], '専用の駐車場はありません。近くのコインパーキングをご利用ください。'],
      [['キャンセル', '変更'], 'ご予約の変更・キャンセルは、前日までにこのトークでお知らせください。'],
    ],
  },
  salon: {
    name: 'ネイル＆エステ ばってん',
    hint: '「初めて」と送ってみる',
    greeting: '友だち追加ありがとうございます。ネイル＆エステ ばってんです🌿\n初めての方は「初回特典」をご覧ください。',
    menu: [
      { label: '施術メニュー', icon: 'list', reply: { type: 'list', title: '施術メニュー', items: [['ジェルネイル（ワンカラー）', '5,500円'], ['ハンドケア', '3,300円'], ['フェイシャル 60分', '7,700円'], ['まつげパーマ', '4,950円']] } },
      { label: '予約', icon: 'calendar', reply: { type: 'reserve', menus: ['ジェルネイル', 'ハンドケア', 'フェイシャル 60分', 'まつげパーマ'] } },
      { label: '初回特典', icon: 'gift', reply: { type: 'coupon', title: '初めての方へ', offer: '初回の施術 10%オフ', note: 'ご予約のときに「初回特典を使う」とお伝えください。' } },
      { label: 'よくある質問', icon: 'help', reply: { type: 'text', text: 'Q. 爪が短くてもできますか？\nA. はい、長さに合わせてご提案します。\n\nQ. 所要時間は？\nA. ジェルネイルは約90分です。' } },
      { label: '店舗案内', icon: 'pin', reply: { type: 'info', title: 'お店の情報', rows: [['場所', '福岡市内（架空のお店です）'], ['営業', '10:00〜20:00'], ['定休日', '不定休'], ['形式', '完全予約制']] } },
      { label: 'お問い合わせ', icon: 'chat', reply: { type: 'text', text: 'ご質問はこのトークにそのままお送りください。順番にお返事します。' } },
    ],
    keywords: [
      [['予約', '空き', '空いて'], { type: 'reserve', menus: ['ジェルネイル', 'ハンドケア', 'フェイシャル 60分', 'まつげパーマ'] }],
      [['初めて', 'はじめて', '初回'], { type: 'coupon', title: '初めての方へ', offer: '初回の施術 10%オフ', note: 'ご予約のときに「初回特典を使う」とお伝えください。' }],
      [['営業', '何時', '時間', '定休'], '営業時間は 10:00〜20:00、不定休です。'],
      [['オフ', '付け替え'], '他店のジェルのオフも承ります。ご予約のときにお知らせください。'],
    ],
  },
  shop: {
    name: 'うつわと雑貨 ばってん堂',
    hint: '「入荷」と送ってみる',
    greeting: '友だち追加ありがとうございます。うつわと雑貨 ばってん堂です🍵\n新しく届いたものは「新着アイテム」からご覧いただけます。',
    menu: [
      { label: '新着アイテム', icon: 'gift', reply: { type: 'list', title: '今週の新着', items: [['青磁の湯のみ', '1,980円'], ['急須（小）', '4,400円'], ['豆皿 5枚組', '2,750円'], ['茶筒', '3,300円']] } },
      { label: 'クーポン', icon: 'ticket', reply: { type: 'coupon', title: 'LINE友だち限定', offer: 'お買い上げ 5%オフ', note: 'お会計のときに、この画面をスタッフに見せてください。' } },
      { label: '営業時間', icon: 'clock', reply: { type: 'text', text: '営業時間は 11:00〜18:00 です。\n定休日は火曜日です。' } },
      { label: '店舗案内', icon: 'pin', reply: { type: 'info', title: 'お店の情報', rows: [['場所', '福岡市内（架空のお店です）'], ['駐車場', 'なし'], ['お支払い', '現金・カード・QR決済'], ['ギフト包装', '承ります']] } },
      { label: 'お問い合わせ', icon: 'chat', reply: { type: 'text', text: '在庫やお取り置きのご相談は、このトークにそのままお送りください。' } },
      { label: 'ポイントカード', icon: 'card', reply: { type: 'stamps', title: 'ポイントカード', goal: 'スタンプ10個で500円分のお買い物券' } },
    ],
    keywords: [
      [['入荷', '新着', '新商品'], { type: 'list', title: '今週の新着', items: [['青磁の湯のみ', '1,980円'], ['急須（小）', '4,400円'], ['豆皿 5枚組', '2,750円'], ['茶筒', '3,300円']] }],
      [['営業', '何時', '時間', '定休'], '営業時間は 11:00〜18:00、定休日は火曜日です。'],
      [['取り置', '在庫'], 'お取り置きは1週間まで承ります。商品名をお知らせください。'],
      [['ギフト', '包装', 'ラッピング'], 'ギフト包装は無料で承ります。'],
    ],
  },
};

const FALLBACK = 'メッセージありがとうございます。実際のお店では、スタッフが確認してお返事します。\n（デモではキーワードに合わせた自動のお返事だけ体験できます）';

// ---------- 画面の部品 ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

const root = document.querySelector('[data-demo]');
if (root) init();

function init() {
  const log = root.querySelector('[data-demo-log]');
  const menu = root.querySelector('[data-demo-menu]');
  const nameEl = root.querySelector('[data-demo-name]');
  const form = root.querySelector('[data-demo-form]');
  const input = root.querySelector('[data-demo-input]');
  const chips = [...document.querySelectorAll('[data-shop]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let shop = SHOPS.cafe;
  let run = 0;          // 切り替え・リセットのたびに増やし、古いタイマーを無効にする
  let started = false;  // 計測用：最初の操作かどうか
  let stamps = 2;

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function add(side, content) {
    const body = typeof content === 'string'
      ? el('p', { class: 'bubble' }, ...content.split('\n').flatMap((line, i) => (i ? [el('br'), line] : [line])))
      : content;
    if (typeof content === 'string' && side === 'bot' && window.__phraseApply) window.__phraseApply(body, true);
    const msg = el('div', { class: `msg msg--${side}` }, body);
    log.append(msg);
    scrollDown();
    return msg;
  }

  /** 入力中の表示を少し出してから、お店の返事を出す */
  function botSay(content, delay = 700) {
    const mine = run;
    const typing = add('bot', el('p', { class: 'bubble typing', 'aria-label': '入力中' }, el('i'), el('i'), el('i')));
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mine !== run) return;
        typing.remove();
        resolve(add('bot', typeof content === 'function' ? content() : content));
      }, reduced ? 0 : delay);
    });
  }

  /** 「この機能の料金を見る」→ 料金表のオプションにチェックを入れて、料金へ移動 */
  function priceLink(option, label = 'この機能の料金を見る') {
    return el('a', {
      class: 'card__link', href: '#price',
      onclick: () => {
        track('demo_to_estimate', { option });
        document.dispatchEvent(new CustomEvent('estimate:add', { detail: { option } }));
      },
    }, `${label} →`);
  }

  // ---------- 返事の種類ごとの表示 ----------
  const render = {
    text: (r) => r.text,
    list: (r) => el('div', { class: 'card' },
      el('p', { class: 'card__head' }, r.title),
      el('div', { class: 'card__body' }, el('ul', {}, r.items.map(([a, b]) => el('li', {}, el('span', {}, a), el('span', {}, b)))), el('p', { class: 'card__small' }, '価格はデモ用の例です。'))),
    info: (r) => el('div', { class: 'card' },
      el('p', { class: 'card__head' }, r.title),
      el('div', { class: 'card__body' }, el('dl', {}, r.rows.flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)])))),
    coupon: (r) => {
      const btn = el('button', { type: 'button', class: 'card__btn' }, 'クーポンを使う');
      const slot = el('div', {});
      btn.addEventListener('click', () => {
        btn.disabled = true;
        btn.textContent = '使用済み';
        slot.replaceChildren(el('p', { class: 'used' }, '使用済み'));
        track('demo_interaction', { feature: 'coupon_use' });
        botSay('クーポンを使用しました。ありがとうございます！\n実際のLINEでも、このように画面を見せるだけで使えます。');
      });
      return el('div', { class: 'card' },
        el('p', { class: 'card__head' }, `クーポン｜${r.title}`),
        el('div', { class: 'card__body' }, el('p', { class: 'card__big' }, r.offer), el('p', { class: 'card__small' }, r.note), slot, btn, priceLink('coupon')));
    },
    stamps: (r) => {
      const grid = el('div', { class: 'stamps', role: 'img' });
      const btn = el('button', { type: 'button', class: 'card__btn' }, '来店スタンプを押す（体験）');
      const draw = () => {
        grid.setAttribute('aria-label', `スタンプ ${stamps}個／10個`);
        grid.replaceChildren(...Array.from({ length: 10 }, (_, i) => el('span', { class: i < stamps ? 'is-on' : '' }, i < stamps ? '済' : String(i + 1))));
        if (stamps >= 10) { btn.disabled = true; btn.textContent = 'カードがたまりました'; }
      };
      btn.addEventListener('click', () => {
        if (stamps >= 10) return;
        stamps += 1;
        draw();
        track('demo_interaction', { feature: 'stamp' });
        if (stamps === 10) botSay('スタンプが10個たまりました🎉\n特典チケットをお届けします。');
      });
      draw();
      return el('div', { class: 'card' },
        el('p', { class: 'card__head' }, r.title),
        el('div', { class: 'card__body' }, grid, el('p', { class: 'card__small' }, r.goal), btn, priceLink('shopcard')));
    },
    reserve: (r) => {
      const select = (label, options) => {
        const s = el('select', {}, options.map((o) => el('option', {}, o)));
        return [el('label', {}, label, s), s];
      };
      const [menuL, menuS] = select('メニュー', r.menus);
      const [dayL, dayS] = select('ご希望日', ['今週の平日', '今週の土日', '来週の平日', '来週の土日']);
      const [timeL, timeS] = select('時間帯', ['午前', '13時〜16時', '16時以降']);
      const next = el('button', { type: 'button', class: 'card__btn' }, '内容を確認する');
      next.addEventListener('click', () => {
        next.disabled = true;
        [menuS, dayS, timeS].forEach((s) => { s.disabled = true; });
        add('me', `${menuS.value}／${dayS.value}／${timeS.value}`);
        track('demo_interaction', { feature: 'reserve_input' });
        botSay(() => {
          const ok = el('button', { type: 'button', class: 'card__btn' }, 'この内容で送る');
          const back = el('button', { type: 'button', class: 'card__btn card__btn--sub' }, 'やり直す');
          ok.addEventListener('click', () => {
            ok.disabled = true; back.disabled = true;
            track('demo_interaction', { feature: 'reserve_done' });
            botSay(() => el('div', { class: 'card' },
              el('p', { class: 'card__head' }, 'ご予約の希望を受け付けました'),
              el('div', { class: 'card__body' },
                el('p', {}, 'お店から、確定のご連絡をお送りします。'),
                el('p', { class: 'card__small' }, RESERVE_NOTE),
                priceLink('reserve_form', '予約受付フォームの料金を見る'))));
          });
          back.addEventListener('click', () => {
            ok.disabled = true; back.disabled = true;
            botSay(() => render.reserve(r));
          });
          return el('div', { class: 'card' },
            el('p', { class: 'card__head' }, 'ご予約内容の確認'),
            el('div', { class: 'card__body' },
              el('dl', {}, el('dt', {}, 'メニュー'), el('dd', {}, menuS.value), el('dt', {}, 'ご希望日'), el('dd', {}, dayS.value), el('dt', {}, '時間帯'), el('dd', {}, timeS.value)),
              ok, back));
        });
      });
      return el('div', { class: 'card' },
        el('p', { class: 'card__head' }, 'ご予約の受付'),
        el('div', { class: 'card__body' }, menuL, dayL, timeL, el('p', { class: 'card__small' }, 'お名前などの入力は不要です。'), next));
    },
  };

  const show = (reply) => (typeof reply === 'string' ? reply : render[reply.type](reply));

  function firstTouch() {
    if (started) return;
    started = true;
    track('demo_start', { shop: shop.name });
  }

  // ---------- 下のメニュー ----------
  function drawMenu() {
    menu.replaceChildren(...shop.menu.map((item) => {
      const btn = el('button', { type: 'button', class: 'richmenu__cell' });
      btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[item.icon]}</svg>`;
      btn.append(el('span', {}, item.label));
      btn.addEventListener('click', () => {
        firstTouch();
        track('demo_interaction', { feature: 'richmenu' });
        add('me', item.label);
        botSay(() => show(item.reply));
      });
      return btn;
    }));
  }

  // ---------- 自由入力（キーワードに自動でお返事） ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    firstTouch();
    track('demo_interaction', { feature: 'keyword' }); // 入力した文面そのものは送らない
    add('me', text);
    const byMenu = shop.menu.find((m) => text.includes(m.label));
    const byWord = shop.keywords.find(([words]) => words.some((w) => text.includes(w)));
    const reply = byMenu ? byMenu.reply : byWord ? byWord[1] : FALLBACK;
    botSay(() => show(reply));
  });

  // ---------- お店の切り替え・リセット ----------
  function start(key) {
    run += 1;
    shop = SHOPS[key];
    stamps = 2;
    nameEl.textContent = shop.name;
    input.placeholder = shop.hint;
    chips.forEach((c) => {
      const on = c.dataset.shop === key;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    log.replaceChildren();
    drawMenu();
    botSay(shop.greeting, 500);
  }

  chips.forEach((c) => c.addEventListener('click', () => { firstTouch(); start(c.dataset.shop); }));
  root.querySelector('[data-demo-reset]').addEventListener('click', () => {
    const current = Object.keys(SHOPS).find((k) => SHOPS[k] === shop);
    start(current);
  });

  // 「使い方の例」のボタンから、そのお店のデモへ
  document.querySelectorAll('[data-demo-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      firstTouch();
      start(btn.dataset.demoJump);
      document.getElementById('demo').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  start('cafe');
}
