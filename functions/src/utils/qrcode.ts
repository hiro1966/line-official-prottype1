/**
 * QRコード生成ユーティリティ
 */

import * as QRCode from 'qrcode';

/**
 * QRコードを生成してData URLとして返す
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('QRコードの生成に失敗しました');
  }
}

/**
 * LINE友だち登録用QRコードを生成
 */
export async function generateLineQRCode(lineOfficialAccountUrl: string): Promise<string> {
  return generateQRCode(lineOfficialAccountUrl);
}

/**
 * メッセージ送信用QRコードを生成
 * LINEのメッセージ送信フォーマットに対応
 */
export async function generateMessageQRCode(lineBotBasicId: string, encryptString: string): Promise<string> {
  // LINEでメッセージを送信するためのURL形式
  // https://line.me/R/oaMessage/<BOT_BASIC_ID>/?<メッセージ内容>
  const message = `登録コード: ${encryptString}`;
  const lineMessageUrl = `https://line.me/R/oaMessage/${lineBotBasicId}/?${encodeURIComponent(message)}`;
  
  return generateQRCode(lineMessageUrl);
}

/**
 * 複数のQRコードを生成
 */
export interface QRCodeSet {
  lineQRCode: string;
  messageQRCode: string;
}

export async function generateQRCodeSet(
  lineBotBasicId: string,
  encryptString: string
): Promise<QRCodeSet> {
  // LINE友だち登録用URLを生成（@付きのBASIC IDから）
  const lineOfficialAccountUrl = `https://line.me/R/ti/p/${lineBotBasicId}`;
  
  const [lineQRCode, messageQRCode] = await Promise.all([
    generateLineQRCode(lineOfficialAccountUrl),
    generateMessageQRCode(lineBotBasicId, encryptString)
  ]);
  
  return {
    lineQRCode,
    messageQRCode
  };
}
