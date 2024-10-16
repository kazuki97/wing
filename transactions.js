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
    transactionData.timestamp = new Date();

    // サブカテゴリIDが失われないように確認する例
    const transformedData = {
      ...transactionData,
      items: transactionData.items.map((item) => ({
        ...item,
        subcategoryId: item.subcategoryId, // サブカテゴリIDを明示的にコピー
      }))
    };
    console.log("変換後のサブカテゴリID:", transformedData.items[0].subcategoryId); // デバッグログ

    // 変換後のデータで取引を追加
    const docRef = await addDoc(collection(db, 'transactions'), transformedData);
    
    // 取引追加後に全体在庫を更新
    await updateOverallInventory(transformedData.items[0].subcategoryId, -transformedData.items[0].quantity);

    return docRef.id;
  } catch (error) {
    console.error('取引の追加エラー:', error);
    throw error;
  }
}

export async function getTransactions() {
  try {
    const snapshot = await getDocs(collection(db, 'transactions'));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // `timestamp` フィールドを Date オブジェクトに変換
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      return { id: doc.id, ...data };
    });
  } catch (error) {
    console.error('取引の取得エラー:', error);
    throw error;
  }
}

export async function getTransactionById(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // `timestamp` フィールドを Date オブジェクトに変換
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      return { id: docSnap.id, ...data };
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
    // 更新後、在庫と全体在庫も反映
    if (updatedData.hasOwnProperty('products')) {
      for (const product of updatedData.products) {
        await updateInventoryAfterTransactionUpdate(product);
      }
    }
  } catch (error) {
    console.error('取引の更新エラー:', error);
    throw error;
  }
}

// 在庫と全体在庫の更新処理
async function updateInventoryAfterTransactionUpdate(product) {
  try {
    // 在庫情報の更新
    const inventoryDocRef = doc(db, 'inventory', product.subcategoryId);
    const inventorySnap = await getDoc(inventoryDocRef);
    if (inventorySnap.exists()) {
      const newQuantity = inventorySnap.data().quantity - product.quantityDifference;
      await updateDoc(inventoryDocRef, { quantity: newQuantity });
    }

    // 全体在庫の更新
    const overallInventoryDocRef = doc(db, 'overallInventory', product.subcategoryId);
    const overallInventorySnap = await getDoc(overallInventoryDocRef);
    if (overallInventorySnap.exists()) {
      const newOverallQuantity = overallInventorySnap.data().quantity - product.quantityDifference;
      await updateDoc(overallInventoryDocRef, { quantity: newOverallQuantity });
    }
  } catch (error) {
    console.error('在庫または全体在庫の更新エラー:', error);
    throw error;
  }
}

// 取引データの削除
export async function deleteTransaction(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const transaction = await getTransactionById(transactionId);
    if (transaction && transaction.products) {
      for (const product of transaction.products) {
        await updateInventoryAfterTransactionDelete(product);
      }
    }
    await deleteDoc(docRef);
  } catch (error) {
    console.error('取引の削除エラー:', error);
    throw error;
  }
}

// 在庫と全体在庫の削除後の更新処理
async function updateInventoryAfterTransactionDelete(product) {
  try {
    // 在庫情報の更新
    const inventoryDocRef = doc(db, 'inventory', product.subcategoryId);
    const inventorySnap = await getDoc(inventoryDocRef);
    if (inventorySnap.exists()) {
      const newQuantity = inventorySnap.data().quantity + product.quantity;
      await updateDoc(inventoryDocRef, { quantity: newQuantity });
    }

    // 全体在庫の更新
    const overallInventoryDocRef = doc(db, 'overallInventory', product.subcategoryId);
    const overallInventorySnap = await getDoc(overallInventoryDocRef);
    if (overallInventorySnap.exists()) {
      const newOverallQuantity = overallInventorySnap.data().quantity + product.quantity;
      await updateDoc(overallInventoryDocRef, { quantity: newOverallQuantity });
    }
  } catch (error) {
    console.error('在庫または全体在庫の削除後の更新エラー:', error);
    throw error;
  }
}
