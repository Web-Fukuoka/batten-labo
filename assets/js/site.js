// ページ全体の小さな動き（メニュー開閉・スクロール時の表示・下部ボタン・計測）

/** GA4 が入っていればイベントを送る。入っていなければ何もしない。個人情報や入力文は送らない。 */
export function track(name, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params);
}

// --- スマホのメニュー開閉 ---
const toggle = document.querySelector('.header__toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
}

// --- スクロールに合わせて、ふわっと表示 ---
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const siblings = [...entry.target.parentElement.children].filter((el) => el.classList.contains('reveal'));
      entry.target.style.transitionDelay = `${siblings.indexOf(entry.target) * 40}ms`;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px 12% 0px' } /* 画面に入る少し手前で表示を始める */);
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}

// --- スマホ下部の固定ボタン：最初の相談ボタンが見えなくなったら出し、フッターでは消す ---
const dock = document.querySelector('[data-dock]');
const heroCta = document.querySelector('.hero__actions');
const footerCta = document.querySelector('.footer__cta');
if (dock && heroCta && footerCta && 'IntersectionObserver' in window) {
  dock.hidden = false;
  let pastHero = false;
  let atFooter = false;
  const update = () => dock.classList.toggle('is-on', pastHero && !atFooter);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }).observe(heroCta);
  new IntersectionObserver(([e]) => { atFooter = e.isIntersecting; update(); }).observe(footerCta);
}

// --- 相談ボタンのクリック計測（どの位置のボタンが押されたか） ---
document.addEventListener('click', (e) => {
  const cta = e.target.closest('[data-cta]');
  if (cta) track('line_contact_click', { position: cta.dataset.cta });
});

// --- 数字のカウントアップ（data-count のついた金額） ---
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-count]').forEach((el) => {
  const goal = Number(el.dataset.count);
  if (still || !Number.isFinite(goal)) return;
  const t0 = performance.now() + 150;
  const step = (now) => {
    const t = Math.min(1, Math.max(0, (now - t0) / 500));
    el.textContent = Math.round(goal * (1 - (1 - t) ** 3)).toLocaleString('ja-JP');
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = '0';
  requestAnimationFrame(step);
});
