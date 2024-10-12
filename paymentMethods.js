// paymentMethods.js
import { db } from './db.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 支払い方法の追加
export async function addPaymentMethod(name, feeRate) {
  try {
    const docRef = await addDoc(collection(db, 'paymentMethods'), {
      name,
      feeRate,
    });
    return docRef.id;
  } catch (error) {
    console.error('支払い方法の追加エラー:', error);
    throw error;
  }
}

// 支払い方法の取得
export async function getPaymentMethods() {
  try {
    const snapshot = await getDocs(collection(db, 'paymentMethods'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('支払い方法の取得エラー:', error);
    throw error;
  }
}

// 支払い方法の更新
export async function updatePaymentMethod(id, name, feeRate) {
  try {
    const docRef = doc(db, 'paymentMethods', id);
    await updateDoc(docRef, { name, feeRate });
  } catch (error) {
    console.error('支払い方法の更新エラー:', error);
    throw error;
  }
}

// 支払い方法の削除
export async function deletePaymentMethod(id) {
  try {
    const docRef = doc(db, 'paymentMethods', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('支払い方法の削除エラー:', error);
    throw error;
  }
}
