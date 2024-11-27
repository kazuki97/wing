// inventoryManagement.js
import { db, auth } from './db.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp, // **追加**
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 全体在庫の更新（サブカテゴリごと）
// reason パラメータを追加
export async function updateOverallInventory(subcategoryId, quantityChange, reason = '在庫数の手動更新') {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'overallInventory', subcategoryId);
    const currentInventory = await getOverallInventory(subcategoryId);
    const oldQuantity = currentInventory.quantity || 0;
    const newQuantity = oldQuantity + quantityChange;

    await setDoc(
      docRef,
      {
        quantity: newQuantity,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // **在庫変動履歴を記録**
    await addDoc(collection(db, 'overallInventoryChanges'), {
      subcategoryId: subcategoryId,
      timestamp: serverTimestamp(),
      changeAmount: quantityChange,
      newQuantity: newQuantity,
      userId: user.uid,
      userName: user.email, // 必要に応じてユーザー名を使用
      reason: reason,
    });

    console.log('全体在庫が更新され、在庫変動履歴が記録されました');

  } catch (error) {
    console.error('全体在庫の更新エラー:', error);
    throw error;
  }
}

// 在庫変動履歴の取得
export async function getInventoryChangesByProductId(productId) {
  try {
    const q = query(
      collection(db, 'inventoryChanges'),
      where('productId', '==', productId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);

    const changes = [];
    snapshot.forEach((doc) => {
      changes.push({ id: doc.id, ...doc.data() });
    });
    return changes;
  } catch (error) {
    console.error('在庫変動履歴の取得に失敗しました:', error);
    throw error;
  }
}


// **全体在庫変動履歴の取得**
export async function getOverallInventoryChangesBySubcategoryId(subcategoryId) {
  try {
    const q = query(
      collection(db, 'overallInventoryChanges'),
      where('subcategoryId', '==', subcategoryId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);

    const changes = [];
    snapshot.forEach((doc) => {
      changes.push({ id: doc.id, ...doc.data() });
    });
    return changes;
  } catch (error) {
    console.error('全体在庫変動履歴の取得に失敗しました:', error);
    throw error;
  }
}

// 全体在庫の取得（サブカテゴリごと）
export async function getOverallInventory(subcategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('データを取得するにはログインが必要です。');
      return { quantity: 0 };
    }

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
    const user = auth.currentUser;
    if (!user) {
      alert('データを取得するにはログインが必要です。');
      return [];
    }

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
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'overallInventory', subcategoryId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('全体在庫の削除エラー:', error);
    throw error;
  }
}
