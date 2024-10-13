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

// 売上管理セクションの表示
async function displayTransactions(filter = {}) {
  try {
    let transactions = await getTransactions();

    // フィルタの適用
    if (filter.onlyReturned) {
      transactions = transactions.filter((t) => t.isReturned);
    }
    if (filter.month || filter.year) {
      transactions = transactions.filter((t) => {
        const date = t.timestamp.toDate();
        const monthMatch = filter.month ? date.getMonth() + 1 === filter.month : true;
        const yearMatch = filter.year ? date.getFullYear() === filter.year : true;
        return monthMatch && yearMatch;
      });
    }

    const transactionList = document.getElementById('transactionList').querySelector('tbody');
    transactionList.innerHTML = '';
    for (const transaction of transactions) {
      const row = document.createElement('tr');
      // 返品済みの場合は赤文字にする
      if (transaction.isReturned) {
        row.style.color = 'red';
      }
      // 商品名の一覧をカンマ区切りで取得
      const productNames = transaction.items.map((item) => item.productName).join(', ');
      // 総数量を計算
      const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${transaction.timestamp.toDate().toLocaleString()}</td>
        <td>${transaction.paymentMethodName}</td>
        <td>${productNames || '手動追加'}</td>
        <td>${totalQuantity || '-'}</td>
        <td>¥${transaction.totalAmount}</td>
        <td>¥${transaction.cost || 0}</td>
        <td>¥${transaction.profit || 0}</td>
        <td><button class="view-transaction-details" data-id="${transaction.id}">詳細</button></td>
      `;
      transactionList.appendChild(row);
    }

    // 詳細ボタンのイベントリスナー
    document.querySelectorAll('.view-transaction-details').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const transactionId = e.target.dataset.id;
        await displayTransactionDetails(transactionId);
      });
    });
  } catch (error) {
    console.error(error);
    showError('取引の表示に失敗しました');
  }
}

// 取引詳細の表示
async function displayTransactionDetails(transactionId) {
  try {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      showError('取引が見つかりません');
      return;
    }
    document.getElementById('detailTransactionId').textContent = transaction.id;
    document.getElementById('detailTimestamp').textContent = transaction.timestamp.toDate().toLocaleString();
    document.getElementById('detailPaymentMethod').textContent = transaction.paymentMethodName;
    document.getElementById('detailFeeAmount').textContent = transaction.feeAmount;
    document.getElementById('detailNetAmount').textContent = transaction.netAmount;
    document.getElementById('detailTotalCost').textContent = transaction.cost || 0;
    document.getElementById('detailTotalProfit').textContent = transaction.profit || 0;

    const detailProductList = document.getElementById('detailProductList');
    detailProductList.innerHTML = '';

    if (transaction.items && transaction.items.length > 0) {
      for (const item of transaction.items) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>${item.unitPrice}</td>
          <td>${item.subtotal}</td>
          <td>${item.cost}</td>
          <td>${item.profit}</td>
        `;
        detailProductList.appendChild(row);
      }
    } else {
      // 手動追加のため、商品明細が無い
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6">商品情報はありません</td>';
      detailProductList.appendChild(row);
    }

    // 返品ボタンの表示（手動追加の場合は非表示にする）
    const returnButton = document.getElementById('returnTransactionButton');
    if (transaction.isReturned || transaction.manuallyAdded) {
      returnButton.style.display = 'none';
      if (transaction.isReturned) {
        document.getElementById('returnInfo').textContent = `返品理由: ${transaction.returnReason}`;
      } else {
        document.getElementById('returnInfo').textContent = '';
      }
    } else {
      returnButton.style.display = 'block';
      document.getElementById('returnInfo').textContent = '';
      returnButton.onclick = () => handleReturnTransaction(transaction);
    }

    // 取引削除ボタンの表示
    const deleteButton = document.getElementById('deleteTransactionButton');
    deleteButton.style.display = 'block';
    deleteButton.onclick = () => handleDeleteTransaction(transaction.id);

    document.getElementById('transactionDetails').style.display = 'block';
  } catch (error) {
    console.error(error);
    showError('取引詳細の表示に失敗しました');
  }
}

// 取引の削除
async function handleDeleteTransaction(transactionId) {
  if (confirm('この取引を削除しますか？')) {
    try {
      await deleteTransaction(transactionId);
      alert('取引が削除されました');
      document.getElementById('transactionDetails').style.display = 'none';
      await displayTransactions();
    } catch (error) {
      console.error(error);
      showError('取引の削除に失敗しました');
    }
  }
}

// 返品処理
async function handleReturnTransaction(transaction) {
  const reason = prompt('返品理由を入力してください');
  if (!reason) {
    showError('返品理由を入力してください');
    return;
  }
  try {
    if (transaction.items && transaction.items.length > 0) {
      // 在庫を元に戻す
      for (const item of transaction.items) {
        const productId = item.productId;
        const quantity = item.quantity;
        const size = item.size;
        const requiredQuantity = quantity * size;

        const product = await getProductById(productId);
        const updatedQuantity = product.quantity + requiredQuantity;
        await updateProduct(productId, { quantity: updatedQuantity });
        // 全体在庫の更新
        await updateOverallInventory(productId, requiredQuantity);
      }
    }
    // 取引を返品済みに更新
    await updateTransaction(transaction.id, {
      isReturned: true,
      returnReason: reason,
      returnedAt: new Date(),
    });
    alert('返品が完了しました');
    // 取引詳細を再表示
    await displayTransactionDetails(transaction.id);
    // 売上管理セクションを更新
    await displayTransactions();
  } catch (error) {
    console.error(error);
    showError('返品処理に失敗しました');
  }
}

// 取引詳細の閉じるボタン
document.getElementById('closeTransactionDetails').addEventListener('click', () => {
  document.getElementById('transactionDetails').style.display = 'none';
});

// 支払い方法設定セクションのイベントリスナーと関数

// 支払い方法追加フォームのイベントリスナー
document.getElementById('addPaymentMethodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('paymentMethodName').value.trim();
  const feeRate = parseFloat(document.getElementById('paymentMethodFee').value);
  if (!name || isNaN(feeRate)) {
    showError('支払い方法名と手数料率を正しく入力してください');
    return;
  }
  try {
    await addPaymentMethod(name, feeRate);
    alert('支払い方法が追加されました');
    document.getElementById('addPaymentMethodForm').reset();
    await displayPaymentMethods();
    await updatePaymentMethodSelect(); // 支払い方法セレクトボックスを更新
  } catch (error) {
    console.error(error);
    showError('支払い方法の追加に失敗しました');
  }
});

// 支払い方法の表示
async function displayPaymentMethods() {
  try {
    const paymentMethods = await getPaymentMethods();
    const paymentMethodList = document.getElementById('paymentMethodList').querySelector('tbody');
    paymentMethodList.innerHTML = '';
    for (const method of paymentMethods) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${method.name}</td>
        <td>${method.feeRate}%</td>
        <td>
          <button class="edit-payment-method" data-id="${method.id}">編集</button>
          <button class="delete-payment-method" data-id="${method.id}">削除</button>
        </td>
      `;
      paymentMethodList.appendChild(row);
    }

    // 編集ボタンのイベントリスナー
    document.querySelectorAll('.edit-payment-method').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const methodId = e.target.dataset.id;
        const method = paymentMethods.find((m) => m.id === methodId);
        if (method) {
          const newName = prompt('新しい支払い方法名を入力してください', method.name);
          const newFeeRate = parseFloat(prompt('新しい手数料率(%)を入力してください', method.feeRate));
          if (newName && !isNaN(newFeeRate)) {
            try {
              await updatePaymentMethod(methodId, newName, newFeeRate);
              alert('支払い方法が更新されました');
              await displayPaymentMethods();
              await updatePaymentMethodSelect(); // 支払い方法セレクトボックスを更新
            } catch (error) {
              console.error(error);
              showError('支払い方法の更新に失敗しました');
            }
          }
        }
      });
    });

    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.delete-payment-method').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const methodId = e.target.dataset.id;
        if (confirm('本当に削除しますか？')) {
          try {
            await deletePaymentMethod(methodId);
            alert('支払い方法が削除されました');
            await displayPaymentMethods();
            await updatePaymentMethodSelect(); // 支払い方法セレクトボックスを更新
          } catch (error) {
            console.error(error);
            showError('支払い方法の削除に失敗しました');
          }
        }
      });
    });
  } catch (error) {
    console.error(error);
    showError('支払い方法の表示に失敗しました');
  }
}

// 手動で売上を追加する機能の実装

// 手動で売上を追加するボタンのイベントリスナー
document.getElementById('manualAddTransactionButton').addEventListener('click', async () => {
  // 支払い方法の選択肢を更新
  await updateTransactionPaymentMethodSelect();
  // フォームを表示
  document.getElementById('manualAddTransactionForm').style.display = 'block';
});

// キャンセルボタンのイベントリスナー
document.getElementById('cancelAddTransaction').addEventListener('click', () => {
  document.getElementById('manualAddTransactionForm').style.display = 'none';
});

// 支払い方法選択セレクトボックスの更新（手動売上追加用）
async function updateTransactionPaymentMethodSelect() {
  try {
    const paymentMethods = await getPaymentMethods();
    const select = document.getElementById('transactionPaymentMethod');
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

// 手動で売上を追加するフォームのイベントリスナー
document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const totalAmount = parseFloat(document.getElementById('transactionTotalAmount').value);
  const paymentMethodId = document.getElementById('transactionPaymentMethod').value;
  if (!paymentMethodId || isNaN(totalAmount) || totalAmount <= 0) {
    showError('有効な合計金額と支払い方法を入力してください');
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

    // 手数料の計算
    const feeAmount = Math.round((totalAmount * feeRate) / 100);
    const netAmount = totalAmount - feeAmount;

    // 販売データの作成（手動入力なので items は空）
    const transactionData = {
      timestamp: new Date(),
      totalAmount: totalAmount,
      feeAmount: feeAmount,
      netAmount: netAmount,
      paymentMethodId: paymentMethodId,
      paymentMethodName: paymentMethod.name,
      items: [], // 手動追加の場合、商品明細は無し
      manuallyAdded: true, // 手動追加フラグ
      cost: 0,
      profit: netAmount,
    };

    // 取引の保存
    await addTransaction(transactionData);

    // フォームをクリアして非表示に
    document.getElementById('addTransactionForm').reset();
    document.getElementById('manualAddTransactionForm').style.display = 'none';

    alert('売上が手動で追加されました');
    // 売上管理セクションを更新
    await displayTransactions();
  } catch (error) {
    console.error(error);
    showError('売上の追加に失敗しました');
  }
});

// 月次・年次フィルタの実装
document.getElementById('filterTransactionsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const month = parseInt(document.getElementById('filterMonth').value, 10);
  const year = parseInt(document.getElementById('filterYear').value, 10);
  const onlyReturned = document.getElementById('filterOnlyReturned').checked;

  const filter = {};
  if (!isNaN(month)) {
    filter.month = month;
  }
  if (!isNaN(year)) {
    filter.year = year;
  }
  filter.onlyReturned = onlyReturned;

  await displayTransactions(filter);
});

// 初期化処理
window.addEventListener('DOMContentLoaded', async () => {
  await updatePaymentMethodSelect();
  await displayTransactions(); // 売上管理セクションの初期表示
});
