/**
 * 型定義ファイル
 */

// 患者情報
export interface PatientData {
  userId: string;
  patientName: string;
  encryptString: string;
  registeredAt: Date;
}

// QRコード登録データ
export interface RegistrationData {
  userId: string;
  patientName: string;
  timestamp: string;
}

// LINE紐づけデータ
export interface LinkdPatientData {
  lineId: string;
  encryptString: string;
  registeredAt: Date;
}

// テスト用登録ID
export interface TestRegisterdIdData {
  userId: string;
  encryptString: string;
  registeredAt: Date;
}

// 暗号化されたペイロード
export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
  timestamp: string;
}

// メッセージ送信リクエスト
export interface SendMessageRequest {
  encryptString: string;
  message: string;
}

// 設定ファイル
export interface AppConfig {
  qrCodeExpiry: number;
  messageTemplate: string;
  lineOfficialAccountUrl: string;
}

// LINE Webhook イベント型
export interface LineWebhookEvent {
  type: string;
  replyToken: string;
  source: {
    userId: string;
    type: string;
  };
  timestamp: number;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}
