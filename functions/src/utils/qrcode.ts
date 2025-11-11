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
export async function generateMessageQRCode(encryptString: string): Promise<string> {
  // LINEでメッセージを送信するためのURL形式
  // line://msg/text/<メッセージ内容>
  const message = `登録コード: ${encryptString}`;
  const lineMessageUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
  
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
  lineOfficialAccountUrl: string,
  encryptString: string
): Promise<QRCodeSet> {
  const [lineQRCode, messageQRCode] = await Promise.all([
    generateLineQRCode(lineOfficialAccountUrl),
    generateMessageQRCode(encryptString)
  ]);
  
  return {
    lineQRCode,
    messageQRCode
  };
}
