// 画面の動作テスト（デモ・見積もり・スマホ表示）。
// 実行: npm run test:e2e（Playwright が必要: npm i -D playwright && npx playwright install chromium）
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4399;
const base = `http://localhost:${PORT}`;
const shots = process.env.SHOTS_DIR;
if (shots) mkdirSync(shots, { recursive: true });

const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = 0;
const errors = [];

async function check(name, fn) {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) { failed += 1; console.log(`FAIL ${name}\n     ${String(e.message).split('\n')[0]}`); }
}
async function open(width, height, path = '/') {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${path} @${width}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`${path} @${width}: ${m.text()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(base + path, { waitUntil: 'load' });
  return page;
}
const noOverflow = async (page) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, '横スクロールが出ている');

try {
  // ---------- 表示幅ごとの確認 ----------
  for (const [w, h] of [[375, 720], [390, 844], [768, 1024], [1280, 800]]) {
    await check(`幅${w}px：横スクロールなし・文字のはみ出しなし`, async () => {
      const page = await open(w, h);
      await page.waitForSelector('.richmenu button');
      await noOverflow(page);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('.btn, .chip, .richmenu__cell, .plan__price, .opt__price, .sum dd')]
        .filter((el) => el.offsetParent && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.trim().slice(0, 20)));
      assert.deepEqual(clipped, []);
      if (shots) {
        await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in')));
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${shots}/top-${w}.png` });
        await page.screenshot({ path: `${shots}/full-${w}.png`, fullPage: true });
      }
      await page.context().close();
    });
  }

  // ---------- デモ ----------
  await check('デモ：あいさつ → メニューをタップ → 返事が出る', async () => {
    const page = await open(390, 844);
    const log = page.locator('[data-demo-log]');
    await assert.doesNotReject(log.getByText('友だち追加ありがとうございます').waitFor());
    await page.locator('.richmenu button', { hasText: '営業時間' }).click();
    await log.getByText('定休日は水曜日です').waitFor();
    await page.context().close();
  });

  await check('デモ：クーポンを使うと使用済みになる', async () => {
    const page = await open(390, 844);
    await page.locator('.richmenu button', { hasText: 'クーポン' }).click();
    const use = page.getByRole('button', { name: 'クーポンを使う' });
    await use.click();
    await page.getByRole('button', { name: '使用済み' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '使用済み' }).isDisabled(), true);
    await page.context().close();
  });

  await check('デモ：ポイントカードのスタンプが増える', async () => {
    const page = await open(390, 844);
    await page.locator('.richmenu button', { hasText: 'ポイントカード' }).click();
    await page.getByRole('button', { name: /来店スタンプ/ }).click();
    assert.equal(await page.locator('.stamps .is-on').count(), 3);
    await page.context().close();
  });

  await check('デモ：自由入力にキーワードで返事する', async () => {
    const page = await open(390, 844);
    await page.locator('[data-demo-input]').fill('駐車場はありますか');
    await page.locator('[data-demo-form] button').click();
    await page.locator('[data-demo-log]').getByText('2台分あります').waitFor();
    await page.context().close();
  });

  await check('デモ：美容室に切り替えて予約 → 見積もりに予約フォームが入る', async () => {
    const page = await open(390, 844);
    await page.locator('[data-shop="hair"]').click();
    assert.equal(await page.locator('[data-demo-name]').textContent(), 'ヘアサロン ばってん');
    await page.locator('.richmenu button', { hasText: '予約する' }).click();
    await page.getByRole('button', { name: '内容を確認する' }).click();
    await page.getByRole('button', { name: 'この内容で送る' }).click();
    await page.getByText('ご予約の希望を受け付けました').waitFor();
    await page.getByRole('link', { name: /予約受付フォームの料金を見る/ }).click();
    assert.equal(await page.locator('input[value="reserve_form"]').isChecked(), true);
    assert.equal(await page.locator('[data-sum="initial"]').textContent(), '15,800円');
    await page.context().close();
  });

  await check('デモ：「最初から」で会話が戻る', async () => {
    const page = await open(390, 844);
    await page.locator('.richmenu button', { hasText: 'メニュー' }).first().click();
    await page.getByText('今月のメニュー').waitFor();
    await page.locator('[data-demo-reset]').click();
    await page.locator('[data-demo-log]').getByText('友だち追加ありがとうございます').waitFor();
    assert.equal(await page.locator('[data-demo-log] .msg').count(), 1);
    await page.context().close();
  });

  // ---------- 見積もり ----------
  await check('見積もり：初期表示は 9,800円 / 0円', async () => {
    const page = await open(1280, 800);
    assert.equal(await page.locator('[data-sum="initial"]').textContent(), '9,800円');
    assert.equal(await page.locator('[data-sum="monthly"]').textContent(), '0円');
    await page.context().close();
  });

  await check('見積もり：オプションと月額を足すと合計が変わる', async () => {
    const page = await open(1280, 800);
    await page.locator('input[value="coupon"]').check();
    await page.locator('input[value="shopcard"]').check();
    await page.locator('input[name="ops"][value="light"]').check();
    await page.locator('input[name="line"][value="light"]').check();
    assert.equal(await page.locator('[data-sum="initial"]').textContent(), '13,800円');
    assert.equal(await page.locator('[data-sum="monthly"]').textContent(), '8,500円');
    assert.equal(await page.locator('[data-sum="firstMonth"]').textContent(), '22,300円');
    assert.equal(await page.locator('[data-sum="firstYear"]').textContent(), '115,800円');
    await page.context().close();
  });

  await check('見積もり：エルメ専用の項目はプランを変えると選べる／戻すと外れる', async () => {
    const page = await open(1280, 800);
    const tab = page.locator('input[value="tab_menu"]');
    assert.equal(await tab.isDisabled(), true);
    assert.equal(await page.locator('input[value="richmenu_template"]').isDisabled(), true);
    await page.locator('input[name="plan"][value="lme"]').check({ force: true });
    assert.equal(await tab.isDisabled(), false);
    assert.equal(await page.locator('input[name="lme"][value="free"]').isChecked(), true);
    await tab.check();
    assert.equal(await page.locator('[data-sum="initial"]').textContent(), '24,800円');
    await page.locator('input[name="plan"][value="basic"]').check({ force: true });
    assert.equal(await tab.isChecked(), false);
    assert.equal(await page.locator('[data-sum="initial"]').textContent(), '9,800円');
    await page.context().close();
  });

  await check('見積もり：コピー・共有URL・リセット', async () => {
    const page = await open(1280, 800);
    await page.locator('.opts summary', { hasText: '配信・店頭・診断' }).click();
    await page.locator('input[value="pop"]').check();
    await page.locator('[data-sum-copy]').click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(text, /初期費用：12,300円/);
    await page.locator('[data-sum-share]').click();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(url, /\?plan=basic&opt=pop&ops=none&line=free&lme=none#price$/);
    const shared = await open(1280, 800, url.replace(base, ''));
    assert.equal(await shared.locator('input[value="pop"]').isChecked(), true);
    assert.equal(await shared.locator('[data-sum="initial"]').textContent(), '12,300円');
    await shared.locator('[data-sum-reset]').click();
    assert.equal(await shared.locator('[data-sum="initial"]').textContent(), '9,800円');
    await shared.context().close();
    await page.context().close();
  });

  // ---------- 導線・その他 ----------
  await check('相談ボタンはすべて公式LINEへ（6か所）', async () => {
    const page = await open(1280, 800);
    const hrefs = await page.locator('[data-cta]').evaluateAll((els) => els.map((a) => a.href));
    assert.equal(hrefs.length, 6);
    assert.ok(hrefs.every((h) => h === 'https://lin.ee/vXP1QKs'));
    await page.context().close();
  });

  await check('スマホ：メニュー開閉、下部ボタンはスクロール後に出てフッターで消える', async () => {
    const page = await open(390, 844);
    const toggle = page.locator('.header__toggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    await page.locator('#nav a', { hasText: 'よくある質問' }).click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await page.waitForTimeout(900);
    assert.equal(await page.locator('[data-dock]').evaluate((el) => el.classList.contains('is-on')), true);
    const h2 = await page.locator('#h-faq').boundingBox();
    assert.ok(h2.y >= 60, `見出しが固定ヘッダーに隠れている (y=${h2.y})`);
    await page.locator('.footer__cta .btn').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('[data-dock]').evaluate((el) => el.classList.contains('is-on')), false);
    await page.context().close();
  });

  await check('キーボード：FAQを開ける／画像にaltがある／h1は1つ', async () => {
    const page = await open(1280, 800);
    await page.locator('.faq summary').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.faq details').first().evaluate((d) => d.open), true);
    assert.equal(await page.locator('img:not([alt])').count(), 0);
    assert.equal(await page.locator('h1').count(), 1);
    await page.context().close();
  });

  await check('JavaScriptなしでも本文と料金が読める', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route(/fonts\./, (r) => r.abort());
    await page.goto(base);
    assert.equal(await page.getByText('基本構築プラン').first().isVisible(), true);
    assert.equal(await page.locator('.worries li').first().evaluate((el) => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('.sum__static').isVisible(), true);
    if (shots) await page.screenshot({ path: `${shots}/nojs-390.png`, fullPage: true });
    await context.close();
  });

  await check('プライバシーポリシーと404が表示できる', async () => {
    const page = await open(390, 844, '/privacy.html');
    assert.equal(await page.locator('h1').textContent(), 'プライバシーポリシー');
    await noOverflow(page);
    if (shots) await page.screenshot({ path: `${shots}/privacy-390.png`, fullPage: true });
    const res = await page.goto(`${base}/nai-page`);
    assert.equal(res.status(), 404);
    assert.equal(await page.locator('h1').textContent(), 'ページが見つかりません');
    await page.context().close();
  });

  await check('ブラウザのエラーが出ていない', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed}件 失敗` : '\nすべて成功');
process.exit(failed ? 1 : 0);
