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
} from './transactions.js';

import {
  addPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
} from './paymentMethods.js';

import { displayTransactions } from './eventListeners.js';

import { getUnitPrice } from './pricing.js';
import { updateOverallInventory, getAllOverallInventories } from './inventoryManagement.js';

// エラーメッセージ表示関数
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// バーコードスキャンセクションのイベントリスナーと関数
let salesCart = [];

// 支払い方法選択セレクトボックスの更新
async function updatePaymentMethodSelect() {
  try {
    const paymentMethods = await getPaymentMethods();
    const select = document.getElementById('paymentMethodSelect');
    if (select) {
      select.innerHTML = '<option value="">支払い方法を選択</option>';
      paymentMethods.forEach((method) => {
        const option = document.createElement('option');
        option.value = method.id;
        option.textContent = method.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error(error);
    showError('支払い方法の取得に失敗しました');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addBarcodeButton = document.getElementById('addBarcodeButton');
  const barcodeInput = document.getElementById('barcodeInput');
  if (addBarcodeButton && barcodeInput) {
    addBarcodeButton.addEventListener('click', async () => {
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
      } catch (error) {
        console.error(error);
        showError('商品の取得に失敗しました');
      }
    });

    barcodeInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBarcodeButton.click();
      }
    });
  }
});

// カートに商品を追加する関数
function addToCart(product) {
  console.log("カートに追加する商品:", product);
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
  const salesCartTable = document.getElementById('salesCart')?.querySelector('tbody');
  if (!salesCartTable) {
    showError('カートの表示エリアが見つかりません');
    return;
  }
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
window.addEventListener('DOMContentLoaded', () => {
  const completeSaleButton = document.getElementById('completeSaleButton');
  if (completeSaleButton) {
    completeSaleButton.addEventListener('click', async () => {
      if (salesCart.length === 0) {
        showError('カートに商品がありません');
        return;
      }
      console.log("販売完了時のカート情報:", salesCart);
      const paymentMethodId = document.getElementById('paymentMethodSelect')?.value;
      if (!paymentMethodId) {
        showError('支払い方法を選択してください');
        return;
      }
      // ここに商品のサブカテゴリIDを確認するログを追加
      salesCart.forEach(item => {
        console.log("販売完了 - 商品ID:", item.product.id, "サブカテゴリID:", item.product.subcategoryId);
      });
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

          // サブカテゴリIDの確認ログを追加
          console.log("商品ID:", product.id, "サブカテゴリID:", product.subcategoryId);

          transactionData.items.push({
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            size: product.size,
            subtotal: subtotal,
            cost: cost,
            profit: subtotal - cost,
            subcategoryId: product.subcategoryId, // サブカテゴリID
          });

          // 在庫の更新
          console.log("在庫更新 - 商品ID:", product.id, "更新するデータ:", { quantity: product.quantity - requiredQuantity, subcategoryId: product.subcategoryId });
          await updateProduct(product.id, { quantity: product.quantity - requiredQuantity, subcategoryId: product.subcategoryId });
          // 全体在庫の更新
          console.log("全体在庫の更新 - サブカテゴリID:", product.subcategoryId, "更新する数量:", -requiredQuantity);
          await updateOverallInventory(product.subcategoryId, -requiredQuantity);
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

        // 全体在庫更新イベントをディスパッチ
        const event = new Event('overallInventoryUpdated');
        window.dispatchEvent(event);
      } catch (error) {
        console.error(error);
        showError('販売処理に失敗しました');
      }
    });
  }
});

// 支払い方法設定セクションのイベントリスナーと関数

// 支払い方法追加フォームのイベントリスナー
window.addEventListener('DOMContentLoaded', () => {
  const addPaymentMethodForm = document.getElementById('addPaymentMethodForm');
  if (addPaymentMethodForm) {
    addPaymentMethodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('paymentMethodName')?.value.trim();
      const feeRate = parseFloat(document.getElementById('paymentMethodFee')?.value);
      if (!name || isNaN(feeRate)) {
        showError('支払い方法名と手数料率を正しく入力してください');
        return;
      }
      try {
        await addPaymentMethod(name, feeRate);
        alert('支払い方法が追加されました');
        addPaymentMethodForm.reset();
        await displayPaymentMethods();
        await updatePaymentMethodSelect(); // 支払い方法セレクトボックスを更新
      } catch (error) {
        console.error(error);
        showError('支払い方法の追加に失敗しました');
      }
    });
  }
});

// 支払い方法の表示
async function displayPaymentMethods() {
  try {
    const paymentMethods = await getPaymentMethods();
    const paymentMethodList = document.getElementById('paymentMethodList')?.querySelector('tbody');
    if (!paymentMethodList) {
      showError('支払い方法のリスト表示エリアが見つかりません');
      return;
    }
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

// 全体在庫の表示
async function displayOverallInventory() {
  try {
    const overallInventories = await getAllOverallInventories();
    const overallInventoryTable = document.getElementById('overallInventoryList')?.querySelector('tbody');
    if (!overallInventoryTable) {
      showError('全体在庫のリスト表示エリアが見つかりません');
      return;
    }
    overallInventoryTable.innerHTML = '';

    overallInventories.forEach((inventory) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${inventory.subcategoryName}</td>
        <td>${inventory.quantity}</td>
      `;
      overallInventoryTable.appendChild(row);
    });
  } catch (error) {
    console.error('全体在庫の表示エラー:', error);
    showError('全体在庫の表示に失敗しました');
  }
}

// 月次・年次フィルタの実装
window.addEventListener('DOMContentLoaded', () => {
  const filterTransactionsForm = document.getElementById('filterTransactionsForm');
  if (filterTransactionsForm) {
    filterTransactionsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const month = parseInt(document.getElementById('filterMonth')?.value, 10);
      const year = parseInt(document.getElementById('filterYear')?.value, 10);
      const onlyReturned = document.getElementById('filterOnlyReturned')?.checked;

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
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.content-section');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // すべてのセクションを非表示にする
      sections.forEach((section) => {
        section.style.display = 'none';
      });

      // リンク先のセクションIDを取得して、そのセクションを表示する
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        console.log(`表示するセクションID: ${targetId}`); // デバッグ用ログを追加
        targetSection.style.display = 'block';
      } else {
        console.error(`セクションID「${targetId}」が見つかりませんでした`); // デバッグ用エラー表示
      }
    });
  });

  // 初期表示としてホームセクションのみ表示する
  sections.forEach((section) => {
    section.style.display = 'none';
  });
  
  // ホームセクションが存在するか確認してから表示
  const homeSection = document.getElementById('home');
  if (homeSection) {
    homeSection.style.display = 'block';
  }
});

// 初期化処理
window.addEventListener('DOMContentLoaded', async () => {
  await updatePaymentMethodSelect();
  await displayTransactions(); // 売上管理セクションの初期表示
  await displayPaymentMethods(); // 支払い方法の初期表示

  // 全体在庫の初期表示
  await displayOverallInventory();

  // 全体在庫が更新されたイベントをリッスンして画面を更新
  window.addEventListener('overallInventoryUpdated', async () => {
    await displayOverallInventory();
  });
});
