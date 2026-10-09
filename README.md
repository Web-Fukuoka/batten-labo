# ばってんLabo 公式サイト

福岡の店舗向けLINE公式アカウント制作・運用サポート「ばってんLabo」のサイトです。
ビルド作業のいらない静的サイトで、このフォルダをそのままアップロードすれば公開できます。

## ファイルの構成

| ファイル | 内容 |
|---|---|
| `index.html` | トップページ（文章・料金はすべてここ） |
| `privacy.html` | プライバシーポリシー |
| `404.html` | ページが見つからないときの表示 |
| `assets/css/site.css` | デザイン（色は先頭の `:root` で変更） |
| `assets/js/demo.js` | スマホ画面のLINE風デモ（お店の内容は `SHOPS`） |
| `assets/js/estimate.js` / `estimate-core.js` | 見積もりの表示／計算ロジック |
| `assets/js/site.js` | メニュー開閉、スクロール時の表示、計測 |
| `assets/js/phrase.js` | 文章の改行を文節の切れ目にそろえる |
| `assets/img/` | ロゴ、ファビコン、SNS共有用画像 |
| `tests/` | 見積もり計算のテスト、画面の動作テスト |
| `tools/serve.mjs` | 手元で確認するための簡易サーバー |

## 手元で表示する

Node.js（20以上）が入っていれば、追加のインストールは不要です。

```
npm start
```

表示された `http://localhost:4321` をブラウザで開きます。

`index.html` をダブルクリックして開いた場合も文章と料金は読めますが、デモと見積もりは動きません（ブラウザの制限のため）。動作を見るときは上の方法で開いてください。

## 公開前に必ず直すところ

1. **プライバシーポリシー**（`privacy.html`）: 黄色い「要記入」「要確認」の箇所（代表者名、所在地、制定日、アクセス解析の記載）。
2. **公開URL**: 決まったら次の3か所の `https://example.com` を書き換えます。
   - `index.html` の先頭付近にあるコメント内の3行（書き換えたらコメントの囲み `<!--` と `-->` を外す）
   - `sitemap.xml`
   - `robots.txt`（`Sitemap:` の行の先頭の `#` を外す）
3. **運営者の紹介**: `index.html` の「福岡のお店を、もっと身近に支えたい。」のカードに、名前・顔写真・ひとことを足すと相談されやすくなります。
4. **月額運用プランの説明**: ライト保守・配信おまかせ・運用拡張で何をするかが未記入です。`index.html` の「毎月の運用サポート」の各行に、ほかの行と同じ形で `<small>説明</small>` を足してください。

## よくある変更

### 料金を変える

`index.html` の該当する行で、**表示用の金額**と **`data-price`** の両方を同じ数字にします。見積もりは `data-price` を使って計算します。

```html
<input type="checkbox" name="opt" value="coupon" data-price="1500" data-name="クーポン作成">
<span class="opt__name">クーポン作成</span><span class="opt__price">1,500円</span>
```

- `data-included-in="trial basic lme"` … そのプランに含まれるので選べなくする（二重請求の防止）
- `data-requires="lme"` … 「エルメ基本構築」を選んだときだけ選べる

変更したら `npm test` で計算が合っているか確かめられます。プランやオプションの数を増減した場合は、`tests/estimate.test.mjs` の件数（最初のテスト）も直してください。
基本構築プランの金額を変えたときは、ページ上部の「初期構築 9,800円から」、`<meta name="description">`、構造化データ（`"price": "9800"`）、見積もり欄の初期文言も合わせて直します。

### 相談先のLINEを変える

全ファイルで `https://lin.ee/vXP1QKs` を検索して置き換えます。

### ロゴを差し替える

`assets/img/logo-mark.png`（ヘッダー用・背景透過）と `logo-full.png`（キャッチコピー入り）を同じファイル名で上書きします。縦横比が変わる場合は、`<img>` の `width` と `height` も合わせます。SNS共有用は `ogp.jpg`（1200×630）です。

### 写真を差し替える

写真は、これまでのサイト（`Batten.Labo-New`）で使っていた4枚をそのまま使っています。

| ファイル | 使っている場所 |
|---|---|
| `assets/img/hero-staff.png` / `.webp` | ファーストビューのイラスト（背景を透過にしたもの） |
| `assets/img/shop-owner-1600.webp` | 料金の手前の相談帯 |
| `assets/img/fig-*.png` / `.webp` | 見出しの横の人物イラスト |
| `assets/img/shop-appliances` / `shop-bakery` / `tree`（各 `.png` と `.webp`） | フッターの街並み、「できること」1枚目 |
| `assets/img/cafe-800.webp` / `salon-800.webp` / `shop-800.webp` | 活用イメージの3枚 |

同じファイル名で上書きすれば差し替わります。縦横比が変わる場合は `<img>` の `width` と `height` も合わせてください。素材写真の人物を、運営者やお客さまとして見せないようにします。写真の利用条件（商用利用・サイト掲載の可否）は、入手元であらためて確認してください。

### 文章の改行について

改行の位置は、`assets/js/phrase.js` が自動で整えます。文章を「文節」ごとに区切り、スマホでもPCでも、単語の途中や1文字だけ残る位置では折り返さないようにしています。文章を書き換えたときに、改行の指定を足す必要はありません。

- PCのときだけ決まった位置で改行したい箇所には `<br class="pc">` を入れます（スマホでは無視され、自動の改行に任せます）。
- 区切り方がおかしい言葉があれば、`phrase.js` の `HEAD`（文節の先頭になる言葉）に足すと直せます。

### イラストと動きを変える

イラストは画像ファイルではなく、`index.html` の中に `<svg>` として直接書いてあります（お悩みの3つ、できることの2つ、フッターの街並み）。色と動きは `assets/css/site.css` の「イラストの共通の塗り」「フッターの街並みイラスト」にまとまっています。
動きを止めたいものは、該当する `animation` の行を消してください。OSで「視差効果を減らす」を設定している人には、動きは自動で止まります。

### デモのお店の内容を変える

`assets/js/demo.js` の `SHOPS` に、お店ごとのあいさつ、メニュー、キーワード応答がまとまっています。

## GitHub Pages で公開する

1. GitHub で新しいリポジトリを作る。
2. このフォルダの中身をすべてアップロードする（「Add file」→「Upload files」。`.nojekyll` も含める）。
3. リポジトリの「Settings」→「Pages」で、Source を「Deploy from a branch」、Branch を `main` の `/ (root)` にして保存。
4. 数分後に表示される URL を、上の「公開URL」の手順で各ファイルに書き込む。

独自ドメインを使う場合は、同じ「Pages」画面の「Custom domain」にドメインを入力し、ドメイン会社の管理画面で GitHub Pages 向けの DNS 設定（`www` の CNAME を `ユーザー名.github.io` に向ける）を行います。

## 検索とアクセス解析

- **Google Search Console**: 公開後にサイトを登録し、`sitemap.xml` のURLを送信します。所有権の確認用に渡される `<meta name="google-site-verification" ...>` は `index.html` の `<head>` に貼ります。
- **GA4**: 使う場合は、発行されたタグを `index.html` の `<head>` に貼ります。貼るだけで次のイベントが送られます。入力した文章や個人情報は送りません。
  - `line_contact_click`（相談ボタン。`position` で場所が分かる）
  - `demo_start` / `demo_interaction` / `demo_to_estimate`
  - `estimate_start` / `estimate_copy` / `estimate_complete`
- GA4 を入れたら、`privacy.html` の「要確認」の段落を実際の内容に書き換えてください。

## テスト

```
npm test            # 見積もり計算（追加インストール不要）
npm run test:e2e    # 画面の動作（要 Playwright: npm i -D playwright && npx playwright install chromium）
```
