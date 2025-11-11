# LinkdPatient (Firestore)

目的:
- LineID と UserID を紐付けるためのコレクションを Firebase Firestore に作成する。

コレクション名（推奨）:
- LinkdPatient もしくは linkd_patients

ドキュメント構造（例）:
```json
{
    "LineID": "Uxxxxxxxxxxxxxxxxxxxxxx",  // string
    "UserID": "user-12345"                // string
}
```

フィールド:
- LineID: string
- UserID: string

アクセス方針:
- 同じ Firebase プロジェクト内のサーバー（Cloud Functions / Admin SDK）からはアクセス可能にする。
- 外部クライアントからの直接アクセスは不可にする（クライアント SDK による直接読み書きを禁止）。

推奨 Firestore セキュリティルール（クライアントからは完全に禁止）:
```js
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /LinkdPatient/{docId} {
            // クライアントからの読み書きを禁止。Admin SDK はセキュリティルールをバイパスする。
            allow read, write: if false;
        }
    }
}
```

代替案（認証済みかつ App Check が有効なクライアントのみ許可する場合）:
```js
allow read, write: if request.auth != null && request.app != null;
```
- 注意: App Check を使う場合はクライアント側の設定と有効化が必要。

サーバー（Node.js）からの書き込み例（Admin SDK）:
```js
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
await db.collection('LinkdPatient').doc('some-id').set({
    LineID: 'Uxxxxxxxxxxxxxxxxxxxxxx',
    UserID: 'user-12345'
});
```

運用メモ:
- 管理系処理は Cloud Functions やバックエンド（Admin SDK）側で行い、クライアントは直接このコレクションに触れさせない設計を推奨。
- 必要に応じてインデックスや TTL（自動削除）を検討する。
- セキュリティルールを変更したら必ずテストする。
- App Check を使う場合は有効化とクライアント設定を忘れないこと。