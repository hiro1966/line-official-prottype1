# 医療機関向けLINE呼び込みシステム - プロトタイプ

電子カルテシステムと連携し、患者のスマートフォン（LINE）を通じて診察の呼び出しメッセージを送信するシステムのプロトタイプ実装です。

## 📋 プロジェクト概要

本システムは以下の機能を提供します：

- **患者登録機能**: QRコードを生成して患者情報を登録
- **LINE連携**: LINE Messaging APIを使用した患者との紐づけ
- **メッセージ送信**: 診察呼び出しメッセージの送信
- **紐づけ管理**: 複数患者の紐づけ確認と解除

詳細な仕様は [SPECIFICATION.md](./SPECIFICATION.md) と [docs/overview.md](./docs/overview.md) を参照してください。

## 🏗️ システム構成

### クラウド側（Google Cloud Functions）

- **RegPatientOnCloud**: 患者登録データの受信・保存
- **LineHook**: LINE Webhookハンドラ
- **SendMessageOnCloud**: メッセージ送信処理
- **TestRegPatientOnKarte**: プロトタイプ用患者登録Web UI
- **TestSendMessageOnKarte**: プロトタイプ用メッセージ送信Web UI

### データベース（Firestore）

- **Patients**: 登録処理中の患者情報（一時保管）
- **LinkdPatient**: LINEユーザーIDと患者情報の紐づけ
- **TestRegisterdID**: プロトタイプ用登録済みID管理

## 🚀 セットアップ手順

### 1. 前提条件

- Node.js 20.x LTS
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud Platform アカウント
- LINE Developers アカウント

### 2. プロジェクトのクローン

```bash
git clone <repository-url>
cd line-official-prottype1
```

### 3. 依存パッケージのインストール

```bash
# ルートディレクトリ
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

### 4. Firebase プロジェクトの設定

```bash
# Firebase にログイン
firebase login

# プロジェクトを初期化（既存のプロジェクトを使用）
firebase use --add
```

### 5. LINE Messaging API の設定

1. [LINE Developers Console](https://developers.line.biz/console/) でチャンネルを作成
2. 以下の情報を取得：
   - チャンネルID
   - チャンネルシークレット
   - チャンネルアクセストークン

### 6. 環境変数の設定

```bash
# .env.example をコピー
cp .env.example .env

# .env を編集して環境変数を設定
# LINE_CHANNEL_ID=your_channel_id
# LINE_CHANNEL_SECRET=your_channel_secret
# LINE_CHANNEL_ACCESS_TOKEN=your_access_token
```

Cloud Functionsに環境変数を設定：

```bash
firebase functions:config:set \
  line.channel_id="YOUR_CHANNEL_ID" \
  line.channel_secret="YOUR_CHANNEL_SECRET" \
  line.channel_access_token="YOUR_ACCESS_TOKEN"
```

### 7. config.json の編集

```bash
# config.json を編集
# lineOfficialAccountUrl に LINE公式アカウントのURLを設定
```

```json
{
  "qrCodeExpiry": 24,
  "messageTemplate": "{patientName}さん、{roomNumber}へお越しください",
  "lineOfficialAccountUrl": "https://line.me/R/ti/p/@YOUR_LINE_ID"
}
```

## 🧪 ローカルでのテスト

### Firebase Emulator を使用

```bash
# Emulator の起動
firebase emulators:start

# ブラウザで以下にアクセス
# http://localhost:5001/<project-id>/asia-northeast1/api
```

### ビルドのみ実行

```bash
cd functions
npm run build
```

## 📦 デプロイ

### Firestore セキュリティルールのデプロイ

```bash
firebase deploy --only firestore:rules
```

### Cloud Functions のデプロイ

```bash
# すべての関数をデプロイ
firebase deploy --only functions

# 特定の関数のみデプロイ
firebase deploy --only functions:api
```

### デプロイ後の確認

デプロイが完了すると、以下のようなURLが表示されます：

```
https://asia-northeast1-<project-id>.cloudfunctions.net/api
```

## 🔧 LINE Webhook URLの設定

1. Cloud Functionsのデプロイ後、Webhook URLを取得
2. LINE Developers Console でWebhook URLを設定：
   ```
   https://asia-northeast1-<project-id>.cloudfunctions.net/api/lineHook
   ```
3. Webhookを有効化

## 💻 使用方法

### 患者登録

1. ブラウザで以下にアクセス：
   ```
   https://asia-northeast1-<project-id>.cloudfunctions.net/api/testRegPatientOnKarte/form
   ```

2. 患者IDと氏名を入力して登録

3. 2つのQRコードが表示されます：
   - LINE友だち登録用QRコード
   - 患者登録用QRコード

### LINE連携

1. スマートフォンで1つ目のQRコードを読み取り、友だち追加
2. 2つ目のQRコードを読み取り、表示されたメッセージを送信
3. 紐づけ完了メッセージが届く

### メッセージ送信テスト

1. ブラウザで以下にアクセス：
   ```
   https://asia-northeast1-<project-id>.cloudfunctions.net/api/testSendMessageOnKarte/form
   ```

2. 患者IDを入力し、メッセージタイプを選択
3. 送信ボタンをクリック

### LINEでの操作

- `リスト`: 紐づけされている患者情報を確認
- 数字（1, 2, ...）: 紐づけ解除する患者を選択
- `はい` / `Yes`: 紐づけ解除を確認

## 📚 API エンドポイント

### RegPatientOnCloud
```
POST /api/regPatientOnCloud
Content-Type: application/json

{
  "encryptString": "暗号化された患者情報"
}
```

### SendMessageOnCloud
```
POST /api/sendMessageOnCloud
Content-Type: application/json

{
  "encryptString": "暗号化された患者情報",
  "message": "送信するメッセージ"
}
```

### LineHook
```
POST /api/lineHook
Content-Type: application/json
X-Line-Signature: <署名>

{
  "events": [...]
}
```

## 🔐 セキュリティ

- 患者情報はAES-256-GCM方式で暗号化
- QRコードには有効期限（デフォルト24時間）を設定
- Firestoreへのクライアント直接アクセスは禁止
- LINE Webhook署名検証を実装

## 📝 主要ファイル構成

```
.
├── functions/
│   ├── src/
│   │   ├── handlers/          # Cloud Functions ハンドラ
│   │   │   ├── regPatientOnCloud.ts
│   │   │   ├── lineHook.ts
│   │   │   ├── sendMessageOnCloud.ts
│   │   │   ├── testRegPatientOnKarte.ts
│   │   │   └── testSendMessageOnKarte.ts
│   │   ├── utils/             # ユーティリティ
│   │   │   ├── encryption.ts  # 暗号化
│   │   │   ├── qrcode.ts      # QRコード生成
│   │   │   └── config.ts      # 設定読み込み
│   │   ├── types/             # 型定義
│   │   │   └── index.ts
│   │   └── index.ts           # エントリーポイント
│   ├── package.json
│   └── tsconfig.json
├── docs/                      # ドキュメント
├── config.json                # 設定ファイル
├── firebase.json              # Firebase設定
├── firestore.rules            # Firestoreセキュリティルール
├── firestore.indexes.json     # Firestoreインデックス
├── .env.example               # 環境変数テンプレート
└── README.md
```

## 🐛 トラブルシューティング

### デプロイエラー

```bash
# ビルドエラーの確認
cd functions
npm run build

# キャッシュクリア
firebase functions:delete api
firebase deploy --only functions
```

### 環境変数が読み込まれない

```bash
# 設定確認
firebase functions:config:get

# 再設定
firebase functions:config:set line.channel_id="YOUR_ID"
```

### LINE Webhookが動作しない

1. Webhook URLが正しく設定されているか確認
2. LINE Developers ConsoleでWebhookが有効化されているか確認
3. Cloud Functionsのログを確認：
   ```bash
   firebase functions:log
   ```

## 📄 ライセンス

（ライセンス情報を記載）

## 👥 開発者

（開発者情報を記載）

## 📞 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
