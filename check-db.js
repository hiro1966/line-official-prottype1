/**
 * Firestoreデータベース確認ツール
 * 使い方: node check-db.js
 */

const admin = require('firebase-admin');

// サービスアカウントキーが必要な場合はここで初期化
// 本番環境ではCloud Functions内で自動的に認証される
admin.initializeApp();

const db = admin.firestore();

async function checkDatabase() {
  console.log('=== Firestore データベース確認 ===\n');
  
  // TestRegisterdID コレクション
  console.log('【TestRegisterdID コレクション】');
  const testRegSnapshot = await db.collection('TestRegisterdID').get();
  console.log(`件数: ${testRegSnapshot.size}`);
  testRegSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n${index + 1}. Document ID: ${doc.id}`);
    console.log(`   UserID: ${data.UserID}`);
    console.log(`   EncryptString: ${data.EncryptString?.substring(0, 50)}...`);
    console.log(`   RegisteredAt: ${data.RegisteredAt?.toDate()}`);
  });
  
  console.log('\n\n【Patients コレクション】');
  const patientsSnapshot = await db.collection('Patients').get();
  console.log(`件数: ${patientsSnapshot.size}`);
  patientsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n${index + 1}. Document ID: ${doc.id}`);
    console.log(`   EncryptString: ${data.EncryptString?.substring(0, 50)}...`);
    console.log(`   RegisteredAt: ${data.RegisteredAt?.toDate()}`);
  });
  
  console.log('\n\n【LinkdPatient コレクション】');
  const linkSnapshot = await db.collection('LinkdPatient').get();
  console.log(`件数: ${linkSnapshot.size}`);
  if (linkSnapshot.empty) {
    console.log('   ⚠️ 紐づけデータがありません（LINEメッセージが処理されていない可能性）');
  } else {
    linkSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. Document ID: ${doc.id}`);
      console.log(`   LineID: ${data.LineID}`);
      console.log(`   EncryptString: ${data.EncryptString?.substring(0, 50)}...`);
      console.log(`   RegisteredAt: ${data.RegisteredAt?.toDate()}`);
    });
  }
  
  console.log('\n\n=== 確認完了 ===');
}

checkDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('エラー:', error);
    process.exit(1);
  });
