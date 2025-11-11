# デプロイメント仕様

## 1. インフラ構成概要

本プロジェクトは、Google CloudとAWSを組み合わせたハイブリッド構成を採用しています。

### 1.1 使用するクラウドサービス
- **Google Cloud Platform**: メインのアプリケーション基盤
- **AWS**: SMS送信機能のみ

## 2. Google Cloud Platform構成

### 2.1 Cloud Functions
本プロジェクトのバックエンドAPIは、すべてGoogle Cloud Functionsで実装します。

**要件:**
- ランタイム: Node.js 20以上（または Python 3.11以上）
- リージョン: asia-northeast1（東京）を推奨
- メモリ: 256MB（デフォルト）、必要に応じて調整
- タイムアウト: 60秒

**デプロイ対象の関数:**
- データモデル: [functions](./functions)下のファイルを参照

### 2.2 Firestore
データベースとしてFirestore（ネイティブモード）を使用します。

**構成:**
- ロケーション: asia-northeast1（東京）
- データモデル: [database.md](./database.md)を参照

**コレクション構成:**
- `users` - ユーザー情報
- `notifications` - 通知履歴
- `sessions` - セッション管理

### 2.3 認証
Firebase Authenticationを使用します。

**有効化する認証方法:**
- メール/パスワード認証
- Google OAuth 2.0

## 3. AWS構成

### 3.1 Amazon SNS（SMS送信専用）
SMS送信機能は、AWS SNSを使用します。Google Cloud Functionsから AWS SDK経由で呼び出します。

**要件:**
- リージョン: ap-northeast-1（東京）
- SMS送信タイプ: Transactional（トランザクション）
- 送信元番号: プロジェクト開始時に取得

**実装上の注意:**
- Cloud FunctionsにAWS認証情報（Access Key ID、Secret Access Key）を環境変数として設定
- IAMユーザーには `sns:Publish` 権限のみを付与（最小権限の原則）

**環境変数:**
