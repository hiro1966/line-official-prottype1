/**
 * SendMessageOnCloud
 * クライアント側から送信されたメッセージ送信要求を受け取り、
 * LinkdPatientテーブルを検索して該当するLINEユーザーにメッセージを送信
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { Client } from '@line/bot-sdk';

/**
 * LINEメッセージを送信
 */
export async function sendMessageOnCloud(req: Request, res: Response) {
  try {
    // リクエストボディからパラメータを取得
    const { encryptString, message } = req.body;
    
    // バリデーション
    if (!encryptString || !message) {
      res.status(400).json({
        success: false,
        error: 'encryptString and message are required'
      });
      return;
    }
    
    // 環境変数からLINE設定を取得
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
    }
    
    // Firestoreから該当する紐づけ情報を取得
    const db = admin.firestore();
    const linkSnapshot = await db
      .collection('LinkdPatient')
      .where('EncryptString', '==', encryptString)
      .get();
    
    if (linkSnapshot.empty) {
      console.log('No linked patient found for:', encryptString);
      res.status(404).json({
        success: false,
        error: 'この患者はスマホ登録されていません'
      });
      return;
    }
    
    // LINE Botクライアントを初期化
    const lineClient = new Client({
      channelAccessToken: channelAccessToken
    });
    
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
    
    // 並列送信
    await Promise.all(sendPromises);
    
    console.log(`Message sent to ${lineIds.length} users:`, lineIds);
    
    res.status(200).json({
      success: true,
      sentCount: lineIds.length,
      message: `${lineIds.length}件のLINEアカウントにメッセージを送信しました`
    });
    
  } catch (error) {
    console.error('Error in sendMessageOnCloud:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + errorMessage
    });
  }
}
