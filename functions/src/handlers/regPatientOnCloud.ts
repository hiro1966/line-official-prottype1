/**
 * RegPatientOnCloud
 * クライアント側から送信された患者登録情報を受け取り、Patientsテーブルに格納
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';

/**
 * 患者登録データをFirestoreに保存
 */
export async function regPatientOnCloud(req: Request, res: Response) {
  try {
    // リクエストボディから患者情報を取得
    const { encryptString } = req.body;
    
    // バリデーション
    if (!encryptString || typeof encryptString !== 'string') {
      res.status(400).json({
        success: false,
        error: 'encryptString is required'
      });
      return;
    }
    
    // Firestoreに保存
    const db = admin.firestore();
    const docRef = await db.collection('Patients').add({
      EncryptString: encryptString,
      RegisteredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Patient registered:', docRef.id);
    
    res.status(200).json({
      success: true,
      patientId: docRef.id,
      message: '患者情報が正常に登録されました'
    });
    
  } catch (error) {
    console.error('Error in regPatientOnCloud:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + errorMessage
    });
  }
}
