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

    // 数値フィールドを明示的に数値型に変換
    transactionData.totalAmount = Number(transactionData.totalAmount);
    transactionData.netAmount = Number(transactionData.netAmount);
    transactionData.totalCost = Number(transactionData.totalCost);
    transactionData.profit = Number(transactionData.profit);
    transactionData.feeAmount = Number(transactionData.feeAmount);

    // items 内の数値フィールドも数値型に変換
    transactionData.items = transactionData.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      size: Number(item.size),
      subtotal: Number(item.subtotal),
      cost: Number(item.cost),
      profit: Number(item.profit),
    }));

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
async function recordConsumableUsage(transactionItems) {
  try {
    for (const item of transactionItems) {
      if (item.productId) {
        // 商品情報を取得
        const product = await getProductById(item.productId);
        if (product.consumables && product.consumables.length > 0) {
          for (const consumableId of product.consumables) {
            await addConsumableUsage(consumableId, item.quantity * item.size);
          }
        }
      } else {
        // 手動追加の場合、消耗品使用量の記録をスキップ
        console.warn('productId が存在しないため、消耗品使用量の記録をスキップします:', item);
      }
    }
  } catch (error) {
    console.error('消耗品使用量の記録に失敗しました:', error);
    // エラーを再スローせず、処理を続行
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
