# SendMessageOnCloud

目的
- SendMessageOnKarte（プロトタイプ名：TestSendMessageOnKarte）から受け取ったイベントを処理し、LINEへメッセージ送信を行うクラウドFunctionの仕様書。

トリガー
- HTTP（Karte からの webhook または別 Function からの呼び出し）
- 受信ボディは JSON（下記「入力例」参照）

必須環境変数
- `LINE_CHANNEL_ID` — （要求仕様）LINEチャネルの ID（ご指示通り保存）
- `LINE_CHANNEL_ACCESS_TOKEN` — LINE Messaging API のチャネルアクセストークン（送信に必須）
- `LINE_API_ENDPOINT` — 任意、デフォルト: `https://api.line.me/v2/bot/message/push`
- 必要に応じて検証用トークン（例: `KARTE_SECRET`）

主な処理フロー
1. 受信イベントの検証（署名／トークンがある場合）
2. ペイロード解析（送信元、ユーザーID、メッセージ内容などを抽出）
3. LINE に送信するメッセージフォーマットに変換
4. LINE API へ送信（HTTP POST、Authorization ヘッダにチャネルアクセストークン）
5. 成功／失敗のログ記録と必要ならリトライ

推奨サブFunction
- validateRequest(req): 受信リクエストの正当性チェック
- parseKartePayload(body): Karte のイベントから送信対象と本文を抽出
- buildLineMessages(parsed): LINE Messaging API 用の messages 配列を生成
- sendMessageToLine(to, messages): LINE API へ送信（HTTP クライアントを使用）
- handleError(err): ログ記録・アラート・リトライ制御

入力例（Karte からの想定ペイロード）
{
    "source": "SendMessageOnKarte",
    "userId": "Uxxxxxxxxxxxxxx",
    "message": {
        "type": "text",
        "text": "こんにちは、テストメッセージです。"
    },
    "metadata": { "campaignId": "cmp-123" }
}

LINE へ送る例（push API 用）
{
    "to": "Uxxxxxxxxxxxxxx",
    "messages": [
        { "type": "text", "text": "こんにちは、テストメッセージです。" }
    ]
}

簡易 Node.js（例）— 処理の骨子
- 環境変数を参照: `process.env.LINE_CHANNEL_ID`, `process.env.LINE_CHANNEL_ACCESS_TOKEN`
- axios 等で POST `/v2/bot/message/push` へ送信、ヘッダ:
    - `Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    - `Content-Type: application/json`

エラー処理
- HTTP 5xx は指数バックオフでリトライ
- 4xx はリクエスト内容を検証してログ出力（無効なアクセストークン等）
- 変換エラーや必須フィールド欠落は400応答で caller に返す

テスト
- モックの Karte イベントで単体テスト
- LINE のデベロッパー向けテストアカウントで統合テスト（実際にメッセージが届くか確認）

デプロイ備考
- 環境変数はクラウド環境のシークレット管理に保存
- 最低限の監視（送信成功率、エラー率）を設定

備考
- 指定どおり「LINE チャンネルID」は環境変数として保持する。送信にはチャネルアクセストークンも必要なため、そちらも安全に管理すること。
- 実装は言語・ランタイム（Node.js / Python / Go 等）に依存しない設計を推奨。
- 詳細な実装サンプルが必要なら言語を指定して依頼してください。