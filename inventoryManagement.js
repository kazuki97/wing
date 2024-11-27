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
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 商品の在庫数量を更新し、変動履歴を記録する関数
export async function updateProductQuantity(productId, quantityChange, reason = '') {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('在庫を更新するにはログインが必要です。');
  }
  try {
    console.log(`updateProductQuantity called with productId: ${productId}, quantityChange: ${quantityChange}, reason: ${reason}`);
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) {
      throw new Error('商品が見つかりません');
    }
    const productData = productDoc.data();
    const newQuantity = (productData.quantity || 0) + quantityChange;

    await updateDoc(productRef, { quantity: newQuantity });
    console.log(`Product quantity updated. New quantity: ${newQuantity}`);

    // 在庫変動履歴を追加
    const inventoryChange = {
      productId: productId,
      changeAmount: quantityChange,
      newQuantity: newQuantity,
      timestamp: serverTimestamp(), // サーバータイムスタンプを使用
      userId: user.uid,
      userName: user.displayName || user.email,
      reason: reason,
    };
    await addDoc(collection(db, 'inventoryChanges'), inventoryChange);
    console.log('Inventory change recorded:', inventoryChange);
  } catch (error) {
    console.error('在庫数量の更新に失敗しました:', error);
    throw error;
  }
}

// 全体在庫の更新（サブカテゴリごと）
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

    // 在庫変動履歴を記録
    const inventoryChange = {
      subcategoryId: subcategoryId,
      timestamp: serverTimestamp(),
      changeAmount: quantityChange,
      newQuantity: newQuantity,
      userId: user.uid,
      userName: user.displayName || user.email,
      reason: reason,
    };
    await addDoc(collection(db, 'overallInventoryChanges'), inventoryChange);

    console.log('全体在庫が更新され、在庫変動履歴が記録されました');

  } catch (error) {
    console.error('全体在庫の更新エラー:', error);
    alert('全体在庫の更新に失敗しました。');
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
      const data = doc.data();
      // `timestamp` を Date オブジェクトに変換
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      changes.push({ id: doc.id, ...data });
    });
    return changes;
  } catch (error) {
    console.error('在庫変動履歴の取得に失敗しました:', error);
    alert('在庫変動履歴の取得に失敗しました。');
    throw error;
  }
}

// 全体在庫変動履歴の取得
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
      const data = doc.data();
      // `timestamp` を Date オブジェクトに変換
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      changes.push({ id: doc.id, ...data });
    });
    return changes;
  } catch (error) {
    console.error('全体在庫変動履歴の取得に失敗しました:', error);
    alert('全体在庫変動履歴の取得に失敗しました。');
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
    alert('全体在庫の取得に失敗しました。');
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
    alert('全体在庫一覧の取得に失敗しました。');
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
    console.log('全体在庫が削除されました');
  } catch (error) {
    console.error('全体在庫の削除エラー:', error);
    alert('全体在庫の削除に失敗しました。');
    throw error;
  }
}
