# エックスサーバーへのデプロイガイド (Next.js Standalone版)

このSFA・工程管理システムをエックスサーバー（共有レンタルサーバー）のNode.js機能で運用するための手順です。

## 1. 事前準備 (ローカル環境)

### 1.1 `next.config.ts` の確認
`output: 'standalone'` が設定されていることを確認してください。これにより、実行に必要な最小限のファイルが抽出されます。

### 1.2 本番用ビルドの実行
ターミナルで以下のコマンドを実行します。

```bash
npm run build
```

ビルド完了後、以下のディレクトリが重要になります：
- `.next/standalone/` : サーバー実行に必要なファイル群
- `.next/static/` : クライアント側の静的ファイル
- `public/` : 画像などの静的アセット
- `sfa.db` : SQLite データベース

## 2. サーバーへのアップロード

FTP（FileZilla等）またはエックスサーバーのファイルマネージャを使用してアップロードします。

### 2.1 アップロード構成
ドメインのディレクトリ（例: `example.com/`）の中に、アプリ用のディレクトリ（例: `sfa-app/`）を作成し、以下のように配置します。

```text
sfa-app/
├── .env.local (サーバー用に作成)
├── sfa.db
├── server.js (standalone/server.js を移動)
├── package.json (standalone/package.json を移動)
├── node_modules/ (standalone/node_modules を丸ごと)
├── .next/ (standalone/.next を丸ごと)
│   └── static/ (ビルド後の .next/static をここへコピー/アップロード)
└── public/ (ルートの public フォルダをここへ)
```

> [!TIP]
> **効率的なアップロード方法**
> `standalone` フォルダの中身をベースにし、そこに `public` と `.next/static` を追加する形になります。

## 3. サーバー上での設定

### 3.1 Node.jsの有効化
1. エックスサーバーのサーバーパネルにログインします。
2. 「Node.js設定」を選択し、対象ドメインで Node.js を **有効** にします（バージョン 18 以上を推奨）。
3. 「アプリ公開」設定にて、以下の設定を行います：
   - **アプリディレクトリ**: `/sfa-app` (アップロードした場所)
   - **実行コマンド**: `node server.js`
   - **公開ディレクトリ**: 指定なし（Node.jsアプリとして動作させるため）

### 3.2 権限（パーミッション）の設定
SQLiteの書き込みを許可するため、以下のパーミッションを確認してください。

- `sfa.db` ファイル: **606**
- `sfa-app` ディレクトリ: **705**

### 3.3 環境変数の設定
`.env.local` をサーバー上に作成し、必要な値を設定します。
特に `NEXT_PUBLIC_API_URL` は実際のドメイン名に変更してください。

```env
NEXT_PUBLIC_API_URL=https://your-domain.com
CRON_SECRET=...
SHARED_WEBHOOK_URL=...
```

## 4. 注意事項
- **メール送信**: 現在の `api/mail/send` はログ出力のシミュレーションです。実運用には `nodemailer` 等を使用した SMTP 連携が必要です。
- **DBのバックアップ**: SQLite を使用しているため、定期的に `sfa.db` を手動または自動でバックアップすることを強く推奨します。
