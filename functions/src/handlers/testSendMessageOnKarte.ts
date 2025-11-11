/**
 * TestSendMessageOnKarte
 * プロトタイプ用のメッセージ送信テストWeb UI
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { Client } from '@line/bot-sdk';
import { loadConfig, applyMessageTemplate } from '../utils/config';
import { decryptPatientData } from '../utils/encryption';

/**
 * メッセージ送信フォームHTMLを返す
 */
export async function testSendMessageOnKarteForm(req: Request, res: Response) {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メッセージ送信テスト</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      width: 100%;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input, textarea, select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      font-family: inherit;
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #11998e;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(17, 153, 142, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .template-info {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 4px;
      font-size: 14px;
      color: #555;
    }
    .template-info code {
      background: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px;
      margin-top: 24px;
      border-radius: 4px;
      font-size: 14px;
      color: #856404;
    }
    .result {
      margin-top: 24px;
      padding: 16px;
      border-radius: 8px;
      display: none;
    }
    .result.success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      display: block;
    }
    .result.error {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      display: block;
    }
    .link-group {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e0e0e0;
    }
    .link-button {
      display: inline-block;
      padding: 10px 20px;
      background: white;
      color: #11998e;
      border: 2px solid #11998e;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s;
    }
    .link-button:hover {
      background: #11998e;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>メッセージ送信テスト</h1>
    <p class="subtitle">プロトタイプ用メッセージ送信システム</p>
    
    <div class="template-info">
      <strong>📝 メッセージテンプレート</strong><br>
      <code>{patientName}</code> と <code>{roomNumber}</code> を使用できます<br>
      例: 「{patientName}さん、{roomNumber}へお越しください」
    </div>
    
    <form id="sendForm">
      <div class="form-group">
        <label for="userId">患者ID *</label>
        <input 
          type="text" 
          id="userId" 
          name="userId" 
          required 
          placeholder="例: P12345"
        >
      </div>
      
      <div class="form-group">
        <label for="messageType">メッセージタイプ</label>
        <select id="messageType" name="messageType">
          <option value="template">テンプレート使用</option>
          <option value="custom">カスタムメッセージ</option>
        </select>
      </div>
      
      <div class="form-group" id="roomNumberGroup">
        <label for="roomNumber">診察室番号</label>
        <input 
          type="text" 
          id="roomNumber" 
          name="roomNumber" 
          placeholder="例: 1番診察室"
        >
      </div>
      
      <div class="form-group" id="customMessageGroup" style="display: none;">
        <label for="customMessage">カスタムメッセージ</label>
        <textarea 
          id="customMessage" 
          name="customMessage"
          placeholder="送信したいメッセージを入力してください"
        ></textarea>
      </div>
      
      <button type="submit" id="submitBtn">送信</button>
    </form>
    
    <div id="result" class="result"></div>
    
    <div class="note">
      <strong>⚠️ テスト環境用</strong><br>
      この画面はプロトタイプ用のテスト環境です。本番環境では電子カルテの診察進行状況に応じて自動的にメッセージが送信されます。
    </div>
    
    <div class="link-group">
      <a href="/testRegPatientOnKarte/form" class="link-button">患者登録に戻る</a>
    </div>
  </div>
  
  <script>
    const messageTypeSelect = document.getElementById('messageType');
    const roomNumberGroup = document.getElementById('roomNumberGroup');
    const customMessageGroup = document.getElementById('customMessageGroup');
    const resultDiv = document.getElementById('result');
    
    messageTypeSelect.addEventListener('change', () => {
      if (messageTypeSelect.value === 'custom') {
        roomNumberGroup.style.display = 'none';
        customMessageGroup.style.display = 'block';
      } else {
        roomNumberGroup.style.display = 'block';
        customMessageGroup.style.display = 'none';
      }
    });
    
    document.getElementById('sendForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';
      resultDiv.style.display = 'none';
      
      const messageType = document.getElementById('messageType').value;
      const formData = {
        userId: document.getElementById('userId').value,
        messageType: messageType
      };
      
      if (messageType === 'template') {
        formData.roomNumber = document.getElementById('roomNumber').value;
      } else {
        formData.customMessage = document.getElementById('customMessage').value;
      }
      
      try {
        const response = await fetch('/testSendMessageOnKarte', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          resultDiv.className = 'result success';
          resultDiv.innerHTML = '<strong>✓ 送信成功</strong><br>' + result.message;
        } else {
          resultDiv.className = 'result error';
          resultDiv.innerHTML = '<strong>✗ 送信失敗</strong><br>' + result.error;
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = '送信';
      } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<strong>✗ エラー</strong><br>' + error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = '送信';
      }
    });
  </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * メッセージ送信処理
 */
export async function testSendMessageOnKartePost(req: Request, res: Response) {
  try {
    const { userId, messageType, roomNumber, customMessage } = req.body;
    
    // バリデーション
    if (!userId) {
      res.status(400).json({
        success: false,
        error: '患者IDは必須です'
      });
      return;
    }
    
    if (messageType === 'custom' && !customMessage) {
      res.status(400).json({
        success: false,
        error: 'カスタムメッセージを入力してください'
      });
      return;
    }
    
    const db = admin.firestore();
    
    // TestRegisterdIDから暗号化文字列を取得
    const testDoc = await db.collection('TestRegisterdID').doc(userId).get();
    
    if (!testDoc.exists) {
      res.status(404).json({
        success: false,
        error: '患者ID: ' + userId + ' はスマホ登録されていません'
      });
      return;
    }
    
    const encryptString = testDoc.data()!.EncryptString;
    
    // LinkdPatientから紐づけ情報を取得
    const linkSnapshot = await db
      .collection('LinkdPatient')
      .where('EncryptString', '==', encryptString)
      .get();
    
    if (linkSnapshot.empty) {
      res.status(404).json({
        success: false,
        error: 'この患者はLINEアカウントと紐づけされていません'
      });
      return;
    }
    
    // メッセージを生成
    let message: string;
    
    if (messageType === 'custom') {
      message = customMessage;
    } else {
      // テンプレートを使用
      const config = loadConfig();
      const patientData = decryptPatientData(encryptString);
      
      message = applyMessageTemplate(config.messageTemplate, {
        patientName: patientData.patientName,
        roomNumber: roomNumber || '診察室'
      });
    }
    
    // LINE Botクライアントを初期化
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }
    
    const lineClient = new Client({ channelAccessToken });
    
    // 紐づけられている全てのLINEユーザーにメッセージを送信
    const sendPromises: Promise<any>[] = [];
    const lineIds: string[] = [];
    
    linkSnapshot.forEach((doc) => {
      const data = doc.data();
      const lineId = data.LineID;
      lineIds.push(lineId);
      
      sendPromises.push(
        lineClient.pushMessage(lineId, {
          type: 'text',
          text: message
        })
      );
    });
    
    await Promise.all(sendPromises);
    
    console.log('Test message sent:', { userId, message, lineIds });
    
    res.status(200).json({
      success: true,
      sentCount: lineIds.length,
      message: `${lineIds.length}件のLINEアカウントにメッセージを送信しました`
    });
    
  } catch (error) {
    console.error('Error in testSendMessageOnKartePost:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    });
  }
}
