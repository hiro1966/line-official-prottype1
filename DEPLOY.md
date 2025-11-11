# デプロイ手順書

## 📋 デプロイ前チェックリスト

- [ ] Node.js 20.x がインストールされている
- [ ] Firebase CLI がインストールされている (`npm install -g firebase-tools`)
- [ ] Firebase プロジェクトが作成済み
- [ ] LINE Developers アカウントでチャンネルが作成済み
- [ ] LINE チャンネルID、シークレット、アクセストークンを取得済み

## 🚀 初回デプロイ手順

### 1. Firebase プロジェクトの設定

```bash
# Firebase にログイン
firebase login

# プロジェクトを選択
firebase use --add
# または既存プロジェクトを指定
firebase use <project-id>

# 現在のプロジェクトを確認
firebase projects:list
```

### 2. 環境変数の設定

```bash
# LINE Messaging API の設定
firebase functions:config:set \
  line.channel_id="YOUR_CHANNEL_ID" \
  line.channel_secret="YOUR_CHANNEL_SECRET" \
  line.channel_access_token="YOUR_ACCESS_TOKEN"

# 設定確認
firebase functions:config:get
```

出力例：
```json
{
  "line": {
    "channel_id": "1234567890",
    "channel_secret": "abcdef...",
    "channel_access_token": "xyz..."
  }
}
```

### 3. config.json の編集

`config.json` を開いて、LINE公式アカウントのURLを設定：

```json
{
  "qrCodeExpiry": 24,
  "messageTemplate": "{patientName}さん、{roomNumber}へお越しください",
  "lineOfficialAccountUrl": "https://line.me/R/ti/p/@YOUR_LINE_ID"
}
```

**LINE公式アカウントURLの取得方法：**
1. LINE Developers Console → Messaging API設定
2. 「QRコード」セクションのURLをコピー

### 4. 依存パッケージのインストール

```bash
# プロジェクトルートで実行
npm install

# Cloud Functions ディレクトリで実行
cd functions
npm install
cd ..
```

### 5. ビルドの確認

```bash
cd functions
npm run build
```

エラーがないことを確認してください。

### 6. Firestore セキュリティルールのデプロイ

```bash
# ルートディレクトリで実行
firebase deploy --only firestore:rules
```

### 7. Firestore インデックスのデプロイ

```bash
firebase deploy --only firestore:indexes
```

### 8. Cloud Functions のデプロイ

```bash
firebase deploy --only functions
```

デプロイには数分かかります。完了すると以下のような出力が表示されます：

```
✔  functions[api(asia-northeast1)] Successful create operation.
Function URL (api): https://asia-northeast1-<project-id>.cloudfunctions.net/api
```

### 9. Webhook URL の設定

1. デプロイ後に表示されたFunction URLをコピー
2. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
3. 該当のチャンネルを選択
4. 「Messaging API設定」タブを開く
5. 「Webhook URL」に以下を設定：
   ```
   https://asia-northeast1-<project-id>.cloudfunctions.net/api/lineHook
   ```
6. 「検証」ボタンをクリックして接続を確認
7. 「Webhookの利用」を有効化

### 10. 動作確認

ブラウザで以下のURLにアクセス：
```
https://asia-northeast1-<project-id>.cloudfunctions.net/api
```

メニュー画面が表示されれば成功です。

## 🔄 更新デプロイ手順

コードを修正した後の再デプロイ手順：

### 1. ビルドの確認

```bash
cd functions
npm run build
```

### 2. 変更内容に応じてデプロイ

**関数のみ変更した場合：**
```bash
firebase deploy --only functions
```

**Firestoreルールも変更した場合：**
```bash
firebase deploy --only firestore:rules,functions
```

**すべて更新する場合：**
```bash
firebase deploy
```

### 3. 動作確認

デプロイ後、必ず動作確認を行ってください。

## 📊 デプロイ後の確認項目

### Cloud Functions のログ確認

```bash
# リアルタイムログ
firebase functions:log --only api

# 最新のログを表示
firebase functions:log --only api --limit 50
```

### Firestore のデータ確認

Firebase Console でデータを確認：
```
https://console.firebase.google.com/project/<project-id>/firestore
```

### 環境変数の確認

```bash
firebase functions:config:get
```

## 🐛 トラブルシューティング

### デプロイエラー: "Billing account not configured"

Firebase プロジェクトで課金を有効化する必要があります：

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 歯車アイコン → プロジェクト設定
4. 「使用量と請求」タブ
5. 「Blazeプラン」にアップグレード

### デプロイエラー: "Permission denied"

適切な権限がない可能性があります：

```bash
# 再度ログイン
firebase logout
firebase login

# プロジェクトを再設定
firebase use <project-id>
```

### 関数が見つからない

```bash
# 既存の関数を確認
firebase functions:list

# 関数を削除して再デプロイ
firebase functions:delete api
firebase deploy --only functions
```

### Webhook検証エラー

1. Webhook URLが正しいか確認
2. 環境変数が正しく設定されているか確認：
   ```bash
   firebase functions:config:get
   ```
3. Cloud Functionsのログを確認：
   ```bash
   firebase functions:log --only api
   ```

## 🔐 セキュリティ設定

### サービスアカウントキーの管理

**重要:** サービスアカウントキーは絶対にGitにコミットしないでください。

```bash
# .gitignore に追加されているか確認
cat .gitignore | grep serviceAccount
```

### 環境変数の管理

環境変数は Firebase Functions Config を使用：

```bash
# 設定
firebase functions:config:set key.name="value"

# 確認
firebase functions:config:get

# 削除
firebase functions:config:unset key.name
```

## 📈 本番環境への移行

プロトタイプから本番環境への移行時の注意点：

1. **別のFirebaseプロジェクトを作成**
   - 本番用とテスト用を分離

2. **環境変数を再設定**
   - 本番用のLINEチャンネル情報を設定

3. **config.json を本番用に変更**
   - 本番用のLINE公式アカウントURLを設定

4. **Firestoreのバックアップ設定**
   ```bash
   gcloud firestore export gs://<bucket-name>
   ```

5. **監視とアラートの設定**
   - Cloud Loggingでログ監視
   - エラー率のアラート設定

## 📝 デプロイログ記録

デプロイ時は以下の情報を記録しておくことを推奨：

- デプロイ日時
- デプロイしたバージョン（Gitコミットハッシュ）
- 変更内容
- デプロイ担当者
- 確認結果

例：
```
日時: 2024-11-11 12:00
バージョン: abc123def
変更内容: メッセージテンプレート機能追加
担当者: 山田太郎
確認: OK - 患者登録、メッセージ送信正常動作
```

## 🔄 ロールバック手順

問題が発生した場合のロールバック：

```bash
# 特定のバージョンをデプロイ
git checkout <previous-commit>
firebase deploy --only functions

# または
# Firebase Console から以前のバージョンを選択してロールバック
```

## 📞 サポート

デプロイに問題が発生した場合：

1. Cloud Functionsのログを確認
2. Firebase Consoleでエラーを確認
3. 本ドキュメントのトラブルシューティングを参照
4. それでも解決しない場合は開発チームに連絡
