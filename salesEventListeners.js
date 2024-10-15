// salesEventListeners.js

// インポート
import {
  getProductByBarcode,
  updateProduct,
  getProductById,
} from './products.js';

import {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from './transactions.js';

import {
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
} from './paymentMethods.js';

import { getUnitPrice } from './pricing.js';
import { updateOverallInventory } from './inventoryManagement.js';

// エラーメッセージ表示関数
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// バーコードスキャンセクションのイベントリスナーと関数
let salesCart = [];

// 支払い方法選択セレクトボックスの更新
async function updatePaymentMethodSelect() {
  try {
    const paymentMethods = await getPaymentMethods();
    const select = document.getElementById('paymentMethodSelect');
    select.innerHTML = '<option value="">支払い方法を選択</option>';
    paymentMethods.forEach((method) => {
      const option = document.createElement('option');
      option.value = method.id;
      option.textContent = method.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    showError('支払い方法の取得に失敗しました');
  }
}

document.getElementById('addBarcodeButton').addEventListener('click', async () => {
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
});

// Enterキーでバーコードを追加
document.getElementById('barcodeInput').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addBarcodeButton').click();
  }
});

// カートに商品を追加する関数
function addToCart(product) {
  const existingItem = salesCart.find((item) => item.product.id === product.id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    salesCart.push({ product, quantity: 1 });
  }
  displaySalesCart();
}

// カートの表示
async function displaySalesCart() {
  const salesCartTable = document.getElementById('salesCart').querySelector('tbody');
  salesCartTable.innerHTML = '';
  let totalAmount = 0;

  // サブカテゴリごとの合計数量を計算
  const subcategoryQuantities = {};
  salesCart.forEach((item) => {
    const subcategoryId = item.product.subcategoryId;
    if (!subcategoryQuantities[subcategoryId]) {
      subcategoryQuantities[subcategoryId] = 0;
    }
    subcategoryQuantities[subcategoryId] += item.product.size * item.quantity;
  });

  for (const item of salesCart) {
    const { product, quantity } = item;
    const subcategoryId = product.subcategoryId;
    const totalQuantity = subcategoryQuantities[subcategoryId];

    // 単価を取得
    const unitPrice = await getUnitPrice(subcategoryId, totalQuantity);
    const subtotal = unitPrice * product.size * quantity;
    totalAmount += subtotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td><input type="number" value="${quantity}" min="1" data-product-id="${product.id}" class="cart-quantity" /></td>
      <td>${unitPrice}</td>
      <td>${subtotal}</td>
      <td><button class="remove-from-cart" data-product-id="${product.id}">削除</button></td>
    `;
    salesCartTable.appendChild(row);
  }

  document.getElementById('totalAmount').textContent = `合計金額: ¥${totalAmount}`;

  // 数量変更のイベントリスナー
  document.querySelectorAll('.cart-quantity').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const productId = e.target.dataset.productId;
      const newQuantity = parseInt(e.target.value, 10);
      if (newQuantity <= 0) {
        removeFromCart(productId);
      } else {
        updateCartQuantity(productId, newQuantity);
      }
    });
  });

  // 削除ボタンのイベントリスナー
  document.querySelectorAll('.remove-from-cart').forEach((button) => {
    button.addEventListener('click', (e) => {
      const productId = e.target.dataset.productId;
      removeFromCart(productId);
    });
  });
}

// カート内の商品の数量を更新
function updateCartQuantity(productId, newQuantity) {
  const item = salesCart.find((item) => item.product.id === productId);
  if (item) {
    item.quantity = newQuantity;
    displaySalesCart();
  }
}

// カートから商品を削除
function removeFromCart(productId) {
  salesCart = salesCart.filter((item) => item.product.id !== productId);
  displaySalesCart();
}

// 販売完了ボタンのイベントリスナー
document.getElementById('completeSaleButton').addEventListener('click', async () => {
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
});

// 初期化処理
window.addEventListener('DOMContentLoaded', async () => {
  await updatePaymentMethodSelect();
  await displayTransactions(); // 売上管理セクションの初期表示
  await displayPaymentMethods(); // 支払い方法の初期表示
});
