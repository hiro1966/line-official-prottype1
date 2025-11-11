/**
 * 設定ファイル読み込みユーティリティ
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AppConfig } from '../types';

let cachedConfig: AppConfig | null = null;

/**
 * 設定ファイルを読み込む
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  try {
    // Cloud Functionsではプロジェクトルートからの相対パス
    const configPath = path.join(__dirname, '../../../config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    cachedConfig = JSON.parse(configData);
    return cachedConfig!;
  } catch (error) {
    console.error('Failed to load config:', error);
    // デフォルト値を返す
    return {
      qrCodeExpiry: 24,
      messageTemplate: '{patientName}さん、{roomNumber}へお越しください'
    };
  }
}

/**
 * メッセージテンプレートを適用
 */
export function applyMessageTemplate(
  template: string,
  params: { patientName?: string; roomNumber?: string }
): string {
  let message = template;
  
  if (params.patientName) {
    message = message.replace('{patientName}', params.patientName);
  }
  
  if (params.roomNumber) {
    message = message.replace('{roomNumber}', params.roomNumber);
  }
  
  return message;
}
