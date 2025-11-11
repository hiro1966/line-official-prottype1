/**
 * 暗号化・復号化ユーティリティ
 * AES-256-GCM方式を使用
 */

import * as crypto from 'crypto';
import type { EncryptedPayload, RegistrationData } from '../types';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * 暗号化キーを生成
 * タイムスタンプから決定的にキーを生成（saltは固定）
 */
export function generateEncryptionKey(timestamp: string): Buffer {
  // タイムスタンプをsaltとして使用（決定的に生成）
  const salt = crypto.createHash('sha256').update(timestamp).digest().slice(0, 16);
  const keyMaterial = `medical-line-system-${timestamp}`;
  return crypto.pbkdf2Sync(keyMaterial, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * データを暗号化
 */
export function encrypt(data: string, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    timestamp: new Date().toISOString()
  };
}

/**
 * データを復号化
 */
export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(payload.encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 患者データを暗号化文字列に変換
 * 形式: JSON文字列を暗号化してBase64エンコード
 */
export function encryptPatientData(data: RegistrationData): string {
  const timestamp = data.timestamp;
  const key = generateEncryptionKey(timestamp);
  const jsonData = JSON.stringify(data);
  const encrypted = encrypt(jsonData, key);
  
  // すべての暗号化情報を一つの文字列にまとめる
  const combined = {
    ...encrypted,
    keyTimestamp: timestamp
  };
  
  return Buffer.from(JSON.stringify(combined)).toString('base64');
}

/**
 * 暗号化文字列を患者データに復号化
 */
export function decryptPatientData(encryptString: string): RegistrationData {
  try {
    const combined = JSON.parse(Buffer.from(encryptString, 'base64').toString('utf8'));
    const key = generateEncryptionKey(combined.keyTimestamp);
    
    const payload: EncryptedPayload = {
      encryptedData: combined.encryptedData,
      iv: combined.iv,
      authTag: combined.authTag,
      timestamp: combined.timestamp
    };
    
    const decryptedJson = decrypt(payload, key);
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('Failed to decrypt patient data:', error);
    throw new Error('復号化に失敗しました');
  }
}

/**
 * QRコード有効期限チェック
 */
export function isQRCodeExpired(timestamp: string, expiryHours: number): boolean {
  const registeredTime = new Date(timestamp).getTime();
  const currentTime = new Date().getTime();
  const expiryTime = expiryHours * 60 * 60 * 1000; // hours to milliseconds
  
  return (currentTime - registeredTime) > expiryTime;
}
