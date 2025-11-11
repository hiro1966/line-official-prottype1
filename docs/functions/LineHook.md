# LineHook.md

## 概要
LINEからのWebhookを受け取り、メイン処理を行うハンドラ設計メモ。各処理はサブ関数に分割して責務を明確にする。LINEのチャンネルIDは環境変数 `LINE_CHANNEL_ID` に保存する（その他の機密情報も環境変数に格納することを推奨）。

## 環境変数
- LINE_CHANNEL_ID: チャンネルID（必須）
- LINE_CHANNEL_SECRET: 署名検証用（推奨）
- LINE_CHANNEL_ACCESS_TOKEN: API呼び出し用（推奨）

## フロー（高レベル）
1. HTTPリクエストを受け取る（JSON body）。
2. 署名検証（`X-Line-Signature`）を行う（CHANNEL_SECRET がある場合）。
3. body の events 配列をループ。
4. イベント種別ごとにサブ関数へ分岐して処理（例: message, follow, postback）。
5. 必要なら外部APIに対して返信/通知（ACCESS_TOKEN を使用）。
6. 正常なら 200 を返す、失敗時は適切なステータスコードを返す。

## 例（Node.js / TypeScript のハンドラ骨格）
```ts
import { createHmac } from "crypto";
import type { Request, Response } from "express";

const CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function lineWebhook(req: Request, res: Response) {
    const body = req.rawBody ?? JSON.stringify(req.body); // ライブラリに合わせて取得
    const signature = req.header("X-Line-Signature") || "";

    // 署名検証（存在する場合のみ）
    if (CHANNEL_SECRET) {
        const hash = createHmac("sha256", CHANNEL_SECRET).update(body).digest("base64");
        if (hash !== signature) {
            res.status(401).send("Invalid signature");
            return;
        }
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!payload || !Array.isArray(payload.events)) {
        res.status(400).send("Bad request");
        return;
    }

    try {
        await Promise.all(payload.events.map(handleEvent));
        res.status(200).send("OK");
    } catch (err) {
        console.error("lineWebhook error:", err);
        res.status(500).send("Internal Server Error");
    }
}

async function handleEvent(event: any) {
    switch (event.type) {
        case "message":
            return handleMessageEvent(event);
        case "follow":
            return handleFollowEvent(event);
        case "postback":
            return handlePostbackEvent(event);
        default:
            return handleUnknownEvent(event);
    }
}

async function handleMessageEvent(event: any) {
    // メインの処理（必要ならさらに分割）
    const { replyToken, message } = event;
    // 例: テキスト判定 -> サブ関数へ
    if (message.type === "text") {
        return handleTextMessage(replyToken, message.text, event);
    }
    // 他のメッセージタイプの処理
}

async function handleTextMessage(replyToken: string, text: string, event: any) {
    // 実際の応答ロジック。外部API呼び出し等はここに集約
    // CHANNEL_ID は process.env.LINE_CHANNEL_ID で参照可能
    console.log("CHANNEL_ID:", CHANNEL_ID);
    // 返信処理（例: reply API 呼び出し）
}
```

## 備考
- 各サブ関数は副作用を持つ処理（DB, API呼び出し）と純粋ロジックに分けるとテストしやすい。
- 並列処理は Promise.all を使うが、外部API制限に注意して適宜シリアライズする。
- ログはイベントIDやユーザーIDを含めて残すと障害解析が容易になる。
- セキュリティ: チャンネルID自体は公開しても問題ないケースが多いが、シークレットやアクセストークンは必ず安全に管理する。

以上をベースに実装を分割していくと良い。