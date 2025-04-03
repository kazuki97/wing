// salesEventListeners.js
import { auth } from './db.js'; // authをインポート
import { updatePaymentMethodSelect } from './eventListeners.js'; // インポート追加
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js'; // 修正ポイント

import {
  getProductByBarcode,
  updateProduct,
  getProductById,
} from './products.js';

import {
  addTransaction,
  getTransactions,
} from './transactions.js';

import {
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
} from './paymentMethods.js';

import { displayTransactions, displayOverallInventory, displayInventoryProducts } from './eventListeners.js'; 

import { getUnitPrice } from './pricing.js';
import { updateOverallInventory } from './inventoryManagement.js';

// エラーメッセージ表示関数
export function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

export function showMessage(message) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';

  // 一定時間後に自動的にメッセージを消す
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// バーコードスキャンセクションのイベントリスナーと関数
let salesCart = [];

// 修正後のコード（salesEventListeners.js 内の該当箇所）
document.addEventListener('DOMContentLoaded', () => {
  const addBarcodeButton = document.getElementById('addBarcodeButton');
  if (!addBarcodeButton) {
    console.error("addBarcodeButton が見つかりません");
    return;
  }

  addBarcodeButton.addEventListener('click', async () => {
    // バーコード追加時の処理
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
      console.log("取得した商品情報:", product);
      addToCart(product);
      barcodeInput.value = '';
      // 在庫管理セクションの表示を更新
      await displayInventoryProducts();
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    }
  });

  // Enterキーでバーコードを追加する設定
  const barcodeInput = document.getElementById('barcodeInput');
  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBarcodeButton.click();
      }
    });
  }
});


export function addToCart(product, isScanned = false) {
  console.log("カートに追加する商品:", product);
  const existingItem = salesCart.find((item) => item.product.id === product.id);
  if (existingItem) {
    // 商品が既にカートに存在する場合、何もしない
    console.log("商品は既にカートに存在します。");
  } else {
    salesCart.push({ product, quantity: 1 });
    displaySalesCart(); // 新規に商品を追加した場合のみ表示を更新
  }
}


// QuaggaJS の初期化とコールバックの設定を追加
function initializeQuagga() {
  if (!window.Quagga) {
    console.error("QuaggaJSがロードされていません");
    showError('バーコードスキャナーの初期化に失敗しました。QuaggaJSがロードされていません。');
    return;
  }

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#barcode-scanner'), // ビデオフィードを表示する要素
      constraints: {
        facingMode: "environment" // 背面カメラを使用
      },
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"],
    },
    locate: true, // バーコードの位置を特定
  }, function(err) {
    if (err) {
      console.error(err);
      showError('バーコードスキャナーの初期化に失敗しました。');
      return;
    }
    console.log("QuaggaJS の初期化が完了しました。");
    Quagga.start();
  });

  Quagga.onDetected(async function(result) {
  const user = auth.currentUser;
  if (!user) {
    alert('バーコードをスキャンするにはログインが必要です。');
    return;
  }
    const barcode = result.codeResult.code;
    console.log(`スキャンされたバーコード: ${barcode}`);

    try {
      const product = await getProductByBarcode(barcode);
      if (!product) {
        showError('該当する商品が見つかりません');
        return;
      }
      addToCart(product);

      // 在庫管理セクションの表示を更新
      await displayInventoryProducts(); // 在庫管理セクションを再描画
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    }
  });
}

// カートの表示
async function displaySalesCart() {
  const user = auth.currentUser;
  if (!user) {
    alert('カートを表示するにはログインが必要です。');
    return;
  }
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
    const unitPrice = await getUnitPrice(subcategoryId, totalQuantity, product.price);
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

document.getElementById('completeSaleButton').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    alert('販売を完了するにはログインが必要です。');
    return;
  }
  if (salesCart.length === 0) {
    showError('カートに商品がありません');
    return;
  }
  console.log("販売完了時のカート情報:", salesCart);
  const paymentMethodId = document.getElementById('paymentMethodSelect').value;
  if (!paymentMethodId) {
    showError('支払い方法を選択してください');
    return;
  }

// 新たに販売方法の選択チェック
  const salesMethodSelect = document.getElementById('salesMethodSelect');
  const salesMethodValue = salesMethodSelect.value;
  if (!salesMethodValue) {
    showError('販売方法を選択してください');
    return;
  }

 // 発送方法は「店舗」以外の場合のみ必須
  let shippingMethodValue = '';
  let shippingFee = 0;
  if (salesMethodValue !== '店舗') {
  const shippingMethodSelect = document.getElementById('shippingMethodSelect');
  shippingMethodValue = shippingMethodSelect.value;
  if (!shippingMethodValue) {
    showError('発送方法を選択してください');
    return;
  }
  if (shippingMethodValue === 'クリックポスト') {
    shippingFee = 185;
  } else if (shippingMethodValue === 'ゆうパケットポスト') {
    shippingFee = 200;
  } else if (shippingMethodValue === 'ヤマト運輸') {
    const shippingFeeInput = document.getElementById('shippingFeeInput');
    shippingFee = parseFloat(shippingFeeInput.value);
    if (isNaN(shippingFee) || shippingFee < 0) {
      showError('有効な送料を入力してください');
      return;
    }
  }
} else {
  // 店舗購入の場合は発送情報は不要
  shippingMethodValue = '';
  shippingFee = 0;
}

  // 商品のサブカテゴリIDをログ出力
  salesCart.forEach(item => {
    console.log("販売完了 - 商品ID:", item.product.id, "サブカテゴリID:", item.product.subcategoryId);
  });

  try {
    const paymentMethods = await getPaymentMethods();
    const paymentMethod = paymentMethods.find((method) => method.id === paymentMethodId);
    if (!paymentMethod) {
      showError('無効な支払い方法です');
      return;
    }
    const feeRate = paymentMethod.feeRate;

    // 在庫チェック
    for (const item of salesCart) {
      const product = item.product;
      const quantity = item.quantity;
      if (product.quantity < quantity) {
        showError(`商品「${product.name}」の在庫が不足しています`);
        return;
      }
    }

    const totalAmount = Math.round(
      parseFloat(document.getElementById('totalAmount').textContent.replace('合計金額: ¥', ''))
    );

    // 割引処理
    const discountAmountElement = document.getElementById('discountAmount');
    const discountReasonElement = document.getElementById('discountReason');
    let discountValue = parseFloat(discountAmountElement.value);
    if (isNaN(discountValue)) discountValue = 0;
    const discountReason = discountReasonElement.value;
    let discountedTotal = totalAmount - discountValue;
    if (discountedTotal < 0) {
      discountedTotal = 0;
    }

    // ▼▼▼ 日付入力フィールドから販売日を取得 ▼▼▼
    const saleDateInput = document.getElementById('saleDate');
    let saleTimestamp;
    if (saleDateInput && saleDateInput.value) {
      // 入力された日付 (yyyy-mm-dd) の午前0時を timestamp とする
      saleTimestamp = new Date(saleDateInput.value + "T00:00");
    } else {
      saleTimestamp = new Date();
    }
    // ▲▲▲ 日付取得ここまで ▲▲▲

    // 割引処理や販売日取得後
// 先に totalCost を初期化
let totalCost = 0;
const transactionItems = [];
for (const item of salesCart) {
  const product = item.product;
  const quantity = item.quantity;
  const requiredQuantity = product.size * quantity;
  const cost = product.cost * requiredQuantity;
  const unitPrice = await getUnitPrice(product.subcategoryId, requiredQuantity, product.price);
  const subtotal = unitPrice * requiredQuantity;
  totalCost += cost;
  console.log("商品ID:", product.id, "サブカテゴリID:", product.subcategoryId);
  transactionItems.push({
    productId: product.id,
    productName: product.name,
    quantity: quantity,
    unitPrice: unitPrice,
    size: product.size,
    subtotal: subtotal,
    cost: cost,
    profit: subtotal - cost,
    subcategoryId: product.subcategoryId,
  });
  console.log("在庫更新 - 商品ID:", product.id, "更新するデータ:", { quantity: product.quantity - quantity });
  await updateProduct(product.id, { quantity: product.quantity - quantity });
  console.log("全体在庫の更新 - サブカテゴリID:", product.subcategoryId, "更新する数量:", -requiredQuantity);
  await updateOverallInventory(product.subcategoryId, -requiredQuantity);
}

// その後で計算
const feeAmount = Math.round((discountedTotal * feeRate) / 100);
const netAmount = discountedTotal - feeAmount;
const profitCalculated = netAmount - totalCost - shippingFee;


     const transactionData = {
    timestamp: saleTimestamp,
    totalAmount: discountedTotal,
    feeAmount: feeAmount,
    netAmount: netAmount,
    paymentMethodId: paymentMethodId,
    paymentMethodName: paymentMethod.name,
    salesMethod: salesMethodValue,
    shippingMethod: shippingMethodValue,    // 発送方法を記録
    shippingFee: shippingFee,                 // 送料を記録
    items: transactionItems,
    manuallyAdded: false,
    cost: totalCost,
    profit: profitCalculated,
    discount: {
      amount: discountValue,
      reason: discountReason,
    },
  };

    await addTransaction(transactionData);
    salesCart = [];
    displaySalesCart();

// 販売完了後、各入力欄をリセットする
  document.getElementById('discountAmount').value = 0;
  document.getElementById('discountReason').value = "";
  document.getElementById('salesMethodSelect').value = "";
  document.getElementById('shippingMethodSelect').value = "";
  document.getElementById('shippingFeeInput').value = 0;
  document.getElementById('shippingFeeInputContainer').style.display = 'none';


    alert('販売が完了しました');
    await displayTransactions();
    await displayOverallInventory();
    await displayInventoryProducts();
  } catch (error) {
    console.error(error);
    showError('販売処理に失敗しました');
  }
});

// 支払い方法設定セクションのイベントリスナーと関数

// 支払い方法追加フォームのイベントリスナー
document.getElementById('addPaymentMethodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    alert('支払い方法を追加するにはログインが必要です。');
    return;
  }
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
    const user = auth.currentUser;
    if (!user) {
      alert('支払い方法を表示するにはログインが必要です。');
      return;
    }
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

document.getElementById('filterTransactionsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    alert('取引をフィルタリングするにはログインが必要です。');
    return;
  }
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

  // ここでグローバル変数 currentFilter に条件を保存
  currentFilter = filter;
  await displayTransactions(currentFilter);
});


// 初期化処理
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await updatePaymentMethodSelect(); // 支払い方法セレクトボックスを更新
    
    // 現在の年・月を取得し、フィルタとして渡す
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    await displayTransactions({ year: currentYear, month: currentMonth });
    
    await displayPaymentMethods(); // 支払い方法の初期表示
    await displayOverallInventory(); // 全体在庫の初期表示
    await displayInventoryProducts(); // 在庫管理セクションの初期表示
  } else {
    console.log('ユーザーがログインしていません');
    // 必要に応じてログインフォームを表示する処理を追加
  }
});
