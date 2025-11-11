# LINE Webhook 設定確認ガイド

## 🔍 現在の問題

ログから判断すると：
- ✅ 患者登録は成功している (`Test patient registered`)
- ❌ LINEメッセージのWebhookが動いていない（ログにメッセージ受信の記録がない）
- ❌ `LinkdPatient`コレクションにデータが保存されていない

## 📋 確認手順

### 1. LINE Developers ConsoleでWebhook URL確認

1. **LINE Developers Console** にアクセス
   - https://developers.line.biz/console/

2. **プロバイダー** → **チャネル** を選択

3. **Messaging API設定** タブを開く

4. **Webhook URL** を確認
   - 正しいURL: `https://asia-northeast1-lineofficialtest-7d15b.cloudfunctions.net/api/lineHook`
   - ❌ 間違い例: `https://.../lineHook` （`/api` が抜けている）

5. **Webhook の利用** が **オン** になっているか確認

6. **検証ボタン** をクリックして接続テスト
   - ✅ 成功 → Webhookが正しく動作
   - ❌ 失敗 → URLまたは設定に問題

### 2. Firestoreデータベース確認

Firebase Consoleで直接確認：

1. **Firebase Console** にアクセス
   - https://console.firebase.google.com/

2. プロジェクト `lineofficialtest-7d15b` を選択

3. 左メニューから **Firestore Database** をクリック

4. 各コレクションを確認：

   **TestRegisterdID:**
   - 登録した患者IDのドキュメントが存在するか
   - `EncryptString` フィールドに暗号化データがあるか

   **Patients:**
   - 患者データが保存されているか

   **LinkdPatient:**
   - ⚠️ ここが空の場合、LINEメッセージが処理されていない
   - 正常なら `LineID` と `EncryptString` のペアが保存されている

### 3. Webhook URLの修正方法

もしWebhook URLが間違っている場合：

1. LINE Developers Consoleで **Webhook URL** を修正
   ```
   https://asia-northeast1-lineofficialtest-7d15b.cloudfunctions.net/api/lineHook
   ```

2. **更新** ボタンをクリック

3. **検証** ボタンで接続テスト

4. QRコードを読み取って登録メッセージを再送信

### 4. デバッグログの確認

LINE Webhook が呼ばれているか確認：

```bash
# Firebase Consoleでログ確認
# Functions → api → ログ
```

**期待されるログ:**
```
Received message: { userId: 'U...', text: '登録コード: eyJ...', length: 500+ }
Registration code detected, processing...
Patient linked: { userId: '1234567896', patientName: 'てすと花子' }
```

**もしログがない場合:**
- Webhook URLが間違っている
- Webhookが無効化されている
- LINE側の設定に問題がある

## 🔧 トラブルシューティング

### ケース1: Webhook URLが404エラー

**原因:** `/api` が抜けている

**解決策:**
```
❌ https://.../lineHook
✅ https://.../api/lineHook
```

### ケース2: Webhook検証が失敗する

**原因:** 
- Cloud Functionがデプロイされていない
- 環境変数が設定されていない

**解決策:**
1. 再デプロイ: `firebase deploy --only functions`
2. `.env`ファイルを確認

### ケース3: メッセージを送っても反応がない

**原因:**
- Webhookが無効
- レスポンスが200を返していない

**解決策:**
1. LINE Developers Consoleで「Webhookの利用」をオンに
2. ログでエラーがないか確認

## 📊 正常な動作フロー

```
1. QRコード②を読み取る
   ↓
2. 「登録コード: eyJ...」メッセージ送信画面が開く
   ↓
3. 送信ボタンを押す
   ↓
4. LINE → Webhook URL (api/lineHook) を呼び出し
   ↓
5. lineHook関数が受信
   ↓
6. 「Received message:」ログ出力
   ↓
7. 「Registration code detected」ログ出力
   ↓
8. Firestoreの LinkdPatient に保存
   ↓
9. 「○○さんの紐づけが完了しました」返信
   ↓
10. 「リスト」コマンドで確認可能
```

## ✅ 次のアクション

1. **Webhook URL確認** （最優先）
   - LINE Developers Console → Messaging API設定
   - `/api/lineHook` が含まれているか確認

2. **Webhook検証テスト**
   - 検証ボタンをクリック
   - 成功するか確認

3. **Firestoreデータ確認**
   - Firebase Console → Firestore Database
   - LinkdPatient コレクションが空か確認

4. **再テスト**
   - 新しい患者IDで登録
   - QRコードを読み取って送信
   - ログを確認

問題が解決しない場合は、上記の確認結果を教えてください！
