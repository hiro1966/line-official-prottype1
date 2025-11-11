/**
 * Cloud Functions エントリーポイント
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express, { Request, Response } from 'express';

// Firebase Admin初期化
admin.initializeApp();

// ハンドラのインポート
import { regPatientOnCloud } from './handlers/regPatientOnCloud';
import { lineHook } from './handlers/lineHook';
import { sendMessageOnCloud } from './handlers/sendMessageOnCloud';
import {
  testRegPatientOnKarteForm,
  testRegPatientOnKartePost,
  testRegPatientOnKarteResult
} from './handlers/testRegPatientOnKarte';
import {
  testSendMessageOnKarteForm,
  testSendMessageOnKartePost
} from './handlers/testSendMessageOnKarte';

// Express アプリケーションの作成
const app = express();

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ルーティング設定

// 本番用エンドポイント
app.post('/regPatientOnCloud', regPatientOnCloud);
app.post('/lineHook', lineHook);
app.post('/sendMessageOnCloud', sendMessageOnCloud);

// テスト用エンドポイント
app.get('/testRegPatientOnKarte/form', testRegPatientOnKarteForm);
app.post('/testRegPatientOnKarte', testRegPatientOnKartePost);
app.get('/testRegPatientOnKarte/result', testRegPatientOnKarteResult);

app.get('/testSendMessageOnKarte/form', testSendMessageOnKarteForm);
app.post('/testSendMessageOnKarte', testSendMessageOnKartePost);

// ルートパス - テストメニュー
app.get('/', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINE呼び込みシステム - プロトタイプ</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 32px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      margin-bottom: 40px;
      font-size: 16px;
      text-align: center;
    }
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .menu-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      text-decoration: none;
      color: white;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .menu-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
    }
    .menu-card h2 {
      font-size: 20px;
      margin-bottom: 12px;
    }
    .menu-card p {
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.6;
    }
    .menu-card.secondary {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    .info-section {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .info-section h3 {
      color: #333;
      font-size: 18px;
      margin-bottom: 12px;
    }
    .info-section ul {
      margin-left: 20px;
      color: #666;
      line-height: 1.8;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px;
      border-radius: 4px;
      color: #856404;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>医療機関向けLINE呼び込みシステム</h1>
    <p class="subtitle">プロトタイプ版テストメニュー</p>
    
    <div class="menu-grid">
      <a href="./testRegPatientOnKarte/form" class="menu-card">
        <h2>📝 患者登録</h2>
        <p>新しい患者をシステムに登録し、QRコードを生成します。</p>
      </a>
      
      <a href="./testSendMessageOnKarte/form" class="menu-card secondary">
        <h2>📤 メッセージ送信</h2>
        <p>登録済み患者にLINEメッセージを送信します。</p>
      </a>
    </div>
    
    <div class="info-section">
      <h3>🔧 利用可能な機能</h3>
      <ul>
        <li>患者情報の登録とQRコード生成</li>
        <li>LINE公式アカウントとの紐づけ</li>
        <li>診察呼び出しメッセージの送信</li>
        <li>紐づけリストの確認と解除</li>
        <li>複数患者の紐づけ対応</li>
      </ul>
    </div>
    
    <div class="info-section">
      <h3>📚 API エンドポイント</h3>
      <ul>
        <li><code>POST /regPatientOnCloud</code> - 患者登録</li>
        <li><code>POST /lineHook</code> - LINE Webhook</li>
        <li><code>POST /sendMessageOnCloud</code> - メッセージ送信</li>
      </ul>
    </div>
    
    <div class="warning">
      <strong>⚠️ プロトタイプ環境</strong><br>
      これはテスト用のプロトタイプ環境です。本番環境では電子カルテシステムと連携して動作します。
    </div>
  </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Cloud Functions としてエクスポート
export const api = functions
  .region('asia-northeast1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60
  })
  .https.onRequest(app);
