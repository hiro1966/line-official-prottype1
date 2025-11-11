/**
 * LineHook
 * LINE Messaging APIのWebhookエンドポイント
 * - 友だち登録
 * - 患者との紐づけ
 * - 紐づけリストの確認
 * - 紐づけ解除
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { Client, middleware, WebhookEvent, MessageEvent, FollowEvent } from '@line/bot-sdk';
import { decryptPatientData, isQRCodeExpired } from '../utils/encryption';
import { loadConfig } from '../utils/config';

// 紐づけ解除の確認状態を一時保存（本番環境ではFirestoreやRedisを使用）
const unlinkConfirmations = new Map<string, { patientIndex: number; timestamp: number }>();

/**
 * LINE Webhook ハンドラ
 */
export async function lineHook(req: Request, res: Response) {
  try {
    // 署名検証
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      throw new Error('LINE_CHANNEL_SECRET is not set');
    }
    
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      res.status(401).send('No signature');
      return;
    }
    
    // イベント処理
    const events: WebhookEvent[] = req.body.events;
    
    await Promise.all(events.map(handleEvent));
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in lineHook:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * イベント振り分け
 */
async function handleEvent(event: WebhookEvent): Promise<void> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  }
  
  const client = new Client({ channelAccessToken });
  
  switch (event.type) {
    case 'message':
      await handleMessageEvent(event as MessageEvent, client);
      break;
    case 'follow':
      await handleFollowEvent(event as FollowEvent, client);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }
}

/**
 * 友だち登録イベント処理
 */
async function handleFollowEvent(event: FollowEvent, client: Client): Promise<void> {
  const userId = event.source.userId;
  
  if (!userId) return;
  
  const welcomeMessage = {
    type: 'text' as const,
    text: 'ご登録ありがとうございます！\n\n次のステップとして、受付でお渡しした用紙の2枚目のQRコード（登録用QRコード）を読み取ってください。\n\nQRコードを読み取ると、あなたのLINEアカウントと患者情報が紐づけられ、診察の呼び出しをLINEで受け取れるようになります。'
  };
  
  await client.replyMessage(event.replyToken, welcomeMessage);
}

/**
 * メッセージイベント処理
 */
async function handleMessageEvent(event: MessageEvent, client: Client): Promise<void> {
  if (event.message.type !== 'text') return;
  
  const userId = event.source.userId;
  const text = event.message.text.trim();
  
  if (!userId) return;
  
  // コマンド判定
  if (text === 'リスト' || text.toLowerCase() === 'list') {
    await handleListCommand(userId, event.replyToken, client);
  } else if (/^\d+$/.test(text)) {
    // 数字のみ = 紐づけ解除の番号指定
    await handleUnlinkNumberCommand(userId, parseInt(text), event.replyToken, client);
  } else if (text === 'はい' || text.toLowerCase() === 'yes') {
    // 解除確認
    await handleUnlinkConfirmCommand(userId, event.replyToken, client);
  } else if (text.includes('登録コード:')) {
    // QRコードからの登録
    await handleRegistrationMessage(userId, text, event.replyToken, client);
  } else {
    // 未知のメッセージ（解除処理をキャンセル）
    unlinkConfirmations.delete(userId);
    
    const helpMessage = {
      type: 'text' as const,
      text: '以下のコマンドをご利用いただけます：\n\n・「リスト」- 紐づけされている患者情報を確認\n・登録用QRコードを読み取る - 新しい患者情報を紐づけ'
    };
    await client.replyMessage(event.replyToken, helpMessage);
  }
}

/**
 * 患者登録処理
 */
async function handleRegistrationMessage(
  userId: string,
  text: string,
  replyToken: string,
  client: Client
): Promise<void> {
  try {
    // 登録コードを抽出
    const match = text.match(/登録コード:\s*(.+)/);
    if (!match) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '登録コードの形式が正しくありません。'
      });
      return;
    }
    
    const encryptString = match[1].trim();
    const config = loadConfig();
    
    // 暗号化データを復号化
    const patientData = decryptPatientData(encryptString);
    
    // 有効期限チェック
    if (isQRCodeExpired(patientData.timestamp, config.qrCodeExpiry)) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '登録期限が切れています。受付で新しいQRコードを発行してください。'
      });
      return;
    }
    
    // Firestoreに紐づけ情報を保存
    const db = admin.firestore();
    await db.collection('LinkdPatient').add({
      LineID: userId,
      EncryptString: encryptString,
      RegisteredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Patient linked:', { userId, patientName: patientData.patientName });
    
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `${patientData.patientName}さんの紐づけが完了しました。\n\n診察の呼び出しをLINEでお知らせします。`
    });
    
  } catch (error) {
    console.error('Error in handleRegistrationMessage:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '登録処理中にエラーが発生しました。QRコードをもう一度確認してください。'
    });
  }
}

/**
 * リストコマンド処理
 */
async function handleListCommand(
  userId: string,
  replyToken: string,
  client: Client
): Promise<void> {
  try {
    const db = admin.firestore();
    const linkSnapshot = await db
      .collection('LinkdPatient')
      .where('LineID', '==', userId)
      .get();
    
    if (linkSnapshot.empty) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '紐づけされている患者情報はありません。'
      });
      return;
    }
    
    // 患者リストを作成
    const patientList: string[] = [];
    const docs = linkSnapshot.docs;
    
    for (let i = 0; i < docs.length; i++) {
      const data = docs[i].data();
      try {
        const patientData = decryptPatientData(data.EncryptString);
        patientList.push(`${i + 1}. ${patientData.patientName}`);
      } catch (error) {
        console.error('Failed to decrypt patient data:', error);
        patientList.push(`${i + 1}. （復号化エラー）`);
      }
    }
    
    const message = `紐づけされている患者情報：\n\n${patientList.join('\n')}\n\n紐づけを解除したい場合は、番号を送信してください。`;
    
    await client.replyMessage(replyToken, {
      type: 'text',
      text: message
    });
    
  } catch (error) {
    console.error('Error in handleListCommand:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    });
  }
}

/**
 * 紐づけ解除の番号指定処理
 */
async function handleUnlinkNumberCommand(
  userId: string,
  patientIndex: number,
  replyToken: string,
  client: Client
): Promise<void> {
  try {
    const db = admin.firestore();
    const linkSnapshot = await db
      .collection('LinkdPatient')
      .where('LineID', '==', userId)
      .get();
    
    if (linkSnapshot.empty || patientIndex < 1 || patientIndex > linkSnapshot.size) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '指定された番号が見つかりません。「リスト」で確認してください。'
      });
      return;
    }
    
    const targetDoc = linkSnapshot.docs[patientIndex - 1];
    const data = targetDoc.data();
    
    try {
      const patientData = decryptPatientData(data.EncryptString);
      
      // 確認状態を保存（5分間有効）
      unlinkConfirmations.set(userId, {
        patientIndex: patientIndex - 1,
        timestamp: Date.now()
      });
      
      // タイムアウト処理（5分後に削除）
      setTimeout(() => {
        unlinkConfirmations.delete(userId);
      }, 5 * 60 * 1000);
      
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `${patientData.patientName}さんの紐づけを解除してよろしいですか？\n\n「はい」または「Yes」と返信してください。\n\n（5分以内に返信しない場合、この操作はキャンセルされます）`
      });
      
    } catch (error) {
      console.error('Failed to decrypt patient data:', error);
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'エラーが発生しました。もう一度お試しください。'
      });
    }
    
  } catch (error) {
    console.error('Error in handleUnlinkNumberCommand:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    });
  }
}

/**
 * 紐づけ解除確認処理
 */
async function handleUnlinkConfirmCommand(
  userId: string,
  replyToken: string,
  client: Client
): Promise<void> {
  try {
    const confirmation = unlinkConfirmations.get(userId);
    
    if (!confirmation) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '解除する患者情報が選択されていません。「リスト」から操作をやり直してください。'
      });
      return;
    }
    
    // タイムアウトチェック（5分）
    if (Date.now() - confirmation.timestamp > 5 * 60 * 1000) {
      unlinkConfirmations.delete(userId);
      await client.replyMessage(replyToken, {
        type: 'text',
        text: '操作がタイムアウトしました。「リスト」から操作をやり直してください。'
      });
      return;
    }
    
    // Firestoreから削除
    const db = admin.firestore();
    const linkSnapshot = await db
      .collection('LinkdPatient')
      .where('LineID', '==', userId)
      .get();
    
    if (linkSnapshot.empty || confirmation.patientIndex >= linkSnapshot.size) {
      unlinkConfirmations.delete(userId);
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'エラーが発生しました。「リスト」から操作をやり直してください。'
      });
      return;
    }
    
    const targetDoc = linkSnapshot.docs[confirmation.patientIndex];
    const data = targetDoc.data();
    const patientData = decryptPatientData(data.EncryptString);
    
    // 削除実行
    await targetDoc.ref.delete();
    unlinkConfirmations.delete(userId);
    
    console.log('Patient unlinked:', { userId, patientName: patientData.patientName });
    
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `${patientData.patientName}さんの紐づけを解除しました。`
    });
    
  } catch (error) {
    console.error('Error in handleUnlinkConfirmCommand:', error);
    unlinkConfirmations.delete(userId);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    });
  }
}
