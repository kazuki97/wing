// paymentMethods.js
import { db } from './db.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc, // getDocをインポート
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

export async function getPaymentMethodById(paymentMethodId) {
  try {
    const paymentMethodRef = doc(collection(db, 'paymentMethods'), paymentMethodId);
    const paymentMethodDoc = await getDoc(paymentMethodRef);
    if (paymentMethodDoc.exists()) {
      return { id: paymentMethodDoc.id, ...paymentMethodDoc.data() };
    } else {
      console.warn(`支払い方法ID ${paymentMethodId} が見つかりませんでした`);
      return null;
    }
  } catch (error) {
    console.error('支払い方法の取得に失敗しました:', error);
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
