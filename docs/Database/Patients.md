# Patients（Firestore）設定メモ

目的: Firestore に Patients コレクションを作成。各ドキュメントはフィールド `UserID` (string) を持つ。プロジェクト内（認証済みユーザー / 管理側）からはアクセス可能、外部未認証アクセスは不可にする。

## スキーマ（例）
- コレクション: Patients
- ドキュメントID: 任意（自動生成 or UserID）
- フィールド:
    - UserID: string

## セキュリティルール（Firestore）
firestore.rules に追加:
```rules
service cloud.firestore {
    match /databases/{database}/documents {
        match /Patients/{patientId} {
            // 作成はリクエストボディの UserID と認証ユーザーが一致する場合のみ
            allow create: if request.auth != null
                                        && request.auth.uid == request.resource.data.UserID;
            // 読み取り・更新・削除は保存済みドキュメントの UserID と認証ユーザーが一致する場合のみ
            allow read, update, delete: if request.auth != null
                                                                    && request.auth.uid == resource.data.UserID;
        }
    }
}
```
- 上記ルールにより、認証された同プロジェクトのユーザーのみ自分の Patients ドキュメントにアクセス可能。未認証や別プロジェクトからの直接アクセスは拒否される。
- サーバー側（管理操作）でのフルアクセスは Admin SDK（サービスアカウント）を使うことで実行可能（Admin SDK はセキュリティルールをバイパスします）。

## クライアント（Web / JS）サンプル（Firebase v9）
```js
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

// ユーザーがサインイン済みであることが前提
const user = auth.currentUser;
if (user) {
    await addDoc(collection(db, "Patients"), {
        UserID: user.uid,
        // 他フィールド...
    });
}
```

## サーバー（Node.js Admin SDK）サンプル
```js
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

await db.collection("Patients").add({
    UserID: "some-user-id",
    // 他フィールド...
});
```

必要なら、ドキュメント例・運用ルール（ドキュメントIDの決め方、索引、バックアップ）も追記します。