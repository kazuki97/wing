import { db } from './db.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 全体在庫の更新（サブカテゴリごと）
export async function updateOverallInventory(subcategoryId, quantityChange) {
  try {
    console.log("更新対象のサブカテゴリID:", subcategoryId);  // デバッグログの追加

    const docRef = doc(db, 'overallInventory', subcategoryId);
    const currentInventory = await getOverallInventory(subcategoryId);
    const newQuantity = (currentInventory.quantity || 0) + quantityChange;

    await setDoc(
      docRef,
      {
        quantity: newQuantity,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // リアルタイム更新のため、全体在庫の最新情報を画面に反映
    const overallInventoryEvent = new CustomEvent('overallInventoryUpdated', {
      detail: { subcategoryId, newQuantity }
    });
    window.dispatchEvent(overallInventoryEvent);
  } catch (error) {
    console.error('全体在庫の更新エラー:', error);
    throw error;
  }
}

// 全体在庫の取得（サブカテゴリごと）
export async function getOverallInventory(subcategoryId) {
  try {
    const docRef = doc(db, 'overallInventory', subcategoryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return { quantity: 0 };
    }
  } catch (error) {
    console.error('全体在庫の取得エラー:', error);
    throw error;
  }
}

// 全体在庫の一覧取得
export async function getAllOverallInventories() {
  try {
    const snapshot = await getDocs(collection(db, 'overallInventory'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('全体在庫一覧の取得エラー:', error);
    throw error;
  }
}

// 全体在庫の削除
export async function deleteOverallInventory(subcategoryId) {
  try {
    const docRef = doc(db, 'overallInventory', subcategoryId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('全体在庫の削除エラー:', error);
    throw error;
  }
}
