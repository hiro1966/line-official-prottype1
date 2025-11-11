# TestRegisterdID (Firestore)

目的: Firestore に登録済み ID を保存するコレクションを作成。プロジェクト内のサーバ（Admin SDK / Cloud Functions 等）からのみアクセス可能にし、外部クライアントからの直接アクセスは不可とする。

## コレクションとフィールド
- コレクション名: TestRegisterdID
- ドキュメントID: 任意（例: UserID をキーにする等）
- フィールド:
    - UserID: string
    - EncryptString: string

## セキュリティルール（クライアントからのアクセスを完全に拒否）
Firestore セキュリティルールでクライアントアクセスをブロックし、Admin SDK（サーバ側）からのアクセスに任せるのが簡潔で確実です。Admin SDK はセキュリティルールをバイパスします。

例:
```js
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /TestRegisterdID/{docId} {
            allow read, write: if false; // クライアントからは常に拒否
        }
    }
}
```

## サーバ側（Admin SDK）アクセス例（Node.js）
サーバ（自サーバ / Cloud Functions）で Admin SDK を使って読み書きします。Admin SDK はルールをバイパスします。

```js
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json')),
    projectId: 'YOUR_PROJECT_ID'
});

const db = admin.firestore();

// 書き込み例
await db.collection('TestRegisterdID').doc('user123').set({
    UserID: 'user123',
    EncryptString: 'encrypted_value_here'
});

// 読み込み例
const doc = await db.collection('TestRegisterdID').doc('user123').get();
if (doc.exists) console.log(doc.data());
```

## 注意事項
- 外部クライアントを完全に遮断するため、フロントエンドから直接 Firestore に接続する設定やキーを公開しないこと。
- サーバ側アクセスはサービスアカウントキーや Cloud Functions を使用し、キーの管理・権限付与は最小権限で行うこと。
- 必要に応じて、Audit Logging や IAM ロールでアクセス監査／制御を追加すること。
- もし「特定の認証済みユーザーのみ許可」など細かい条件が必要なら、Security Rules とカスタムクレームで制御を設計する。
