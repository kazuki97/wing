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

// DOMContentLoaded リスナーの統一
window.addEventListener('DOMContentLoaded', async () => {
  // 初期表示としてホームセクションのみ表示する
  const sections = document.querySelectorAll('.content-section');
  sections.forEach((section) => {
    section.style.display = 'none';
  });
  const homeSection = document.getElementById('home');
  if (homeSection) {
    homeSection.style.display = 'block';
  }

  // ナビゲーションのイベントリスナー設定
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      sections.forEach((section) => {
        section.style.display = 'none';
      });

      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        console.log(`表示するセクションID: ${targetId}`);
        targetSection.style.display = 'block';
      } else {
        console.error(`セクションID「${targetId}」が見つかりませんでした`);
      }
    });
  });

  // 初期化処理
  await updatePaymentMethodSelect();
  await displayTransactions();
  await displayPaymentMethods();
  await displayOverallInventory();

  // 全体在庫が更新されたイベントをリッスン
  window.addEventListener('overallInventoryUpdated', async () => {
    await displayOverallInventory();
  });

  // バーコードスキャンのイベントリスナー設定
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

  // 販売完了ボタンのイベントリスナー設定
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

  // 支払い方法追加フォームのイベントリスナー設定
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

  // 支払い方法の表示
  await displayPaymentMethods();

  // 月次・年次フィルタの実装
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
