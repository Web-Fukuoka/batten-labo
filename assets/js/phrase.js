// 日本語の改行を「文節」の切れ目にそろえる。
// 画面の幅が変わっても、単語の途中や1文字だけ残る位置では折り返さないようにする。
// 文章を書き換えても自動で効くので、HTML側に改行の指定を足す必要はありません。
(function () {
  if (!('Segmenter' in Intl)) return; // 古いブラウザでは通常の折り返しのまま

  var TARGETS = 'h1, h2, h3, summary, .topbar, .btn, .chip, .hero__area, .hero__lead, .hero__desc, .hero__notes li,' +
    '.sec__lead, .try__lead, .try__list span, .demo__note, .worries p, .worries__answer, .check li, .can__card > p,' +
    '.ex__tag, .ex__body > p, .examples__note, .midcta p, .plan__for, .opt__name, .opts__note, .sum__static p, .sum__note, .sum__how,' +
    '.flow p, .about__text p, .about__card dd, .faq p, .footer__cta p, .footer__small, .footer__brand span, .doc p, .doc li';

  var segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
  var CLOSE = /^[、。，．！？!?）」』】〉》・ー〜～…：:；;％%\s\/／]/;   // 行頭に来てはいけない文字
  var OPEN = /[（「『【〈《\s]$/;                                      // 行末に来てはいけない文字
  var STOP = /[、。！？!?]$/;                                          // ここでは必ず折り返してよい
  var HIRA = /^[ぁ-ゟ]/;
  var KANJI_END = /[一-鿿々]$/, KANJI_START = /^[一-鿿々]/;
  var KATA_END = /[\u30a1-\u30fa\u30fc]$/, KATA_START = /^[\u30a1-\u30fa]/;
  var NUM_END = /[0-9０-９,.]$/, NUM_START = /^[0-9０-９]/;
  var UNIT = /^(円|件|通|枚|回|個|本|人|名|分|日|月|年|か所|タップ|ボタン|種類|項目|%|％)/;
  // ひらがなで始まるが、文節の先頭になる言葉
  var HEAD = /^(お|ご|まだ|また|まず|もっと|いつも|そんな|こんな|その|この|あなた|ちゃんと|ちょうど|つく|はじめ|きっかけ|いっしょ|おまかせ|むずかしい|すぐ|すべて|どう|なに|いま|ばってん|さわ|ひと|わかり|わから|まるっと|ぜひ|もう|とても|たくさん|それ|これ|ここ|どの|なし|ありがとう|おすすめ)/;
  var PREFIX = /^(お|ご)$/;

  // 途中で区切らない言葉（区切りがおかしいと感じた言葉は、ここに足せば直ります）
  var KEEP = ['友だち追加', 'ありがとうございます', 'LINE公式アカウント', '公式アカウント', '公式LINE', 'リッチメニュー', 'ショップカード',
    'ポイントカード', '自動応答', '無料相談', 'お客さま', 'ばってんLabo', 'ばってんcafe', 'お問い合わせ', 'お知らせ', 'お見積もり',
    'ご予約', 'ご相談', 'ご案内', 'スマートフォン', 'あいさつメッセージ', '友だち', '再来店', 'お気軽に', 'お待ちしています'];

  function keepTogether(text, parts) {
    var cuts = [], pos = 0;
    for (var i = 0; i < parts.length - 1; i++) { pos += parts[i].length; cuts.push(pos); }
    KEEP.forEach(function (word) {
      for (var at = text.indexOf(word); at !== -1; at = text.indexOf(word, at + 1)) {
        cuts = cuts.filter(function (c) { return c <= at || c >= at + word.length; });
      }
    });
    var out = [], from = 0;
    cuts.concat(text.length).forEach(function (c) { out.push(text.slice(from, c)); from = c; });
    return out;
  }

  function phrases(text) {
    var out = [], prev = '';
    var it = segmenter.segment(text)[Symbol.iterator]();
    for (var step = it.next(); !step.done; step = it.next()) {
      var seg = step.value.segment;
      var breakBefore;
      if (!out.length) breakBefore = true;
      else if (CLOSE.test(seg) || OPEN.test(prev) || PREFIX.test(prev)) breakBefore = false;
      else if (STOP.test(prev)) breakBefore = true;
      else if (NUM_END.test(prev) && (NUM_START.test(seg) || UNIT.test(seg))) breakBefore = false;
      else if (NUM_START.test(seg) && /(月|約|第|全|計|各)$/.test(prev)) breakBefore = false;
      else if (HIRA.test(seg) && seg.length >= 3 && out[out.length - 1].length >= 6 && !/^(ください|ました|ません|でした|ですか|ますか|られ|ている|ていま)/.test(seg)) breakBefore = true; // 長い文節は、ひらがなの言葉の前でも区切る
      else if (HIRA.test(seg)) breakBefore = HEAD.test(seg) && !/[をにがはでとものへ]$/.test(seg) && out[out.length - 1].length > 1;
      else if (KANJI_END.test(prev) && KANJI_START.test(seg)) breakBefore = false;
      else if (KATA_END.test(prev) && KATA_START.test(seg)) breakBefore = false;      // スマ｜ホ のような分割を防ぐ
      else if (/[A-Za-z]$/.test(prev) && KANJI_START.test(seg)) breakBefore = false;   // LINE｜公式
      else if (prev === 'ばってん' && /^[A-Za-z]/.test(seg)) breakBefore = false;       // ばってん｜Labo
      else breakBefore = true;
      if (breakBefore) out.push(seg); else out[out.length - 1] += seg;
      prev = seg;
    }
    // 1文字だけの文節は前につなげる
    for (var i = out.length - 1; i > 0; i--) {
      if (out[i].replace(/[、。！？!?\s]/g, '').length < 2) { out[i - 1] += out[i]; out.splice(i, 1); }
    }
    // 「また」「その」「いい」のような短い修飾語は、次の言葉とひとまとまりにする
    for (var j = out.length - 2; j >= 0; j--) {
      if (out[j].length <= 2 && !STOP.test(out[j]) && !/\s$/.test(out[j])) { out[j] += out[j + 1]; out.splice(j + 1, 1); }
    }
    return keepTogether(text, out);
  }

  var FLOW = '.faq p, .about__text p, .doc p, .doc li'; // 長い文章は、文ごとには区切らず流す

  function apply(root, bySentence) {
    if (bySentence === undefined) bySentence = !root.matches(FLOW);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      if (!text.trim() || text.length < 4) return;
      var parts = phrases(text);
      if (parts.length < 2) return;
      // 文節を「文」ごとにまとめる
      var sentences = [[]];
      parts.forEach(function (part) {
        sentences[sentences.length - 1].push(part);
        if (/[。！？!?]\s*$/.test(part)) sentences.push([]);
      });
      sentences = sentences.filter(function (x) { return x.length; });
      var frag = document.createDocumentFragment();
      sentences.forEach(function (sentence, n) {
        var box = frag;
        if (bySentence && sentences.length > 1) { box = document.createElement('span'); box.className = 'sn'; frag.appendChild(box); }
        else if (n) frag.appendChild(document.createElement('wbr'));
        sentence.forEach(function (part, i) {
          if (i) box.appendChild(document.createElement('wbr'));
          box.appendChild(document.createTextNode(part));
        });
      });
      node.parentNode.replaceChild(frag, node);
    });
    root.classList.add('ph');
  }

  // PCだけで効く改行（<br class="pc">）の位置は、スマホでは「折り返してよい位置」として扱う
  document.querySelectorAll('br.pc').forEach(function (br) { br.after(document.createElement('wbr')); });

  document.querySelectorAll(TARGETS).forEach(function (el) {
    if (el.closest('.ph') || el.closest('[data-demo]')) return;
    apply(el);
  });
  window.__phraseApply = apply; // デモの吹き出しなど、あとから追加した文章にも使う
  window.__phrases = phrases; // テスト用
})();
