// transactions.js
import { db, auth } from './db.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { getProductById } from './products.js';

// 売上データの追加
export async function addTransaction(transactionData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('取引を追加するにはログインが必要です。');
      return;
    }

    // `timestamp` を Date オブジェクトとして保存
    transactionData.timestamp = new Date();
    const docRef = await addDoc(collection(db, 'transactions'), transactionData);

    // 消耗品の使用量を記録
    await recordConsumableUsage(transactionData.items);

    return docRef.id;
  } catch (error) {
    console.error('取引の追加エラー:', error);
    throw error;
  }
}

// 取引データの取得
export async function getTransactions() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('取引データを取得するにはログインが必要です。');
      return [];
    }

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

// 特定の取引データの取得
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
    const inventoryDocRef = doc(db, 'inventory', product.subcategoryId);
    const inventorySnap = await getDoc(inventoryDocRef);
    if (inventorySnap.exists()) {
      const newQuantity = inventorySnap.data().quantity - product.quantityDifference;
      await updateDoc(inventoryDocRef, { quantity: newQuantity });
    }

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
    const inventoryDocRef = doc(db, 'inventory', product.subcategoryId);
    const inventorySnap = await getDoc(inventoryDocRef);
    if (inventorySnap.exists()) {
      const newQuantity = inventorySnap.data().quantity + product.quantity;
      await updateDoc(inventoryDocRef, { quantity: newQuantity });
    }

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

// 消耗品の使用量を記録する関数
// 消耗品使用量の記録
export async function recordConsumableUsage(transactionData) {
  try {
    for (const item of transactionData.items) {
      if (!item.productId) {
        // 手動追加された商品には productId がないため、処理をスキップ
        continue;
      }
      // 商品情報を取得
      const product = await getProductById(item.productId);
      if (product && product.consumables) {
        for (const consumableId of product.consumables) {
          // 消耗品使用量を記録
          await addDoc(collection(db, 'consumableUsage'), {
            consumableId,
            quantityUsed: item.quantity * product.size,
            timestamp: transactionData.timestamp,
          });
        }
      }
    }
  } catch (error) {
    console.error('消耗品使用量の記録に失敗しました:', error);
    throw error;
  }
}
// 消耗品使用量をデータベースに追加する関数
async function addConsumableUsage(consumableId, quantityUsed) {
  const timestamp = new Date().toISOString();
  try {
    await addDoc(collection(db, 'consumableUsage'), {
      consumableId,
      quantityUsed,
      timestamp,
    });
  } catch (error) {
    console.error('消耗品使用量の追加に失敗しました:', error);
    throw error;
  }
}
