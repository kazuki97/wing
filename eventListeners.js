// eventListeners.js


// Firebase Firestore の関数を CDN からインポート
import { 
  db, auth,
  collection, query, where, orderBy, getDocs, doc, getDoc,
  addDoc, updateDoc, serverTimestamp
} from './firebase.js';

import {
  addParentCategory,
  getParentCategories,
  updateParentCategory,
  deleteParentCategory,
  addSubcategory,
  getSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
} from './categories.js';

import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from './customers.js';

import { displayCustomers } from './customers.js';


import {
  addProduct,
  getProducts,
  getProductById,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
  getAllProducts,
} from './products.js';

import {
  updateProductQuantity,
  updateOverallInventory,
  getOverallInventory,
  getAllOverallInventories,
  deleteOverallInventory,
  getInventoryChangesByProductId,
  getOverallInventoryChangesBySubcategoryId,
} from './inventoryManagement.js';

import {
  addPricingRule,
  getPricingRules,
  deletePricingRule,
  getUnitPrice,
  getPricingRuleById,
  updatePricingRule,
} from './pricing.js';

import {
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  addTransaction,
  processSale,
} from './transactions.js';

import {
  getPaymentMethods,
  getPaymentMethodById, // **追加**
} from './paymentMethods.js';



import { getCurrentFilter } from './filterState.js'; 


// エラーメッセージ表示関数
export function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}


// 追加: updatePricingParentCategorySelectの定義
export async function updatePricingParentCategorySelect() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('親カテゴリを取得するにはログインが必要です。');
      return;
    }
    const parentCategories = await getParentCategories();
    const select = document.getElementById('pricingParentCategorySelect');
    select.innerHTML = '<option value="">親カテゴリを選択</option>';
    parentCategories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
    showError('親カテゴリの取得に失敗しました');
  }
}

// 支払い方法セレクトボックスの更新関数
export async function updatePaymentMethodSelect() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('支払い方法を取得するにはログインが必要です。');
      return;
    }
    const paymentMethods = await getPaymentMethods();
    const selectIds = ['transactionPaymentMethod', 'paymentMethodSelect']; // 追加したいセレクトボックスのID
    selectIds.forEach((id) => {
      const paymentMethodSelect = document.getElementById(id);
      if (paymentMethodSelect) {
        paymentMethodSelect.innerHTML = '<option value="">支払い方法を選択</option>';
        paymentMethods.forEach((method) => {
          const option = document.createElement('option');
          option.value = method.id;
          option.textContent = method.name;
          paymentMethodSelect.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error('支払い方法の取得に失敗しました:', error);
  }
}



// モーダルを閉じるボタンのイベントリスナー
document.getElementById('closeEditConsumableUsageModal').addEventListener('click', () => {
  document.getElementById('editConsumableUsageModal').style.display = 'none';
});

// 消耗品使用量の更新フォームの送信イベントリスナー
document.getElementById('editConsumableUsageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usageId = document.getElementById('editConsumableUsageId').value;
  const consumableId = document.getElementById('editConsumableSelect').value;
  const quantityUsed = parseFloat(document.getElementById('editQuantityUsed').value);
  const timestamp = new Date(document.getElementById('editUsageTimestamp').value);

  if (!consumableId || isNaN(quantityUsed) || quantityUsed < 0 || isNaN(timestamp.getTime())) {
    showError('有効なデータを入力してください');
    return;
  }

  try {
    await updateConsumableUsage(usageId, {
      consumableId,
      quantityUsed,
      timestamp: timestamp.toISOString(),
    });
    alert('消耗品使用量が更新されました');
    document.getElementById('editConsumableUsageModal').style.display = 'none';
    const selectedYear = parseInt(document.getElementById('usageYear').value);
    const selectedMonth = parseInt(document.getElementById('usageMonth').value);
    await displayConsumableUsage(selectedYear, selectedMonth);
  } catch (error) {
    console.error('消耗品使用量の更新に失敗しました:', error);
    showError('消耗品使用量の更新に失敗しました');
  }
});


async function addTransactionEditListeners() {
  const editButtons = document.querySelectorAll('.edit-transaction');
  editButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const user = auth.currentUser;
      if (!user) {
        alert('取引を編集するにはログインが必要です。');
        return;
      }
      const transactionId = e.target.dataset.id;
      const transaction = await getTransactionById(transactionId);
      if (transaction) {
        // 取引全体の共通項目をセット
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editTransactionTimestamp').value =
          new Date(transaction.timestamp).toISOString().slice(0, 16);

        // 支払い方法の選択肢を更新
        const paymentMethods = await getPaymentMethods();
        const paymentMethodSelect = document.getElementById('editTransactionPaymentMethod');
        paymentMethodSelect.innerHTML = '<option value="">支払い方法を選択</option>';
        paymentMethods.forEach((method) => {
          const option = document.createElement('option');
          option.value = method.id;
          option.textContent = method.name;
          paymentMethodSelect.appendChild(option);
        });
        paymentMethodSelect.value = transaction.paymentMethodId || '';

        // 複数商品の情報編集用コンテナを取得し、初期化
        const itemsContainer = document.getElementById('editTransactionItemsContainer');
        itemsContainer.innerHTML = '';

        // transaction.items 配列の各商品について、入力行を動的に作成
        transaction.items.forEach((item, index) => {
          // もし productId がある場合、詳細情報を取得（必要なら）
          // ここでは item 内の情報をそのまま使います
          const productName = item.productName || '';
          const quantity = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          const cost = item.cost || 0;
          const size = item.size || 1;

          // 各商品の入力行を作成
          const itemDiv = document.createElement('div');
          itemDiv.classList.add('edit-transaction-item');
          itemDiv.style.border = "1px solid #ccc";
          itemDiv.style.marginBottom = "0.5rem";
          itemDiv.style.padding = "0.5rem";
          itemDiv.innerHTML = `
            <div>
              <label>商品名:</label>
              <input type="text" name="editTransactionProductName_${index}" value="${productName}" required />
            </div>
            <div>
              <label>数量:</label>
              <input type="number" name="editTransactionQuantity_${index}" value="${quantity}" required />
            </div>
            <div>
              <label>販売価格:</label>
              <input type="number" name="editTransactionUnitPrice_${index}" value="${unitPrice}" required />
            </div>
            <div>
              <label>原価:</label>
              <input type="number" name="editTransactionCost_${index}" value="${cost}" required />
            </div>
            <div>
              <label>サイズ:</label>
              <input type="number" name="editTransactionSize_${index}" value="${size}" min="1" required />
            </div>
          `;
          itemsContainer.appendChild(itemDiv);
        });

        // 編集フォームを表示
        document.getElementById('editTransactionFormContainer').style.display = 'block';
      }
    });
  });
}

// 売上管理セクションの取引データ編集フォームのイベントリスナー
const editTransactionForm = document.getElementById('editTransactionForm');
if (editTransactionForm) {
  editTransactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 取引全体の共通情報を取得
    const transactionId = document.getElementById('editTransactionId').value;
    const timestampStr = document.getElementById('editTransactionTimestamp').value;
    const timestamp = new Date(timestampStr).toISOString();
    const paymentMethodId = document.getElementById('editTransactionPaymentMethod').value;

    // 複数商品の編集用コンテナから各商品の情報を収集
    const itemsContainer = document.getElementById('editTransactionItemsContainer');
    const itemDivs = itemsContainer.getElementsByClassName('edit-transaction-item');
    const items = [];
    for (let i = 0; i < itemDivs.length; i++) {
      const div = itemDivs[i];
      // 各入力フィールドは、名前にインデックスを付与している前提です
      const productName = div.querySelector(`input[name="editTransactionProductName_${i}"]`).value;
      const quantity = parseFloat(div.querySelector(`input[name="editTransactionQuantity_${i}"]`).value);
      const unitPrice = parseFloat(div.querySelector(`input[name="editTransactionUnitPrice_${i}"]`).value);
      const cost = parseFloat(div.querySelector(`input[name="editTransactionCost_${i}"]`).value);
      const size = parseFloat(div.querySelector(`input[name="editTransactionSize_${i}"]`).value);

      // 基本的な検証
      if (isNaN(quantity) || isNaN(unitPrice) || isNaN(cost) || isNaN(size)) {
        showError('すべての商品の有効な数値を入力してください');
        return;
      }

      // 小計は販売価格×数量×サイズ（登録時の計算方法）
      const subtotal = quantity * unitPrice * size;
      // 修正：編集時、cost は既に「原価×サイズ」として入力されていると仮定するため、
      // 利益の計算は subtotal - (cost × 数量) で十分
      const itemProfit = subtotal - (cost * quantity);

      items.push({
        productName: productName,
        quantity: quantity,
        unitPrice: unitPrice,
        cost: cost,  // ここは入力された値をそのまま利用
        size: size,
        subtotal: subtotal,
        profit: itemProfit,
      });
    }

    // 全商品の合計を計算
    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    // 修正：合計原価は各商品の cost（既に原価×サイズの値）×数量
    const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity || 0), 0);
    const totalProfit = items.reduce((sum, item) => sum + (item.profit || 0), 0);

    // 手数料や純売上については必要に応じて計算（ここでは例として手数料0とする）
    const feeAmount = 0;
    const netAmount = totalAmount - feeAmount;

    const updatedData = {
      timestamp: timestamp,
      items: items,
      totalAmount: totalAmount,
      totalCost: totalCost,
      paymentMethodId: paymentMethodId,
      feeAmount: feeAmount,
      netAmount: netAmount,
      profit: totalProfit,
    };

    try {
      await updateTransaction(transactionId, updatedData);
      alert('取引が更新されました');
      document.getElementById('editTransactionFormContainer').style.display = 'none';
      editTransactionForm.reset();
      await displayTransactions();
    } catch (error) {
      console.error(error);
      showError('取引の更新に失敗しました');
    }
  });
}



document.addEventListener('DOMContentLoaded', () => {
  const addTransactionForm = document.getElementById('addTransactionForm');
  if (addTransactionForm) {  // 要素が存在する場合のみイベントリスナーを登録する
    addTransactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 手動追加商品の情報を取得
      const productName = document.getElementById('transactionProductName').value;
      const productPrice = parseFloat(document.getElementById('transactionProductPrice').value);
      const productQuantity = parseFloat(document.getElementById('transactionProductQuantity').value);
      const productCost = parseFloat(document.getElementById('transactionProductCost').value);
      let productSize = parseFloat(document.getElementById('transactionSize').value);
      const paymentMethodId = document.getElementById('transactionPaymentMethod').value;

      // productSize が未入力または NaN の場合、デフォルト値 1 を設定
      if (isNaN(productSize) || productSize <= 0) {
        productSize = 1;
      }

      // 入力値の検証
      if (isNaN(productPrice) || isNaN(productQuantity) || isNaN(productCost) || isNaN(productSize)) {
        showError('価格、数量、原価、サイズには数値を入力してください');
        return;
      }

      // 自動計算する項目
      const subtotal = productPrice * productQuantity * productSize; // 小計
      const totalCost = productCost * productQuantity * productSize;   // 総原価

      // 支払い方法の手数料を取得
      let feeAmount = 0;
      if (paymentMethodId) {
        const paymentMethod = await getPaymentMethodById(paymentMethodId);
        if (paymentMethod && paymentMethod.feeRate) {
          feeAmount = subtotal * paymentMethod.feeRate;
        }
      }

      // 利益の計算
      const profitAmount = subtotal - totalCost - feeAmount;

      // 売上データを生成
      const transactionData = {
        items: [{
          productName,
          unitPrice: productPrice,
          quantity: productQuantity,
          size: productSize,
          subtotal: subtotal,
          cost: totalCost,
          profit: profitAmount,
        }],
        totalCost: totalCost,
        totalAmount: subtotal,
        paymentMethodId,
        timestamp: new Date().toISOString(),
        feeAmount: feeAmount,
        netAmount: subtotal - feeAmount,
        profit: profitAmount,
        manuallyAdded: true,
      };

      try {
        await addTransaction(transactionData);
        alert('売上が追加されました');
        document.getElementById('manualAddTransactionForm').style.display = 'none';
        e.target.reset();
        await displayTransactions();
      } catch (error) {
        console.error('売上の追加に失敗しました:', error);
        showError('売上の追加に失敗しました');
      }
    });
  }
});



// 商品追加フォームのイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
  const addProductForm = document.getElementById('addProductForm');
  if (addProductForm) {  // 要素が存在する場合のみ処理を実行
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) {
        alert('商品を追加するにはログインが必要です。');
        return;
      }

      // 商品の情報を取得
      const productData = {
        name: document.getElementById('productName').value,
        parentCategoryId: document.getElementById('productParentCategorySelect').value,
        subcategoryId: document.getElementById('productSubcategorySelect').value,
        price: parseFloat(document.getElementById('productPrice').value),
        cost: parseFloat(document.getElementById('productCost').value),
        barcode: document.getElementById('productBarcode').value,
        quantity: parseFloat(document.getElementById('productQuantity').value),
        size: parseFloat(document.getElementById('productSize').value),
      };

      

      try {
        await addProduct(productData);
        alert('商品が追加されました');
        addProductForm.reset(); // フォームをリセット
        await displayProducts(); // 商品一覧を再表示
      } catch (error) {
        console.error('商品の追加に失敗しました:', error);
        showError('商品の追加に失敗しました');
      }
    });
  }
});






// 売上管理セクションの取引データ表示関数
// 売上管理セクションの取引データ表示関数（修正後の該当部分）
export async function displayTransactions(filter = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('取引を表示するにはログインが必要です。');
      return;
    }

    let transactions = await getTransactions();
    const paymentMethods = await getPaymentMethods(); // 支払い方法を取得
    const paymentMethodMap = {};
    paymentMethods.forEach((method) => {
      paymentMethodMap[method.id] = method.name;
    });

    // フィルタの適用
    if (filter.onlyReturned) {
      transactions = transactions.filter((t) => t.isReturned);
    }
    if (filter.month || filter.year) {
      transactions = transactions.filter((t) => {
        const date = new Date(t.timestamp);
        const monthMatch = filter.month ? date.getMonth() + 1 === filter.month : true;
        const yearMatch = filter.year ? date.getFullYear() === filter.year : true;
        return monthMatch && yearMatch;
      });
    }

    // ▼▼▼ ソート処理（古い順に昇順） ▼▼▼
    transactions.sort((a, b) => {
      let aTime, bTime;
      if (a.timestamp && typeof a.timestamp.toDate === 'function') {
        aTime = a.timestamp.toDate().getTime();
      } else {
        aTime = new Date(a.timestamp).getTime();
      }
      if (b.timestamp && typeof b.timestamp.toDate === 'function') {
        bTime = b.timestamp.toDate().getTime();
      } else {
        bTime = new Date(b.timestamp).getTime();
      }
      return aTime - bTime;
    });
    // ▲▲▲ ソート処理ここまで ▲▲▲

    const transactionList = document.getElementById('transactionList').querySelector('tbody');
    transactionList.innerHTML = '';

    for (const transaction of transactions) {
      const row = document.createElement('tr');
      if (transaction.isReturned) {
        row.style.color = 'red';
      }

      const itemsExist = Array.isArray(transaction.items) && transaction.items.length > 0;
      const productNames = itemsExist
        ? transaction.items.map((item) => item.productName).join(', ')
        : '商品情報なし';
      const totalQuantity = itemsExist
        ? transaction.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
        : '-';
      const paymentMethodName = paymentMethodMap[transaction.paymentMethodId] || '不明な支払い方法';

      let formattedTimestamp = '日時情報なし';
      if (transaction.timestamp) {
        const date = new Date(transaction.timestamp);
        if (!isNaN(date.getTime())) {
          formattedTimestamp = date.toLocaleString('ja-JP');
        }
      }

      let totalCost = 0;
      if (transaction.totalCost !== undefined && !isNaN(parseFloat(transaction.totalCost))) {
        totalCost = parseFloat(transaction.totalCost);
      } else if (itemsExist) {
        totalCost = transaction.items.reduce((sum, item) => {
          let itemTotalCost = parseFloat(item.cost);
          if (isNaN(itemTotalCost)) itemTotalCost = 0;
          return sum + itemTotalCost;
        }, 0);
      } else {
        totalCost = 0;
      }

    const netAmount = parseFloat(transaction.netAmount) || 0;
const feeAmount = parseFloat(transaction.feeAmount) || 0;
const discountAmount = transaction.discount?.amount || 0;  

// 修正点：すでに割引済みのnetAmountをそのまま使う
const adjustedNetAmount = netAmount;

// 修正点：利益計算は、割引済みnetAmountから原価と手数料を引くだけに修正
const adjustedProfit = netAmount - totalCost - feeAmount;

// チェックボックスを先頭セルに追加
row.innerHTML = `
  <td><input type="checkbox" class="transaction-checkbox" value="${transaction.id}" /></td>
  <td>${transaction.id}</td>
  <td>${formattedTimestamp}</td>
  <td>${paymentMethodName}</td>
  <td>${transaction.salesMethod || ''}</td>
  <td>${productNames}</td>
  <td>${totalQuantity}</td>
  <td>¥${Math.round(adjustedNetAmount)}</td> <!-- 割引後の売上 -->
  <td>¥${Math.round(feeAmount)}</td>
  <td>¥${Math.round(totalCost)}</td>
  <td>¥${Math.round(adjustedProfit)}</td>   <!-- 割引後の利益 -->
  <td>¥${Math.round(discountAmount)}</td>
  <td>
    <button class="view-transaction-details" data-id="${transaction.id}">詳細</button>
    <button class="edit-transaction" data-id="${transaction.id}">編集</button>
  </td>
`;

    transactionList.appendChild(row);
    }

    // ▼▼▼ 合計集計表示処理（変更なし） ▼▼▼
    let totalSales = 0;    // 合計売上 (割引後)
    let totalProfit = 0;   // 合計利益
    let totalDiscount = 0; // 合計割引額

    for (const t of transactions) {
      totalSales += (t.totalAmount || 0);
      totalProfit += (t.profit || 0);
      if (t.discount && t.discount.amount) {
        totalDiscount += parseFloat(t.discount.amount);
      }
    }
    const summaryDiv = document.getElementById('transactionsSummary');
    if (summaryDiv) {
      summaryDiv.innerHTML = `
        <p>合計売上金額: ¥${Math.round(totalSales)}</p>
        <p>合計利益: ¥${Math.round(totalProfit)}</p>
        <p>合計割引額: ¥${Math.round(totalDiscount)}</p>
      `;
    }
    // ▲▲▲ 合計表示ここまで ▲▲▲

    // 既存の詳細・編集ボタンのイベントリスナー設定（変更なし）
    document.querySelectorAll('.view-transaction-details').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const transactionId = e.target.dataset.id;
        await displayTransactionDetails(transactionId);
      });
    });
    await addTransactionEditListeners();
  } catch (error) {
    console.error(error);
    showError('取引の表示に失敗しました');
  }
}

// ▼▼▼ 全選択チェックボックスの処理 ▼▼▼
// 修正後（eventListeners.js 約923行目付近）
document.addEventListener('DOMContentLoaded', () => {
  const selectAllTransactions = document.getElementById('selectAllTransactions');
  if (selectAllTransactions) {  // 要素が存在する場合のみ処理する
    selectAllTransactions.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const checkboxes = document.querySelectorAll('.transaction-checkbox');
      checkboxes.forEach((cb) => {
        cb.checked = checked;
      });
    });
  }
});


// ▼▼▼ 一括削除ボタンの処理 ▼▼▼
document.addEventListener('DOMContentLoaded', () => {
  const deleteSelectedTransactionsButton = document.getElementById('deleteSelectedTransactionsButton');
  if (deleteSelectedTransactionsButton) {  // 対象要素が存在する場合のみ
    deleteSelectedTransactionsButton.addEventListener('click', async () => {
      const selectedCheckboxes = document.querySelectorAll('.transaction-checkbox:checked');
      if (selectedCheckboxes.length === 0) {
        alert('削除する取引を選択してください。');
        return;
      }
      if (!confirm(`選択された ${selectedCheckboxes.length} 件の取引を削除してよろしいですか？`)) {
        return;
      }
      const transactionIds = Array.from(selectedCheckboxes).map(cb => cb.value);
      try {
        for (const id of transactionIds) {
          await deleteTransaction(id);
        }
        alert('選択された取引が削除されました。');
        await displayTransactions();
      } catch (error) {
        console.error(error);
        showError('取引の一括削除に失敗しました');
      }
    });
  }
});



// 売上管理セクションの取引詳細を表示する関数（完全版・割引対応済）
// 取引詳細表示関数（修正後：全ての表示内容を編集可能に）
async function displayTransactionDetails(transactionId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('取引の詳細を表示するにはログインが必要です。');
      return;
    }

    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      showError('取引が見つかりません');
      return;
    }

    // モーダルとオーバーレイの要素を取得
    const transactionDetails = document.getElementById('transactionDetails');
    const overlay = document.getElementById('modalOverlay');

    // 取引ID（編集不可）
    document.getElementById('detailTransactionId').innerHTML =
      `<input type="text" id="detailTransactionIdInput" value="${transaction.id}" readonly>`;

    // 日時（datetime-local形式）
    let timestampValue = '';
    if (transaction.timestamp) {
      const date = new Date(transaction.timestamp);
      if (!isNaN(date.getTime())) {
        timestampValue = date.toISOString().slice(0,16); // "YYYY-MM-DDTHH:MM"
      }
    }
    document.getElementById('detailTimestamp').innerHTML =
      `<input type="datetime-local" id="detailTimestampInput" value="${timestampValue}">`;

    // 支払方法、販売方法、発送方法、送料
    document.getElementById('detailPaymentMethod').innerHTML =
      `<input type="text" id="detailPaymentMethodInput" value="${transaction.paymentMethodName || ''}">`;
    document.getElementById('detailSalesMethod').innerHTML =
      `<input type="text" id="detailSalesMethodInput" value="${transaction.salesMethod || ''}">`;
    document.getElementById('detailShippingMethod').innerHTML =
      `<input type="text" id="detailShippingMethodInput" value="${transaction.shippingMethod || ''}">`;
    document.getElementById('detailShippingFee').innerHTML =
      `<input type="number" id="detailShippingFeeInput" value="${transaction.shippingFee !== undefined ? Math.round(transaction.shippingFee) : 0}">`;

    // 売上は、transaction.totalAmount（割引適用後の総額）を使用
const feeAmount = transaction.feeAmount || 0;
const shippingFee = transaction.shippingFee || 0;
const displayedSales = transaction.totalAmount || 0; // 売上は totalAmount で決定
const totalCost = transaction.totalCost || transaction.items.reduce((sum, item) => sum + (item.cost || 0), 0);
// 利益は「売上 － 原価 － 手数料 － 送料」で計算
const displayedProfit = displayedSales - totalCost - feeAmount - shippingFee;

const discountAmount = transaction.discount?.amount || 0;
const discountReason = transaction.discount?.reason || '';

document.getElementById('detailFeeAmount').innerHTML =
  `<input type="number" id="detailFeeAmountInput" value="${Math.round(feeAmount)}">`;
document.getElementById('detailNetAmount').innerHTML =
  `<input type="number" id="detailNetAmountInput" value="${Math.round(displayedSales)}">`;
document.getElementById('detailTotalCost').innerHTML =
  `<input type="number" id="detailTotalCostInput" value="${Math.round(totalCost)}">`;
document.getElementById('detailTotalProfit').innerHTML =
  `<input type="number" id="detailTotalProfitInput" value="${Math.round(displayedProfit)}">`;

// 割引情報：割引額と理由（売上はすでに割引適用済み）
document.getElementById('discountInfoContainer').innerHTML = `
  <label>割引額: </label><input type="number" id="detailDiscountAmountInput" value="${Math.round(discountAmount)}">
  <label>割引理由: </label><input type="text" id="detailDiscountReasonInput" value="${discountReason}">
`;

    // 取引商品リスト（全項目を入力フィールドに変更）
    const detailProductList = document.getElementById('detailProductList');
    detailProductList.innerHTML = '';
    if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="text" class="edit-item-productName" value="${item.productName}"></td>
          <td><input type="number" class="edit-item-quantity" value="${item.quantity}"></td>
          <td><input type="number" class="edit-item-size" value="${item.size}"></td>
          <td><input type="number" class="edit-item-unitPrice" value="${Math.round(item.unitPrice || 0)}"></td>
          <td><input type="number" class="edit-item-subtotal" value="${Math.round(item.subtotal || 0)}"></td>
          <td><input type="number" class="edit-item-cost" value="${Math.round(item.cost || 0)}"></td>
          <td><input type="number" class="edit-item-fee" value="${Math.round(item.fee || 0)}"></td>
          <td><input type="number" class="edit-item-profit" value="${Math.round(item.profit || 0)}"></td>
        `;
        detailProductList.appendChild(row);
      });
    } else {
      detailProductList.innerHTML = '<tr><td colspan="8">商品情報はありません</td></tr>';
    }

    // 返品・削除ボタンの設定
    const returnButton = document.getElementById('returnTransactionButton');
    if (transaction.isReturned || transaction.manuallyAdded) {
      returnButton.style.display = 'none';
      document.getElementById('returnInfo').textContent =
        transaction.isReturned ? `返品理由: ${transaction.returnReason}` : '';
    } else {
      returnButton.style.display = 'block';
      document.getElementById('returnInfo').textContent = '';
      returnButton.onclick = () => handleReturnTransaction(transaction);
    }

    const deleteButton = document.getElementById('deleteTransactionButton');
deleteButton.style.display = 'block';
deleteButton.onclick = () => handleDeleteTransaction(transaction.id);

// 更新ボタンの取得と重複イベントリスナーの防止
let saveBtn = document.getElementById('saveTransactionButton');
if (saveBtn) {
  // 既存のボタンがある場合は、クローンして置き換えることでイベントリスナーをリセット
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  saveBtn = newSaveBtn;
} else {
  // 存在しない場合は新規作成
  saveBtn = document.createElement('button');
  saveBtn.id = 'saveTransactionButton';
  saveBtn.textContent = '更新';
  transactionDetails.appendChild(saveBtn);
}
saveBtn.style.display = 'block';
saveBtn.addEventListener('click', async () => {
  // 入力フィールドから値を取得
  const transactionId = document.getElementById('detailTransactionIdInput').value;
  const timestamp = new Date(document.getElementById('detailTimestampInput').value).toISOString();
  const paymentMethodName = document.getElementById('detailPaymentMethodInput').value;
  const salesMethod = document.getElementById('detailSalesMethodInput').value;
  const shippingMethod = document.getElementById('detailShippingMethodInput').value;
  const shippingFee = parseFloat(document.getElementById('detailShippingFeeInput').value) || 0;
  const feeAmount = parseFloat(document.getElementById('detailFeeAmountInput').value) || 0;
  const netAmount = parseFloat(document.getElementById('detailNetAmountInput').value) || 0;
  const totalCost = parseFloat(document.getElementById('detailTotalCostInput').value) || 0;
  const totalProfit = parseFloat(document.getElementById('detailTotalProfitInput').value) || 0;
  const discountAmount = parseFloat(document.getElementById('detailDiscountAmountInput').value) || 0;
  const discountReason = document.getElementById('detailDiscountReasonInput').value;

  // 取引商品の各項目を取得（テーブルの各行ごとに）
  const itemRows = document.querySelectorAll('#detailProductList tr');
  const items = [];
  itemRows.forEach((row) => {
    const productName = row.querySelector('.edit-item-productName').value;
    const quantity = parseFloat(row.querySelector('.edit-item-quantity').value) || 0;
    const size = parseFloat(row.querySelector('.edit-item-size').value) || 1;
    const unitPrice = parseFloat(row.querySelector('.edit-item-unitPrice').value) || 0;
    const subtotal = parseFloat(row.querySelector('.edit-item-subtotal').value) || 0;
    const cost = parseFloat(row.querySelector('.edit-item-cost').value) || 0;
    const fee = parseFloat(row.querySelector('.edit-item-fee').value) || 0;
    const profit = parseFloat(row.querySelector('.edit-item-profit').value) || 0;

    items.push({
      productName,
      quantity,
      size,
      unitPrice,
      subtotal,
      cost,
      fee,
      profit,
    });
  });

  // 更新用オブジェクトの作成
  const updatedData = {
    timestamp,
    paymentMethodName, // 必要に応じて paymentMethodId に変更
    salesMethod,
    shippingMethod,
    shippingFee,
    feeAmount,
    netAmount,
    totalCost,
    profit: totalProfit,
    discount: {
      amount: discountAmount,
      reason: discountReason,
    },
    items,
  };

  try {
  await updateTransaction(transactionId, updatedData);
  alert('取引が更新されました');
  document.getElementById('transactionDetails').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
  // 更新後、グローバル変数 currentFilter を用いてフィルタ条件を維持
 await displayTransactions(getCurrentFilter());
} catch (error) {
  console.error('取引更新に失敗しました:', error);
  showError('取引の更新に失敗しました');
}
});

// 閉じるボタンのイベントリスナー
document.getElementById('closeTransactionDetails').addEventListener('click', () => {
  document.getElementById('transactionDetails').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
});

transactionDetails.style.display = 'block';
overlay.style.display = 'block';


  } catch (error) {
    console.error('取引の詳細表示に失敗しました:', error);
    showError('取引の詳細を表示できませんでした');
  }
}


// 閉じるボタンのイベントリスナー（修正後）
const closeTransactionDetailsButton = document.getElementById('closeTransactionDetails');
if (closeTransactionDetailsButton) {
  closeTransactionDetailsButton.addEventListener('click', () => {
    document.getElementById('transactionDetails').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
  });
}


const cancelEditTransactionButton = document.getElementById('cancelEditTransaction');
if (cancelEditTransactionButton) {
  cancelEditTransactionButton.addEventListener('click', () => {
    document.getElementById('editTransactionFormContainer').style.display = 'none';
    editTransactionForm.reset();
  });
}

async function handleReturnTransaction(transaction) {
  const user = auth.currentUser;
  if (!user) {
    alert('返品処理を行うにはログインが必要です。');
    return;
  }
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

    // productId が無い(手動追加売上)アイテムは在庫操作をスキップ
    if (!productId) {
      continue;
    }

    const quantity = item.quantity;
    const size = item.size;
    const requiredQuantity = quantity * size;

    const product = await getProductById(productId);
    if (!product) {
      console.error(`商品ID ${productId} が見つかりませんでした`);
      showError('商品が見つかりませんでした');
      continue; // 見つからなければスキップ
    }

    const updatedQuantity = product.quantity + requiredQuantity;
    await updateProduct(productId, { quantity: updatedQuantity });
    // 全体在庫の更新
    const subcategoryId = product.subcategoryId;
    if (subcategoryId) {
      await updateOverallInventory(subcategoryId, requiredQuantity);
    }
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

async function handleDeleteTransaction(transactionId) {
  const user = auth.currentUser;
  if (!user) {
    alert('取引を削除するにはログインが必要です。');
    return;
  }
  if (confirm('この取引を削除しますか？')) {
    try {
      // 修正後は、handleDeleteTransaction() 内で個別の在庫更新はせず、deleteTransaction()（修正済み）を呼ぶだけ
      await deleteTransaction(transactionId);
      alert('取引が削除されました');
      document.getElementById('transactionDetails').style.display = 'none';
      await displayTransactions();
      await displayOverallInventory();
      await displayInventoryProducts();
    } catch (error) {
      console.error(error);
      showError('取引の削除に失敗しました');
    }
  }
}


document.addEventListener('DOMContentLoaded', () => {
  // モーダル要素の取得
  const addParentCategoryModal = document.getElementById('addParentCategoryModal');
  const addSubcategoryModal = document.getElementById('addSubcategoryModal');

  // モーダルを開くボタンの取得
  const openAddParentCategoryModalBtn = document.getElementById('openAddParentCategoryModal');
  const openAddSubcategoryModalBtn = document.getElementById('openAddSubcategoryModal');

  // モーダルを閉じるボタンの取得
  const closeParentCategoryModalBtn = document.getElementById('closeParentCategoryModal');
  const closeSubcategoryModalBtn = document.getElementById('closeSubcategoryModal');

  // モーダルを開くイベントリスナー
  if (openAddParentCategoryModalBtn && addParentCategoryModal) {
    openAddParentCategoryModalBtn.addEventListener('click', () => {
      addParentCategoryModal.style.display = 'block';
      updateAllParentCategorySelects();
    });
  }
  if (openAddSubcategoryModalBtn && addSubcategoryModal) {
    openAddSubcategoryModalBtn.addEventListener('click', () => {
      addSubcategoryModal.style.display = 'block';
      updateAllParentCategorySelects();
    });
  }

  // モーダルを閉じるイベントリスナー
  if (closeParentCategoryModalBtn && addParentCategoryModal) {
    closeParentCategoryModalBtn.addEventListener('click', () => {
      addParentCategoryModal.style.display = 'none';
    });
  }
  if (closeSubcategoryModalBtn && addSubcategoryModal) {
    closeSubcategoryModalBtn.addEventListener('click', () => {
      addSubcategoryModal.style.display = 'none';
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // モーダル要素の取得（ここで定義しておく）
  const addParentCategoryModal = document.getElementById('addParentCategoryModal');
  const addSubcategoryModal = document.getElementById('addSubcategoryModal');

  // モーダル外クリック時の処理も DOMContentLoaded 内で定義する
  window.addEventListener('click', (event) => {
    if (addParentCategoryModal && event.target === addParentCategoryModal) {
      addParentCategoryModal.style.display = 'none';
    }
    if (addSubcategoryModal && event.target === addSubcategoryModal) {
      addSubcategoryModal.style.display = 'none';
    }
  });
});

// モーダル内の親カテゴリ追加フォームの送信イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
  const modalAddParentCategoryForm = document.getElementById('modalAddParentCategoryForm');
  if (modalAddParentCategoryForm) { // フォームが存在する場合のみ登録
    modalAddParentCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert('親カテゴリを追加するにはログインが必要です。');
        return;
      }
      const name = document.getElementById('modalParentCategoryName').value;
      try {
        await addParentCategory(name);
        document.getElementById('modalParentCategoryName').value = '';
        const addParentCategoryModal = document.getElementById('addParentCategoryModal');
        if (addParentCategoryModal) {
          addParentCategoryModal.style.display = 'none';
        }
        await updateAllParentCategorySelects();
        await displayParentCategories();
        alert('親カテゴリが追加されました');
      } catch (error) {
        console.error(error);
        showError('親カテゴリの追加に失敗しました');
      }
    });
  }
});


// モーダル内のサブカテゴリ追加フォームの送信イベントリスナー
document.addEventListener('DOMContentLoaded', () => {
  const modalAddSubcategoryForm = document.getElementById('modalAddSubcategoryForm');
  if (modalAddSubcategoryForm) {  // 要素が存在する場合のみイベントリスナーを登録
    modalAddSubcategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert('サブカテゴリを追加するにはログインが必要です。');
        return;
      }
      const parentCategoryId = document.getElementById('modalSubcategoryParentCategorySelect').value;
      const name = document.getElementById('modalSubcategoryName').value;
      try {
        await addSubcategory(name, parentCategoryId);
        document.getElementById('modalSubcategoryName').value = '';
        const addSubcategoryModal = document.getElementById('addSubcategoryModal');
        if (addSubcategoryModal) {
          addSubcategoryModal.style.display = 'none';
        }
        await displayParentCategories();
        await updateAllParentCategorySelects();
        alert('サブカテゴリが追加されました');
      } catch (error) {
        console.error(error);
        showError('サブカテゴリの追加に失敗しました');
      }
    });
  }
});

// 商品追加モーダル要素の取得
const addProductModal = document.getElementById('addProductModal');

// モーダルを開くボタンの取得
const openAddProductModalBtn = document.getElementById('openAddProductModal');

// モーダルを閉じるボタンの取得
const closeAddProductModalBtn = document.getElementById('closeAddProductModal');

document.addEventListener('DOMContentLoaded', () => {
  const openAddProductModalBtn = document.getElementById('openAddProductModal');
  const closeAddProductModalBtn = document.getElementById('closeAddProductModal');
  const addProductModal = document.getElementById('addProductModal');

  if (openAddProductModalBtn && addProductModal) {
    openAddProductModalBtn.addEventListener('click', async () => {
      addProductModal.style.display = 'block';
      await updateAllParentCategorySelects(); // カテゴリセレクトボックスを更新
      // 消耗品関連は削除済みのため、この行を削除
    });
  }
  

  if (closeAddProductModalBtn && addProductModal) {
    closeAddProductModalBtn.addEventListener('click', () => {
      addProductModal.style.display = 'none';
      const addProductForm = document.getElementById('addProductForm');
      if (addProductForm) {
        addProductForm.reset();
      }
    });
  }
});


// モーダル外をクリックしたときにモーダルを閉じる
window.addEventListener('click', (event) => {
  if (event.target === addProductModal) {
    addProductModal.style.display = 'none';
    document.getElementById('addProductForm').reset();
  }
});


// 親カテゴリセレクトボックスの更新（全てのセレクトボックスを更新）
export async function updateAllParentCategorySelects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('親カテゴリを取得するにはログインが必要です。');
      return;
    }
    const parentCategories = await getParentCategories();
    const selectIds = [
      'productParentCategorySelect',
      'filterParentCategorySelect',
      'inventoryParentCategorySelect',
      'overallInventoryParentCategorySelect',
      'pricingParentCategorySelect',
      'modalSubcategoryParentCategorySelect',
    ];
    selectIds.forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        const selectedValue = select.value;
        select.innerHTML = '<option value="">親カテゴリを選択</option>';
        parentCategories.forEach((category) => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          select.appendChild(option);
        });
        if (selectedValue) {
          select.value = selectedValue;
        }
      } else {
        console.warn(`IDが '${id}' のセレクトボックスが見つかりません`);
      }
    });
    await updateSubcategorySelects();
  } catch (error) {
    console.error(error);
    showError('親カテゴリの取得に失敗しました');
  }
}

// サブカテゴリセレクトボックスの更新
async function updateSubcategorySelects() {
  const user = auth.currentUser;
  if (!user) {
    alert('サブカテゴリを取得するにはログインが必要です。');
    return;
  }
  const parentCategorySelectIds = {
    productParentCategorySelect: 'productSubcategorySelect',
    filterParentCategorySelect: 'filterSubcategorySelect',
    inventoryParentCategorySelect: 'inventorySubcategorySelect',
    overallInventoryParentCategorySelect: 'overallInventorySubcategorySelect',
    pricingParentCategorySelect: 'pricingSubcategorySelect',
    // modalSubcategoryParentCategorySelect: 'modalSubcategorySelect', // この行を削除
  };

  for (const parentSelectId in parentCategorySelectIds) {
    const parentCategorySelect = document.getElementById(parentSelectId);
    if (parentCategorySelect) {
      const parentCategoryId = parentCategorySelect.value;
      const subcategorySelectId = parentCategorySelectIds[parentSelectId];
      await updateSubcategorySelect(parentCategoryId, subcategorySelectId);
    }
  }
}

// サブカテゴリセレクトボックスの個別更新関数をエクスポート
export async function updateSubcategorySelect(parentCategoryId, subcategorySelectId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('サブカテゴリを取得するにはログインが必要です。');
      return;
    }
    const select = document.getElementById(subcategorySelectId);
    if (select) {
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'サブカテゴリを選択';
      select.appendChild(defaultOption);
      if (!parentCategoryId) {
        return;
      }
      const subcategories = await getSubcategories(parentCategoryId);
      subcategories.forEach((subcategory) => {
        const option = document.createElement('option');
        option.value = subcategory.id;
        option.textContent = subcategory.name;
        select.appendChild(option);
      });
    } else {
      console.warn(`IDが '${subcategorySelectId}' のサブカテゴリセレクトボックスが見つかりません`);
    }
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの取得に失敗しました');
  }
}



// 各親カテゴリセレクトボックスのイベントリスナー（修正後）
['productParentCategorySelect', 'filterParentCategorySelect', 'inventoryParentCategorySelect', 'overallInventoryParentCategorySelect', 'pricingParentCategorySelect'].forEach((id) => {
  const selectElement = document.getElementById(id);
  if (selectElement) {  // 要素が存在する場合のみイベントリスナーを登録する
    selectElement.addEventListener('change', async () => {
      const parentCategoryId = selectElement.value; // 既に取得済みの要素を使用
      const subcategorySelectId = {
        productParentCategorySelect: 'productSubcategorySelect',
        filterParentCategorySelect: 'filterSubcategorySelect',
        inventoryParentCategorySelect: 'inventorySubcategorySelect',
        overallInventoryParentCategorySelect: 'overallInventorySubcategorySelect',
        pricingParentCategorySelect: 'pricingSubcategorySelect',
      }[id];
      await updateSubcategorySelect(parentCategoryId, subcategorySelectId);
      // 追加: カテゴリ変更時に関連する商品や在庫情報を更新
      if (id === 'inventoryParentCategorySelect') {
        await displayInventoryProducts();
      } else if (id === 'filterParentCategorySelect') {
        await displayProducts();
      } else if (id === 'pricingParentCategorySelect') {
        await displayPricingRules();
      }
    });
  }
});

// イベントリスナーの重複登録を防ぐためのフラグ
let subcategoryEventListenersAdded = false;

function addSubcategorySelectEventListeners() {
  if (subcategoryEventListenersAdded) return;

  const parentCategorySelectIds = {
    productParentCategorySelect: 'productSubcategorySelect',
    filterParentCategorySelect: 'filterSubcategorySelect',
    inventoryParentCategorySelect: 'inventorySubcategorySelect',
    overallInventoryParentCategorySelect: 'overallInventorySubcategorySelect',
    pricingParentCategorySelect: 'pricingSubcategorySelect',
    modalSubcategoryParentCategorySelect: 'modalSubcategorySelect',
  };

  // 👇 これが抜けていた！（定義を追加）
  const subcategorySelectIds = [
    'productSubcategorySelect',
    'filterSubcategorySelect',
    'inventorySubcategorySelect',
    'overallInventorySubcategorySelect',
    'pricingSubcategorySelect',
    'modalSubcategorySelect',
  ];

  subcategorySelectIds.forEach((id) => {
    const selectElement = document.getElementById(id);
    if (selectElement) {
      selectElement.addEventListener('change', async (event) => {
        if (id === 'inventorySubcategorySelect') {
          await displayInventoryProducts();
        } else if (id === 'filterSubcategorySelect') {
          await displayProducts();
        } else if (id === 'pricingSubcategorySelect') {
          await displayPricingRules();
        }
      });
    }
  });

  subcategoryEventListenersAdded = true;
}


// アプリケーションの初期化時に一度だけ呼び出す
addSubcategorySelectEventListeners();


// 親カテゴリ一覧の表示
export async function displayParentCategories() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('親カテゴリを表示するにはログインが必要です。');
      return;
    }
    const parentCategories = await getParentCategories();
    const parentCategoryList = document.getElementById('parentCategoryList');
    parentCategoryList.innerHTML = '';
    for (const category of parentCategories) {
      const listItem = document.createElement('li');

      // 親カテゴリ名を太字にして表示
      const categoryName = document.createElement('strong');
      categoryName.textContent = category.name;
      listItem.appendChild(categoryName);

      // 編集ボタン
      const editButton = document.createElement('button');
      editButton.textContent = '編集';
      editButton.addEventListener('click', () => {
        const newName = prompt('新しいカテゴリ名を入力してください', category.name);
        if (newName) {
          updateParentCategory(category.id, newName)
            .then(async () => {
              alert('親カテゴリが更新されました');
              await displayParentCategories();
              await updateAllParentCategorySelects();
            })
            .catch((error) => {
              console.error(error);
              showError('親カテゴリの更新に失敗しました');
            });
        }
      });
      listItem.appendChild(editButton);

      // 削除ボタン
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        if (confirm('本当に削除しますか？ この親カテゴリに属するサブカテゴリも削除されます。')) {
          deleteParentCategory(category.id)
            .then(async () => {
              alert('親カテゴリが削除されました');
              await displayParentCategories();
              await updateAllParentCategorySelects();
            })
            .catch((error) => {
              console.error(error);
              showError('親カテゴリの削除に失敗しました');
            });
        }
      });
      listItem.appendChild(deleteButton);

      // サブカテゴリの表示
      const subcategoryList = await displaySubcategories(category.id);
      if (subcategoryList) {
        listItem.appendChild(subcategoryList);
      }

      parentCategoryList.appendChild(listItem);
    }
  } catch (error) {
    console.error(error);
    showError('親カテゴリの表示に失敗しました');
  }
}

// サブカテゴリの表示
async function displaySubcategories(parentCategoryId) {
  try {
    const subcategories = await getSubcategories(parentCategoryId);
    if (subcategories.length === 0) {
      return null; // サブカテゴリがない場合は何も返さない
    }

    const subcategoryList = document.createElement('ul');
    for (const subcategory of subcategories) {
      const listItem = document.createElement('li');

      // サブカテゴリ名を表示
      listItem.textContent = subcategory.name;

      // 編集ボタン
      const editButton = document.createElement('button');
      editButton.textContent = '編集';
      editButton.addEventListener('click', () => {
        const newName = prompt('新しいサブカテゴリ名を入力してください', subcategory.name);
        if (newName) {
          updateSubcategory(subcategory.id, newName)
            .then(async () => {
              alert('サブカテゴリが更新されました');
              await displayParentCategories();
              await updateAllParentCategorySelects();
            })
            .catch((error) => {
              console.error(error);
              showError('サブカテゴリの更新に失敗しました');
            });
        }
      });
      listItem.appendChild(editButton);

      // 削除ボタン
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => {
        if (confirm('本当に削除しますか？')) {
          deleteSubcategory(subcategory.id)
            .then(async () => {
              alert('サブカテゴリが削除されました');
              await displayParentCategories();
              await updateAllParentCategorySelects();
            })
            .catch((error) => {
              console.error(error);
              showError('サブカテゴリの削除に失敗しました');
            });
        }
      });
      listItem.appendChild(deleteButton);

      subcategoryList.appendChild(listItem);
    }
    return subcategoryList;
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの表示に失敗しました');
    return null;
  }
}



export async function displayProducts() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('商品を表示するにはログインが必要です。');
      return;
    }
    const parentCategoryId = document.getElementById('filterParentCategorySelect').value;
    const subcategoryId = document.getElementById('filterSubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);

    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    // サブカテゴリごとにグループ化
    const subcategoryMap = {};
    for (const product of products) {
      // サブカテゴリ名を取得
      let subcategoryName = '不明なサブカテゴリ';
      if (product.subcategoryId) {
        const subcategory = await getSubcategoryById(product.subcategoryId);
        if (subcategory) subcategoryName = subcategory.name;
      }
      if (!subcategoryMap[subcategoryName]) {
        subcategoryMap[subcategoryName] = [];
      }
      subcategoryMap[subcategoryName].push(product);
    }

    // サブカテゴリごとに見出し＋カード群で表示
    for (const subcategoryName in subcategoryMap) {
      // サブカテゴリ見出し
      const subcategoryHeader = document.createElement('h3');
      subcategoryHeader.textContent = subcategoryName;
      subcategoryHeader.className = 'subcategory-header';
      productList.appendChild(subcategoryHeader);

      // カードラッパー
      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'product-card-wrapper';

      subcategoryMap[subcategoryName].forEach((product) => {
        const card = document.createElement('div');
        card.className = 'product-card';

        card.innerHTML = `
          <div class="product-card-header">
            <span class="product-card-title">${product.name}</span>
          </div>
          <div class="product-card-body">
            <div>数量: <strong>${product.quantity || 0}</strong></div>
            <div>価格: ¥${product.price}</div>
            <div>原価: ¥${product.cost}</div>
            <div>バーコード: ${product.barcode}</div>
            <div>サイズ: ${product.size}</div>
          </div>
          <div class="product-card-actions">
            <button class="product-edit-btn">編集</button>
            <button class="product-delete-btn">削除</button>
          </div>
        `;

        // 編集ボタン
        card.querySelector('.product-edit-btn').addEventListener('click', () => {
          editProduct(product);
        });
        // 削除ボタン
        card.querySelector('.product-delete-btn').addEventListener('click', async () => {
          if (confirm('本当に削除しますか？')) {
            try {
              await deleteProduct(product.id);
              alert('商品が削除されました');
              await displayProducts();
            } catch (error) {
              console.error(error);
              showError('商品の削除に失敗しました');
            }
          }
        });

        cardWrapper.appendChild(card);
      });

      productList.appendChild(cardWrapper);
    }
  } catch (error) {
    console.error(error);
    showError('商品の表示に失敗しました');
  }
}



// 商品の編集フォーム表示関数
async function editProduct(product) {
  const user = auth.currentUser;
  if (!user) {
    alert('商品を編集するにはログインが必要です。');
    return;
  }
  // 消耗品リストの取得
  

  // 編集用のフォームを作成
  const editForm = document.createElement('form');
  editForm.innerHTML = `
    <input type="text" name="name" value="${product.name}" required />
    <input type="number" name="price" value="${product.price}" required />
    <input type="number" name="cost" value="${product.cost}" required />
    <input type="text" name="barcode" value="${product.barcode || ''}" />
    <input type="number" name="quantity" value="${product.quantity || 0}" required />
    <input type="number" name="size" value="${product.size || 1}" required />
  
   
    <button type="submit">更新</button>
    <button type="button" id="cancelEdit">キャンセル</button>
  `;

  // 編集フォームのイベントリスナー
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedData = {
      name: editForm.name.value,
      price: parseFloat(editForm.price.value),
      cost: parseFloat(editForm.cost.value),
      barcode: editForm.barcode.value,
      quantity: parseFloat(editForm.quantity.value),
      size: parseFloat(editForm.size.value),
      consumables: Array.from(editForm.querySelectorAll('input[name="consumable"]:checked')).map((checkbox) => checkbox.value),
    };

    // 入力値の検証
    if (
      isNaN(updatedData.price) ||
      isNaN(updatedData.cost) ||
      isNaN(updatedData.quantity) ||
      isNaN(updatedData.size)
    ) {
      showError('有効な数値を入力してください');
      return;
    }

    try {
      await updateProduct(product.id, updatedData);
      alert('商品が更新されました');
      await displayProducts();
    } catch (error) {
      console.error(error);
      showError('商品の更新に失敗しました');
    }
  });

  // キャンセルボタンのイベントリスナー
  editForm.querySelector('#cancelEdit').addEventListener('click', () => {
    editForm.remove();
    displayProducts();
  });

  // 既存の要素を編集フォームに置き換える
  const productList = document.getElementById('productList');
  productList.innerHTML = '';
  productList.appendChild(editForm);
}


// モーダル要素の取得（グローバルスコープで一度だけ取得）
const inventoryHistoryModal = document.getElementById('inventoryHistoryModal');
const closeInventoryHistoryModalBtn = document.getElementById('closeInventoryHistoryModal');

const overallInventoryHistoryModal = document.getElementById('overallInventoryHistoryModal');
const closeOverallInventoryHistoryModalBtn = document.getElementById('closeOverallInventoryHistoryModal');

// モーダルを閉じるイベントリスナー（グローバルスコープで一度だけ設定）
if (closeInventoryHistoryModalBtn) {
  closeInventoryHistoryModalBtn.addEventListener('click', () => {
    inventoryHistoryModal.style.display = 'none';
  });
}

if (closeOverallInventoryHistoryModalBtn) {
  closeOverallInventoryHistoryModalBtn.addEventListener('click', () => {
    overallInventoryHistoryModal.style.display = 'none';
  });
}

// モーダル外をクリックしたときにモーダルを閉じる
window.addEventListener('click', (event) => {
  if (overallInventoryHistoryModal && event.target === overallInventoryHistoryModal) {
    overallInventoryHistoryModal.style.display = 'none';
  }
  if (inventoryHistoryModal && event.target === inventoryHistoryModal) {
    inventoryHistoryModal.style.display = 'none';
  }
});


// **viewInventoryHistory 関数の宣言（グローバルスコープ）**
async function viewInventoryHistory(productId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('在庫変動履歴を表示するにはログインが必要です。');
      return;
    }
    // Firestoreから指定された商品IDの在庫変動履歴を取得
    const inventoryChanges = await getInventoryChangesByProductId(productId);

    // テーブルに履歴を表示
    const tbody = document.getElementById('inventoryHistoryTable').querySelector('tbody');
    tbody.innerHTML = ''; // 既存の内容をクリア

    inventoryChanges.forEach((change) => {
      // **修正点: 日付の取得方法を修正**
      const date = change.timestamp.toDate ? change.timestamp.toDate() : new Date(change.timestamp);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date.toLocaleString()}</td>
        <td>${change.changeAmount}</td>
        <td>${change.newQuantity}</td>
        <td>${change.userName || '不明'}</td>
        <td>${change.reason || 'なし'}</td>
      `;
      tbody.appendChild(row);
    });

    // モーダルを表示
    inventoryHistoryModal.style.display = 'block';
  } catch (error) {
    console.error('在庫変動履歴の取得に失敗しました:', error);
    showError('在庫変動履歴の取得に失敗しました');
  }
}

// **viewOverallInventoryHistory 関数の宣言（グローバルスコープ）**
async function viewOverallInventoryHistory(subcategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('在庫変動履歴を表示するにはログインが必要です。');
      return;
    }

    const inventoryChanges = await getOverallInventoryChangesBySubcategoryId(subcategoryId);

    // テーブルに履歴を表示
    const tbody = document.getElementById('overallInventoryHistoryTable').querySelector('tbody');
    tbody.innerHTML = ''; // 既存の内容をクリア

    inventoryChanges.forEach((change) => {
      const date = change.timestamp.toDate ? change.timestamp.toDate() : new Date(change.timestamp);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date.toLocaleString()}</td>
        <td>${change.changeAmount}</td>
        <td>${change.newQuantity}</td>
        <td>${change.userName || '不明'}</td>
        <td>${change.reason || 'なし'}</td>
      `;
      tbody.appendChild(row);
    });

    // モーダルを表示
    overallInventoryHistoryModal.style.display = 'block';

  } catch (error) {
    console.error('全体在庫変動履歴の取得に失敗しました:', error);
    showError('全体在庫変動履歴の取得に失敗しました');
  }
}

// 在庫管理セクションの商品一覧表示関数
export async function displayInventoryProducts() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('この操作を行うにはログインが必要です。');
      return;
    }
    const parentCategoryId = document.getElementById('inventoryParentCategorySelect').value;
    const subcategoryId = document.getElementById('inventorySubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);

    // 商品を名前内の数値でソート
    products.sort((a, b) => {
      const numA = extractNumberFromName(a.name);
      const numB = extractNumberFromName(b.name);
      return numA - numB;
    });

    const inventoryList = document.getElementById('inventoryList').querySelector('tbody');
    inventoryList.innerHTML = '';
    for (const product of products) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.name}</td>
        <td><input type="number" value="${product.quantity || 0}" data-product-id="${product.id}" class="inventory-quantity" /></td>
        <td>${product.price}</td>
        <td>${product.cost}</td>
        <td>${product.barcode}</td>
        <td>${product.size}</td>
        <td>
          <button class="update-inventory">更新</button>
        </td>
        <td>
          <button class="view-inventory-history" data-product-id="${product.id}">変動履歴を見る</button>
        </td>
      `;
      inventoryList.appendChild(row);
    }

   // 「変動履歴を見る」ボタンのイベントリスナーを追加
    document.querySelectorAll('.view-inventory-history').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const productId = e.target.dataset['productId'];
        await displayProductInventoryHistory(productId);
      });
    });

    // 在庫数量更新ボタンのイベントリスナー
    document.querySelectorAll('.update-inventory').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        const productId = row.querySelector('.inventory-quantity').dataset.productId;
        const newQuantity = parseFloat(row.querySelector('.inventory-quantity').value);
        try {
          const product = await getProductById(productId);
          const currentQuantity = product.quantity || 0;
          const quantityChange = newQuantity - currentQuantity;
          await updateProductQuantity(productId, quantityChange, '在庫数の手動更新');
          alert('在庫数が更新されました');
          await displayInventoryProducts();
        } catch (error) {
          console.error(error);
          showError('在庫数の更新に失敗しました');
        }
      });
    });

    // 数値を抽出する関数
    function extractNumberFromName(name) {
      const match = name.match(/\d+/);
      return match ? parseFloat(match[0]) : 0;
    }

  } catch (error) {
    console.error(error);
    showError('在庫商品の表示に失敗しました');
  }
}

/**
 * 個別商品の在庫数量を更新し、変動履歴を記録する関数
 * @param {string} productId - 更新する商品のID
 * @param {number} quantityChange - 在庫の変動量（増加は正、減少は負）
 * @param {string} reason - 在庫変動の理由
 */
export async function updateProductQuantityInProductInventoryChanges(productId, quantityChange, reason = '') {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('在庫を更新するにはログインが必要です。');
  }
  try {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) {
      throw new Error('商品が見つかりません');
    }
    const productData = productDoc.data();

    // 新しい在庫数量を計算
    const newQuantity = (productData.quantity || 0) + quantityChange;

    // 在庫数量を更新
    await updateDoc(productRef, { quantity: newQuantity });

    // 在庫変動履歴を `productInventoryChanges` コレクションに追加
    const productInventoryChange = {
      productId: productId,
      changeAmount: quantityChange,
      newQuantity: newQuantity,
      timestamp: serverTimestamp(),
      userId: user.uid,
      userName: user.displayName || user.email,
      reason: reason,
    };

    await addDoc(collection(db, 'productInventoryChanges'), productInventoryChange);
  } catch (error) {
    console.error('在庫数量の更新に失敗しました:', error);
    showError('在庫数量の更新に失敗しました。');
    throw error;
  }
}

/**
 * 個別商品の在庫変動履歴を取得する関数
 * @param {string} productId - 取得する商品のID
 * @returns {Array} - 在庫変動履歴の配列
 */
export async function getProductInventoryChangesByProductId(productId) {
  try {
    const q = query(
      collection(db, 'productInventoryChanges'),
      where('productId', '==', productId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);

    const changes = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // `timestamp` を Date オブジェクトに変換
      if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate();
      }
      changes.push({ id: doc.id, ...data });
    });
    return changes;
  } catch (error) {
    console.error('在庫変動履歴の取得に失敗しました:', error);
    showError('在庫変動履歴の取得に失敗しました。');
    throw error;
  }
}

/**
 * 個別商品の在庫履歴を表示する関数
 * @param {string} productId - 対象商品のID
 */
export async function displayProductInventoryHistory(productId) {
  try {
    const changes = await getProductInventoryChangesByProductId(productId);
    const historyTableBody = document.getElementById('productInventoryHistory').querySelector('tbody');
    historyTableBody.innerHTML = '';

    changes.forEach((change) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${change.changeAmount}</td>
        <td>${change.newQuantity}</td>
        <td>${change.timestamp.toLocaleString()}</td>
        <td>${change.userName}</td>
        <td>${change.reason}</td>
      `;
      historyTableBody.appendChild(row);
    });

    // モーダルを表示
    document.getElementById('productInventoryHistoryModal').style.display = 'block';
  } catch (error) {
    console.error('個別商品の在庫履歴の表示に失敗しました:', error);
    showError('個別商品の在庫履歴の表示に失敗しました。');
  }
}

// モーダルを閉じるボタンのイベントリスナー（要素が存在する場合のみ設定）
const closeProductInventoryHistoryModalBtn = document.getElementById('closeProductInventoryHistoryModal');
if (closeProductInventoryHistoryModalBtn) {
  closeProductInventoryHistoryModalBtn.addEventListener('click', () => {
    const modal = document.getElementById('productInventoryHistoryModal');
    if (modal) {
      modal.style.display = 'none';
    }
  });
}

// **修正後（DOMContentLoaded内に配置）**
document.addEventListener('DOMContentLoaded', () => {
  const updateOverallInventoryForm = document.getElementById('updateOverallInventoryForm');
  if (updateOverallInventoryForm) {
    updateOverallInventoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert('全体在庫を更新するにはログインが必要です。');
        return;
      }
      const subcategoryId = document.getElementById('overallInventorySubcategorySelect').value;
      const quantity = parseFloat(document.getElementById('overallInventoryQuantity').value);
      const reason = document.getElementById('overallInventoryReason').value || '在庫数の手動更新';
    
      try {
        await updateOverallInventory(subcategoryId, quantity, reason);
        alert('全体在庫が更新されました');
        await displayOverallInventory();
      } catch (error) {
        console.error(error);
        showError('全体在庫の更新に失敗しました');
      }
    });
  }
});


// 全体在庫を表示する関数をエクスポート
export async function displayOverallInventory() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('この操作を行うにはログインが必要です。');
      return;
    }
    const overallInventories = await getAllOverallInventories();
    const overallInventoryList = document.getElementById('overallInventoryList').querySelector('tbody');
    overallInventoryList.innerHTML = '';
    for (const inventory of overallInventories) {
      const subcategory = await getSubcategoryById(inventory.id);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${subcategory ? subcategory.name : '不明なサブカテゴリ'}</td>
        <td>${inventory.quantity || 0}</td>
        <td>
          <button class="view-overall-inventory-history" data-subcategory-id="${inventory.id}">変動履歴を見る</button>
          <button class="delete-overall-inventory" data-id="${inventory.id}">削除</button>
        </td>
      `;
      overallInventoryList.appendChild(row);
    }

    // **追加**: 「変動履歴を見る」ボタンのイベントリスナーを追加
    document.querySelectorAll('.view-overall-inventory-history').forEach((button) => {
      button.addEventListener('click', (e) => {
        const subcategoryId = e.target.dataset['subcategoryId'];
        viewOverallInventoryHistory(subcategoryId);
      });
    });

    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.delete-overall-inventory').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const inventoryId = e.target.dataset.id;
        if (confirm('この全体在庫を削除しますか？')) {
          try {
            await deleteOverallInventory(inventoryId);
            alert('全体在庫が削除されました');
            await displayOverallInventory();
          } catch (error) {
            console.error(error);
            showError('全体在庫の削除に失敗しました');
          }
        }
      });
    });
  } catch (error) {
    console.error(error);
    showError('全体在庫の表示に失敗しました');
  }
}

// 修正後：DOMContentLoaded イベント内で要素の存在を確認してからイベントリスナーを登録
document.addEventListener('DOMContentLoaded', () => {
  const addPricingRuleForm = document.getElementById('addPricingRuleForm');
  if (addPricingRuleForm) {
    addPricingRuleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subcategoryId = document.getElementById('pricingSubcategorySelect').value;
      const minQuantity = parseFloat(document.getElementById('minQuantity').value);
      const maxQuantity = parseFloat(document.getElementById('maxQuantity').value);
      const unitPrice = parseFloat(document.getElementById('unitPrice').value);

      if (minQuantity > maxQuantity) {
        showError('最小数量は最大数量以下である必要があります');
        return;
      }

      try {
        await addPricingRule(subcategoryId, minQuantity, maxQuantity, unitPrice);
        alert('単価ルールが追加されました');
        await displayPricingRules();
        addPricingRuleForm.reset();
      } catch (error) {
        console.error(error);
        showError('単価ルールの追加に失敗しました');
      }
    });
  }
});


// 単価ルールの表示
async function displayPricingRules() {
  try {
const user = auth.currentUser;
if (!user) {
  alert('この操作を行うにはログインが必要です。');
  return;
}
    const subcategoryId = document.getElementById('pricingSubcategorySelect').value;
    if (!subcategoryId) {
      // サブカテゴリが選択されていない場合は何もしない
      return;
    }
    const pricingRules = await getPricingRules(subcategoryId);
    const pricingRulesList = document.getElementById('pricingRulesList').querySelector('tbody');
    pricingRulesList.innerHTML = '';
    for (const rule of pricingRules) {
      const subcategory = await getSubcategoryById(rule.subcategoryId);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${subcategory ? subcategory.name : '不明なサブカテゴリ'}</td>
        <td>${rule.minQuantity}</td>
        <td>${rule.maxQuantity}</td>
        <td>${rule.unitPrice}</td>
        <td>
          <button class="edit-pricing-rule" data-id="${rule.id}">編集</button>
          <button class="delete-pricing-rule" data-id="${rule.id}">削除</button>
        </td>
      `;
      pricingRulesList.appendChild(row);
    }
    // **編集ボタンのイベントリスナーを追加**
    document.querySelectorAll('.edit-pricing-rule').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const ruleId = e.target.dataset.id;
        await openEditPricingRuleModal(ruleId);
      });
    });
    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.delete-pricing-rule').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const ruleId = e.target.dataset.id;
        if (confirm('本当に削除しますか？')) {
          try {
            await deletePricingRule(ruleId);
            alert('単価ルールが削除されました');
            await displayPricingRules();
          } catch (error) {
            console.error(error);
            showError('単価ルールの削除に失敗しました');
          }
        }
      });
    });
  } catch (error) {
    console.error(error);
    showError('単価ルールの表示に失敗しました');
  }
}

// **単価ルール編集用モーダルを開く関数を追加**
async function openEditPricingRuleModal(ruleId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('この操作を行うにはログインが必要です。');
      return;
    }
    const rule = await getPricingRuleById(ruleId);
    if (!rule) {
      showError('単価ルールが見つかりません');
      return;
    }
    // モーダル内のフォームに値をセット
    document.getElementById('editPricingRuleId').value = rule.id;
    document.getElementById('editMinQuantity').value  = rule.minQuantity;
    document.getElementById('editMaxQuantity').value  = rule.maxQuantity;
    document.getElementById('editUnitPrice').value   = rule.unitPrice;
    // モーダルを表示
    document.getElementById('editPricingRuleModal').style.display = 'block';
  } catch (error) {
    console.error(error);
    showError('単価ルールの取得に失敗しました');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // ── 初回：顧客一覧を表示 ──
  await displayCustomers();

  // ── 単価ルール編集フォーム送信 ──
  const editPricingRuleForm = document.getElementById('editPricingRuleForm');
  if (editPricingRuleForm) {
    editPricingRuleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ruleId      = document.getElementById('editPricingRuleId').value;
      const minQuantity = parseFloat(document.getElementById('editMinQuantity').value);
      const maxQuantity = parseFloat(document.getElementById('editMaxQuantity').value);
      const unitPrice   = parseFloat(document.getElementById('editUnitPrice').value);
      if (minQuantity > maxQuantity) {
        showError('最小数量は最大数量以下である必要があります');
        return;
      }
      try {
        await updatePricingRule(ruleId, { minQuantity, maxQuantity, unitPrice });
        alert('単価ルールが更新されました');
        document.getElementById('editPricingRuleModal').style.display = 'none';
        await displayPricingRules();
      } catch (error) {
        console.error(error);
        showError('単価ルールの更新に失敗しました');
      }
    });
  }

  // ── モーダル「×」で閉じる ──
  const closeEditConsumableUsageModalBtn = document.getElementById('closeEditConsumableUsageModal');
  if (closeEditConsumableUsageModalBtn) {
    closeEditConsumableUsageModalBtn.addEventListener('click', () => {
      document.getElementById('editConsumableUsageModal').style.display = 'none';
    });
  }

  // ── 単価設定セレクト（サブカテゴリ変更時リロード） ──
  const pricingSubcategorySelect = document.getElementById('pricingSubcategorySelect');
  if (pricingSubcategorySelect) {
    pricingSubcategorySelect.addEventListener('change', async () => {
      await displayPricingRules();
    });
  }

  // ── 顧客追加モーダルを開く／閉じる ──
  const openAddCustomerModalBtn = document.getElementById('openAddCustomerModal');
  const addEditCustomerModal    = document.getElementById('addEditCustomerModal');
  const closeCustomerModalBtn   = document.getElementById('closeCustomerModal');
  if (openAddCustomerModalBtn && addEditCustomerModal) {
    openAddCustomerModalBtn.addEventListener('click', () => {
      addEditCustomerModal.style.display = 'block';
    });
  }
  if (closeCustomerModalBtn && addEditCustomerModal) {
    closeCustomerModalBtn.addEventListener('click', () => {
      addEditCustomerModal.style.display = 'none';
    });
  }

  // ── 顧客保存フォーム送信 ──
  const customerForm = document.getElementById('customerForm');
  const customerPricingListBody = document.getElementById('customerPricingListBody');
  let customerPricingRules = [];
  if (customerForm) {
    customerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerId   = document.getElementById('customerId').value;
      const customerName = document.getElementById('customerName').value;
      const customerNote = document.getElementById('customerNote').value;
      const customerData = {
        name:        customerName,
        note:        customerNote,
        pricingRules: customerPricingRules
      };
      try {
        if (customerId) {
          await updateCustomer(customerId, customerData);
          alert('顧客情報が更新されました');
        } else {
          await createCustomer(customerData);
          alert('顧客が追加されました');
        }
        customerForm.reset();
        customerPricingListBody.innerHTML = '';
        customerPricingRules = [];
        await fetchCustomers();
        await displayCustomers();
        addEditCustomerModal.style.display = 'none';
      } catch (error) {
        console.error('顧客情報の保存に失敗しました:', error);
        showError('顧客情報の保存に失敗しました');
      }
    });
  }

  // ── 売上処理フォーム送信 ──
  const processSaleForm = document.getElementById('processSaleForm');
  if (processSaleForm) {
    processSaleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const barcode      = document.getElementById('saleBarcode').value;
      const quantitySold = parseFloat(document.getElementById('saleQuantity').value);
      if (!barcode || isNaN(quantitySold) || quantitySold <= 0) {
        showError('有効なバーコードと数量を入力してください');
        return;
      }
      try {
        await processSale(barcode, quantitySold);
        e.target.reset();
        alert('売上が登録されました');
        await displayInventoryProducts();
      } catch (error) {
        console.error('売上処理に失敗しました:', error);
        showError('売上の記録に失敗しました');
      }
    });
  }

  // ── 特別単価モーダル処理 ──
  const openCustomerPricingModalBtn = document.getElementById('openCustomerPricingModal');
  const customerPricingModal        = document.getElementById('customerPricingModal');
  const closeCustomerPricingModalBtn= document.getElementById('closeCustomerPricingModal');
  const customerPricingFormElm      = document.getElementById('customerPricingForm');
  if (openCustomerPricingModalBtn && customerPricingModal) {
    openCustomerPricingModalBtn.addEventListener('click', async () => {
      customerPricingModal.style.display = 'block';
      customerPricingFormElm.reset();
      // 親カテゴリを取得してセット
      const parentSel = document.getElementById('customerPricingParentCategory');
      parentSel.innerHTML = '<option value="">親カテゴリを選択</option>';
      const parents = await getParentCategories();
      parents.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        parentSel.appendChild(opt);
      });
      // サブカテゴリはクリア
      document.getElementById('customerPricingSubCategory')
              .innerHTML = '<option value="">サブカテゴリを選択</option>';
    });
  }
  // 親カテゴリ変更でサブカテゴリ更新
  const parentCatElem = document.getElementById('customerPricingParentCategory');
  if (parentCatElem) {
    parentCatElem.addEventListener('change', async e => {
      await updateSubcategorySelect(e.target.value, 'customerPricingSubCategory');
    });
  }
  // モーダルを閉じる
  if (closeCustomerPricingModalBtn && customerPricingModal) {
    closeCustomerPricingModalBtn.addEventListener('click', () => {
      customerPricingModal.style.display = 'none';
    });
  }
  // 特別単価「追加」ボタン
  if (customerPricingFormElm) {
    customerPricingFormElm.addEventListener('submit', e => {
      e.preventDefault();
      const p   = document.getElementById('customerPricingParentCategory');
      const s   = document.getElementById('customerPricingSubCategory');
      const min = parseFloat(document.getElementById('customerPricingMinQuantity').value);
      const max = parseFloat(document.getElementById('customerPricingMaxQuantity').value);
      const up  = parseFloat(document.getElementById('customerPricingUnitPrice').value);
      if (!p.value || !s.value || isNaN(min) || isNaN(max) || isNaN(up)) {
        alert('すべての項目を正しく入力してください');
        return;
      }
      const rule = {
        parentCategoryId:   p.value,
        parentCategoryName: p.selectedOptions[0].text,
        subcategoryId:      s.value,
        subcategoryName:    s.selectedOptions[0].text,
        minQuantity:        min,
        maxQuantity:        max,
        unitPrice:          up
      };
      customerPricingRules.push(rule);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${rule.parentCategoryName}</td>
        <td>${rule.subcategoryName}</td>
        <td>${rule.minQuantity}</td>
        <td>${rule.maxQuantity}</td>
        <td>${rule.unitPrice}</td>
        <td><button class="delete-pricing-rule-temp">削除</button></td>
      `;
      document.getElementById('customerPricingListBody').appendChild(tr);
      customerPricingFormElm.reset();
      customerPricingModal.style.display = 'none';
    });
    // 特別単価「削除」ボタン
    document.getElementById('customerPricingListBody').addEventListener('click', e => {
      if (e.target.classList.contains('delete-pricing-rule-temp')) {
        const idx = e.target.closest('tr').rowIndex - 1;
        customerPricingRules.splice(idx, 1);
        e.target.closest('tr').remove();
      }
    });
  }
});

// ── 売上手動追加ボタンはコールバック外で登録 ──
const manualAddTransactionButton = document.getElementById('manualAddTransactionButton');
if (manualAddTransactionButton) {
  manualAddTransactionButton.addEventListener('click', async () => {
    document.getElementById('manualAddTransactionForm').style.display = 'block';
    await updatePaymentMethodSelect();
  });
}
const cancelAddTransactionButton = document.getElementById('cancelAddTransaction');
if (cancelAddTransactionButton) {
  cancelAddTransactionButton.addEventListener('click', () => {
    document.getElementById('manualAddTransactionForm').style.display = 'none';
  });
}

