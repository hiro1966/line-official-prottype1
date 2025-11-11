/**
 * TestRegPatientOnKarte
 * プロトタイプ用の患者登録Web UI
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { encryptPatientData } from '../utils/encryption';
import { generateQRCodeSet } from '../utils/qrcode';
import type { RegistrationData } from '../types';

/**
 * 登録フォームHTMLを返す
 */
export async function testRegPatientOnKarteForm(req: Request, res: Response) {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>患者登録テスト</title>
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
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }
    .note {
      background: #f0f7ff;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin-top: 24px;
      border-radius: 4px;
      font-size: 14px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>患者登録テスト</h1>
    <p class="subtitle">プロトタイプ用患者登録システム</p>
    
    <form id="registrationForm">
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
        <label for="patientName">患者氏名 *</label>
        <input 
          type="text" 
          id="patientName" 
          name="patientName" 
          required 
          placeholder="例: 山田太郎"
        >
      </div>
      
      <button type="submit" id="submitBtn">登録</button>
    </form>
    
    <div class="note">
      <strong>⚠️ テスト環境用</strong><br>
      この画面はプロトタイプ用のテスト環境です。本番環境では電子カルテシステムから自動的に患者情報が送信されます。
    </div>
  </div>
  
  <script>
    async function submitRegistration(forceReissue = false) {
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = '処理中...';
      
      const formData = {
        userId: document.getElementById('userId').value,
        patientName: document.getElementById('patientName').value,
        forceReissue: forceReissue
      };
      
      try {
        const response = await fetch('/api/testRegPatientOnKarte', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // データをsessionStorageに保存してリダイレクト
          sessionStorage.setItem('registrationResult', JSON.stringify(result));
          window.location.href = '/api/testRegPatientOnKarte/result';
        } else if (result.alreadyRegistered) {
          // 既存登録の確認ダイアログ
          submitBtn.disabled = false;
          submitBtn.textContent = '登録';
          
          const confirmed = confirm(result.message + '\\n\\n「OK」を押すと再発行します。');
          if (confirmed) {
            // 再発行実行
            await submitRegistration(true);
          }
        } else {
          alert('エラー: ' + (result.error || result.message));
          submitBtn.disabled = false;
          submitBtn.textContent = '登録';
        }
      } catch (error) {
        alert('エラーが発生しました: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '登録';
      }
    }
    
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitRegistration(false);
    });
  </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * 登録処理
 */
export async function testRegPatientOnKartePost(req: Request, res: Response) {
  try {
    const { userId, patientName, forceReissue } = req.body;
    
    // バリデーション
    if (!userId || !patientName) {
      res.status(400).json({
        success: false,
        error: '患者IDと氏名は必須です'
      });
      return;
    }
    
    const db = admin.firestore();
    
    // 既存登録チェック
    const existingDoc = await db.collection('TestRegisterdID').doc(userId).get();
    if (existingDoc.exists && !forceReissue) {
      // 既存登録あり、かつ強制再発行フラグがない場合は確認を求める
      res.status(200).json({
        success: false,
        alreadyRegistered: true,
        message: 'この患者IDは既に発行済みです。再度発行しますか？',
        userId,
        patientName
      });
      return;
    }
    
    // 暗号化データ生成
    const timestamp = new Date().toISOString();
    const registrationData: RegistrationData = {
      userId,
      patientName,
      timestamp
    };
    
    const encryptString = encryptPatientData(registrationData);
    
    // TestRegisterdIDテーブルに保存
    await db.collection('TestRegisterdID').doc(userId).set({
      UserID: userId,
      EncryptString: encryptString,
      RegisteredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Patientsテーブルにも保存（RegPatientOnCloudをシミュレート）
    await db.collection('Patients').add({
      EncryptString: encryptString,
      RegisteredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // QRコード生成
    const lineBotBasicId = process.env.LINE_BOT_BASIC_ID;
    if (!lineBotBasicId) {
      throw new Error('LINE_BOT_BASIC_ID is not set in environment variables');
    }
    const qrCodes = await generateQRCodeSet(lineBotBasicId, encryptString);
    
    console.log('Test patient registered:', { userId, patientName });
    
    res.status(200).json({
      success: true,
      userId,
      patientName,
      encryptString,
      qrCodes
    });
    
  } catch (error) {
    console.error('Error in testRegPatientOnKartePost:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    });
  }
}

/**
 * 登録結果（QRコード表示）ページ
 */
export async function testRegPatientOnKarteResult(req: Request, res: Response) {
  // sessionStorageからデータを取得するため、パラメータは不要
  try {
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登録完了 - QRコード</title>
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
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
      text-align: center;
    }
    .success-icon {
      text-align: center;
      font-size: 64px;
      margin-bottom: 20px;
    }
    .patient-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .patient-info h3 {
      color: #333;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .patient-info p {
      color: #666;
      margin-bottom: 8px;
    }
    .qr-section {
      margin-bottom: 40px;
    }
    .qr-section h2 {
      color: #333;
      font-size: 20px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #667eea;
    }
    .qr-code {
      text-align: center;
      background: #f8f9fa;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .qr-code img {
      max-width: 100%;
      height: auto;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
    }
    .qr-description {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
      margin-top: 12px;
    }
    .steps {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 4px;
      margin-top: 30px;
    }
    .steps h3 {
      color: #856404;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .steps ol {
      margin-left: 20px;
      color: #856404;
    }
    .steps li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 30px;
    }
    button, .button {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }
    button:hover, .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div class="container" id="content">
    <div style="text-align: center; padding: 40px;">
      <p>データを読み込んでいます...</p>
    </div>
  </div>
  
  <script>
    // sessionStorageからデータを取得
    const resultData = sessionStorage.getItem('registrationResult');
    
    if (!resultData) {
      document.getElementById('content').innerHTML = \`
        <div style="text-align: center; padding: 40px;">
          <h1 style="color: #d32f2f;">エラー</h1>
          <p>データが見つかりません。患者登録画面からやり直してください。</p>
          <div class="button-group" style="margin-top: 30px;">
            <a href="/api/testRegPatientOnKarte/form" class="button btn-primary">患者登録に戻る</a>
          </div>
        </div>
      \`;
    } else {
      const result = JSON.parse(resultData);
      
      // データ使用後は削除
      sessionStorage.removeItem('registrationResult');
      
      // コンテンツを表示
      document.getElementById('content').innerHTML = \`
        <div class="success-icon">✅</div>
        <h1>登録完了</h1>
        
        <div class="patient-info">
          <h3>患者情報</h3>
          <p><strong>患者ID:</strong> \${result.userId}</p>
          <p><strong>氏名:</strong> \${result.patientName}</p>
        </div>
        
        <div class="qr-section">
          <h2>① LINE友だち登録用QRコード</h2>
          <div class="qr-code">
            <img src="\${result.qrCodes.lineQRCode}" alt="LINE友だち登録QRコード">
            <p class="qr-description">
              まず、このQRコードをスマートフォンで読み取って、<br>
              LINE公式アカウントを友だち追加してください。
            </p>
          </div>
        </div>
        
        <div class="qr-section">
          <h2>② 患者登録用QRコード</h2>
          <div class="qr-code">
            <img src="\${result.qrCodes.messageQRCode}" alt="患者登録QRコード">
            <p class="qr-description">
              友だち追加後、このQRコードを読み取って<br>
              患者情報とLINEアカウントを紐づけてください。
            </p>
          </div>
        </div>
        
        <div class="steps">
          <h3>📱 登録手順</h3>
          <ol>
            <li>スマートフォンで①のQRコードを読み取り、LINE公式アカウントを友だち追加</li>
            <li>友だち追加後、②のQRコードを読み取る</li>
            <li>表示されたメッセージを送信</li>
            <li>登録完了のメッセージが届いたら完了です</li>
          </ol>
        </div>
        
        <div class="button-group">
          <a href="/api/testRegPatientOnKarte/form" class="button btn-secondary">
            新しい患者を登録
          </a>
          <a href="/api/testSendMessageOnKarte/form" class="button btn-primary">
            メッセージ送信テスト
          </a>
        </div>
      \`;
    }
  </script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('Error in testRegPatientOnKarteResult:', error);
    res.status(400).send('Invalid data');
  }
}
