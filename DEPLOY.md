# SFA App デプロイ・運用ガイド (Vercel + Supabase 版)

現在のシステムは **Vercel (フロントエンド/API)** と **Supabase (データベース)** を組み合わせたモダンな構成になっています。

## 1. 構成概要
- **Frontend/Backend**: Next.js (App Router)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js (Google OAuth)
- **Infrastructure**: Vercel

## 2. 環境変数の設定 (Vercel)
Vercel のプロジェクト設定で以下の環境変数が正しく設定されている必要があります。

| キー | 内容 | 例 |
| :--- | :--- | :--- |
| `POSTGRES_URL` | Supabase の接続文字列 | `postgres://postgres:[pw]@...` |
| `NEXTAUTH_SECRET` | セッション暗号化用ランダム文字列 | (任意の長い文字列) |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth シークレット | (Google Cloud Consoleから取得) |
| `CRON_SECRET` | 定期実行(Cron)保護用キー | (任意の文字列) |

> [!IMPORTANT]
> **NEXTAUTH_URL について**
> Vercel では通常、`NEXTAUTH_URL` を設定しなくても自動認識されます。ログインエラーが出る場合は、この環境変数を削除するか、公開ドメインと完全に一致させてください。

## 3. ログインの管理
ユーザーのログイン可否は Supabase の `employees` テーブルで管理されています。
1. Supabase の Table Editor で `employees` テーブルを開きます。
2. ログインを許可したいユーザーの `email` (Googleアカウント) を追加します。
3. `role` を `admin` または `user` に設定します。

## 4. 定期タスク (Cron)
Vercel Cron または外部ツール (GitHub Actions 等) を使用して、以下のエンドポイントを定期的に叩くことでリマインダーや定期案件生成が動作します。
- `GET /api/cron/reminders` (毎日 09:00 推奨)
- `POST /api/recurring` (月初 00:00 推奨)

## 5. データベースのバックアップ
Supabase の管理画面から自動バックアップの設定を確認してください。
