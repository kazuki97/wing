// transactions.js

import { db } from './db.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc, // 追加
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 売上データの追加
export async function addTransaction(transactionData) {
  try {
    const docRef = await addDoc(collection(db, 'transactions'), transactionData);
    return docRef.id;
  } catch (error) {
    console.error('取引の追加エラー:', error);
    throw error;
  }
}

// 取引データの取得
export async function getTransactions() {
  try {
    const snapshot = await getDocs(collection(db, 'transactions'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('取引の取得エラー:', error);
    throw error;
  }
}

// 取引データのIDでの取得
export async function getTransactionById(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('取引の取得エラー:', error);
    throw error;
  }
}

// 取引データの更新（返品処理で使用）
export async function updateTransaction(transactionId, updatedData) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('取引の更新エラー:', error);
    throw error;
  }
}

// 取引データの削除
export async function deleteTransaction(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('取引の削除エラー:', error);
    throw error;
  }
}
