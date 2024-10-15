// salesEventListeners.js の重複部分を削除

// インポート
import {
  getProductByBarcode,
  updateProduct,
} from './products.js';

import {
  addTransaction,
} from './transactions.js';

import { getUnitPrice } from './pricing.js';
import { updateOverallInventory } from './inventoryManagement.js';

// バーコードスキャンセクションのイベントリスナーと関数
let salesCart = [];

// バーコードの追加
async function addBarcodeToCart() {
  const barcodeInput = document.getElementById('barcodeInput');
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    showError('バーコードを入力してください');
    return;
  }
  try {
    const product = await getProductByBarcode(barcode);
    if (!product) {
      showError('該当する商品が見つかりません');
      return;
    }
    addToCart(product);
    barcodeInput.value = '';
  } catch (error) {
    console.error(error);
    showError('商品の取得に失敗しました');
  }
}

// Enterキーでバーコードを追加
function setupBarcodeInputListener() {
  document.getElementById('barcodeInput').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addBarcodeToCart();
    }
  });
}

// 販売完了ボタンのイベントリスナー
async function completeSale() {
  if (salesCart.length === 0) {
    showError('カートに商品がありません');
    return;
  }
  const paymentMethodId = document.getElementById('paymentMethodSelect').value;
  if (!paymentMethodId) {
    showError('支払い方法を選択してください');
    return;
  }
  try {
    // 支払い方法情報の取得
    const paymentMethods = await getPaymentMethods();
    const paymentMethod = paymentMethods.find((method) => method.id === paymentMethodId);
    if (!paymentMethod) {
      showError('無効な支払い方法です');
      return;
    }
    const feeRate = paymentMethod.feeRate;

    // 在庫のチェックと更新
    for (const item of salesCart) {
      const product = item.product;
      const quantity = item.quantity;
      const requiredQuantity = product.size * quantity;

      // 商品の在庫チェック
      if (product.quantity < requiredQuantity) {
        showError(`商品「${product.name}」の在庫が不足しています`);
        return;
      }
    }

    // 手数料の計算
    const totalAmount = Math.round(
      parseFloat(document.getElementById('totalAmount').textContent.replace('合計金額: ¥', ''))
    );
    const feeAmount = Math.round((totalAmount * feeRate) / 100);
    const netAmount = totalAmount - feeAmount;

    // 原価と利益の計算
    let totalCost = 0;

    // 販売データの作成
    const transactionData = {
      timestamp: new Date(),
      totalAmount: totalAmount,
      feeAmount: feeAmount,
      netAmount: netAmount,
      paymentMethodId: paymentMethodId,
      paymentMethodName: paymentMethod.name,
      items: [],
      manuallyAdded: false,
      cost: 0,
      profit: 0,
    };

    for (const item of salesCart) {
      const product = item.product;
      const quantity = item.quantity;
      const requiredQuantity = product.size * quantity;
      const cost = product.cost * requiredQuantity;
      const unitPrice = await getUnitPrice(product.subcategoryId, requiredQuantity);
      const subtotal = unitPrice * requiredQuantity;

      totalCost += cost;

      transactionData.items.push({
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: unitPrice,
        size: product.size,
        subtotal: subtotal,
        cost: cost,
        profit: subtotal - cost,
      });

      // 在庫の更新
      await updateProduct(product.id, { quantity: product.quantity - requiredQuantity });
      // 全体在庫の更新
      await updateOverallInventory(product.id, -requiredQuantity);
    }

    transactionData.cost = totalCost;
    transactionData.profit = netAmount - totalCost;

    // 取引の保存
    await addTransaction(transactionData);

    // カートをクリア
    salesCart = [];
    displaySalesCart();
    alert('販売が完了しました');
    // 売上管理セクションを更新
    await displayTransactions();
  } catch (error) {
    console.error(error);
    showError('販売処理に失敗しました');
  }
}

// 初期化処理
window.addEventListener('DOMContentLoaded', async () => {
  setupBarcodeInputListener();
  await updatePaymentMethodSelect();
  await displayTransactions();
  await displayPaymentMethods();
});
