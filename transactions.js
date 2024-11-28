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
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { getProductById, getProductByBarcode } from './products.js';
import { updateProductQuantity, updateOverallInventory } from './inventoryManagement.js';
import { showError } from './eventListeners.js'; // エラーメッセージ表示関数

// 売上処理関数の追加
export async function processSale(barcode, quantitySold) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('売上を記録するにはログインが必要です。');
      return;
    }

    // バーコードから商品情報を取得
    const product = await getProductByBarcode(barcode);
    if (!product) {
      showError('該当する商品が見つかりません。');
      return;
    }

    console.log('取得した商品情報:', product);

    const productId = product.id;
    const currentQuantity = Number(product.quantity) || 0; // 明示的に数値型へ変換
    const productSize = product.size || 1; // サイズ取得
    quantitySold = Number(quantitySold); // 販売数量も数値型へ変換

    // 在庫判定（サイズを考慮しない）
    console.log(`DEBUG: currentQuantity: ${currentQuantity}, quantitySold: ${quantitySold}`);
    if (currentQuantity < quantitySold) {
      console.log(`在庫不足エラー: 在庫数: ${currentQuantity}, 必要数: ${quantitySold}`);
      showError(`在庫が不足しています。在庫数: ${currentQuantity}, 必要数: ${quantitySold}`);
      return;
    }
    console.log('在庫は十分です。販売処理を進めます。');

    // 在庫更新（履歴も自動的に記録される）
    console.log('Calling updateProductQuantity...');
    await updateProductQuantity(productId, -quantitySold, `売上による在庫減少: ${quantitySold}個`);
    console.log('updateProductQuantity called successfully.');

    // 全体在庫の更新（サイズを考慮）
    const subcategoryId = product.subcategoryId;
    if (subcategoryId) {
      const overallQuantityChange = -quantitySold * productSize; // サイズを考慮
      await updateOverallInventory(subcategoryId, overallQuantityChange, `売上による全体在庫減少: ${overallQuantityChange}個`);
      console.log('updateOverallInventory called successfully.');
    }

    // 売上トランザクションの追加
    const subtotal = product.price * quantitySold * productSize;
    const totalCost = product.cost * quantitySold * productSize;
    const profit = (product.price - product.cost) * quantitySold * productSize;

    const transactionData = {
      items: [{
        productId: productId,
        productName: product.name,
        quantity: quantitySold,
        unitPrice: product.price,
        size: productSize,
        subtotal: subtotal,
        cost: product.cost,
        profit: profit,
      }],
      totalAmount: subtotal,
      totalCost: totalCost,
      profit: profit,
      timestamp: serverTimestamp(),
      userId: user.uid,
      userName: user.displayName || user.email,
      manuallyAdded: false,
    };

    // 取引データの追加
    const transactionId = await addTransaction(transactionData);
    console.log(`Transaction added with ID: ${transactionId}`);

    alert('売上が正常に記録されました。');
    return transactionId;

  } catch (error) {
    console.error('売上処理に失敗しました:', error);
    showError('売上の記録に失敗しました。');
  }
}


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
    transactionData.totalCost = Number(transactionData.totalCost);
    transactionData.profit = Number(transactionData.profit);

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

    // `timestamp` を Firestore のサーバータイムスタンプとして保存
    transactionData.timestamp = serverTimestamp();
    const docRef = await addDoc(collection(db, 'transactions'), transactionData);
    console.log(`Transaction document added with ID: ${docRef.id}`);

    // 消耗品の使用量を記録
    await recordConsumableUsage(transactionData.items);
    console.log('Consumable usage recorded successfully.');

    return docRef.id;
  } catch (error) {
    console.error('取引の追加エラー:', error);
    alert('取引の追加に失敗しました。');
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
    alert('取引の取得に失敗しました。');
    throw error;
  }
}

export async function getTransactionById(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();

      // データ検証と補正
      if (data.items && Array.isArray(data.items)) {
        data.items = data.items.map(item => ({
          ...item,
          cost: parseFloat(item.cost) || 0,
          quantity: parseFloat(item.quantity) || 0,
          size: parseFloat(item.size) || 1,
        }));
      }

      // `timestamp`のフォーマット
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      return { id: docSnap.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    console.error('取引の取得エラー:', error);
    alert('取引の取得に失敗しました。');
    throw error;
  }
}

// 取引データの更新（返品処理で使用）
export async function updateTransaction(transactionId, updatedData) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    await updateDoc(docRef, updatedData);

    // 在庫と全体在庫を更新（商品が返品された場合など）
    if (updatedData.isReturned && updatedData.items) {
      for (const item of updatedData.items) {
        // 在庫を増加
        await updateProductQuantity(item.productId, item.quantity, `返品による在庫増加: ${item.quantity}個`);
        console.log(`updateProductQuantity called for productId: ${item.productId}`);

        // 全体在庫も増加（サイズを考慮）
        const product = await getProductById(item.productId);
        const productSize = product.size || 1;
        const overallQuantityChange = item.quantity * productSize;
        await updateOverallInventory(product.subcategoryId, overallQuantityChange, `返品による全体在庫増加: ${overallQuantityChange}個`);
        console.log(`updateOverallInventory called for subcategoryId: ${product.subcategoryId}`);
      }
    }
  } catch (error) {
    console.error('取引の更新エラー:', error);
    alert('取引の更新に失敗しました。');
    throw error;
  }
}

// 取引データの削除
export async function deleteTransaction(transactionId) {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const transaction = await getTransactionById(transactionId);
    if (transaction && transaction.items) {
      for (const item of transaction.items) {
        // 在庫を増加
        await updateProductQuantity(item.productId, item.quantity, `取引削除による在庫増加: ${item.quantity}個`);
        console.log(`updateProductQuantity called for productId: ${item.productId}`);

        // 全体在庫も増加（サイズを考慮）
        const product = await getProductById(item.productId);
        const productSize = product.size || 1;
        const overallQuantityChange = item.quantity * productSize;
        await updateOverallInventory(product.subcategoryId, overallQuantityChange, `取引削除による全体在庫増加: ${overallQuantityChange}個`);
        console.log(`updateOverallInventory called for subcategoryId: ${product.subcategoryId}`);
      }
    }
    await deleteDoc(docRef);
    console.log('取引が削除されました');
  } catch (error) {
    console.error('取引の削除エラー:', error);
    alert('取引の削除に失敗しました。');
    throw error;
  }
}

// 消耗品の使用量を記録する関数
export async function recordConsumableUsage(transactionItems) {
  try {
    for (const item of transactionItems) {
      if (item.productId) {
        // 商品情報を取得
        const product = await getProductById(item.productId);
        if (product.consumables && product.consumables.length > 0) {
          for (const consumableId of product.consumables) {
            await addConsumableUsage(consumableId, item.quantity * item.size);
            console.log(`Consumable usage recorded for consumableId: ${consumableId}`);
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
  const timestamp = serverTimestamp();
  try {
    await addDoc(collection(db, 'consumableUsage'), {
      consumableId,
      quantityUsed,
      timestamp: timestamp,
    });
    console.log(`ConsumableUsage document added for consumableId: ${consumableId}`);
  } catch (error) {
    console.error('消耗品使用量の追加に失敗しました:', error);
    throw error;
  }
}
