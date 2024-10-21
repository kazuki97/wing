// eventListeners.js

// インポート
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
  addProduct,
  getProducts,
  getProductById,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
  getAllProducts,
} from './products.js';

import {
  updateOverallInventory,
  getOverallInventory,
  getAllOverallInventories,
  deleteOverallInventory,
} from './inventoryManagement.js';

import {
  addPricingRule,
  getPricingRules,
  deletePricingRule,
  getUnitPrice,
} from './pricing.js';

import {
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  addTransaction,
} from './transactions.js';

import {
  getPaymentMethods,
} from './paymentMethods.js';

import { getConsumables, getConsumableUsage, deleteConsumable } from './consumables.js'; // 消耗品関連の関数をインポート

async function updatePricingParentCategorySelect() {
  try {
    console.log('updatePricingParentCategorySelect 開始');
    const parentCategories = await getParentCategories();
    const select = document.getElementById('pricingParentCategorySelect');
    if (select) {
      select.innerHTML = '<option value="">親カテゴリを選択</option>';
      parentCategories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
      });
    } else {
      console.error('pricingParentCategorySelect が見つかりません');
    }
    console.log('updatePricingParentCategorySelect 終了');
  } catch (error) {
    console.error('updatePricingParentCategorySelect 中にエラーが発生しました:', error);
    showError('親カテゴリの取得に失敗しました');
  }
}

// エラーメッセージ表示関数
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// showSection 関数をここに追加
function showSection(sectionId) {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach((section) => {
    if (section.id === sectionId) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });
  // スクロールをトップに戻す
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 支払い方法セレクトボックスの更新関数
async function updatePaymentMethodSelect() {
  try {
    console.log('updatePaymentMethodSelect 開始');
    const paymentMethods = await getPaymentMethods();
    const paymentMethodSelect = document.getElementById('transactionPaymentMethod');
    if (paymentMethodSelect) {
      paymentMethodSelect.innerHTML = '<option value="">支払い方法を選択</option>';
      paymentMethods.forEach((method) => {
        const option = document.createElement('option');
        option.value = method.id;
        option.textContent = method.name;
        paymentMethodSelect.appendChild(option);
      });
    } else {
      console.error('支払い方法セレクトボックスが見つかりません');
    }
    console.log('updatePaymentMethodSelect 終了');
  } catch (error) {
    console.error('支払い方法の取得に失敗しました:', error);
  }
}


// 消耗品選択リストの更新関数
async function updateConsumableCheckboxes() {
  try {
    console.log('updateConsumableCheckboxes 開始');
    const consumables = await getConsumables();
    const consumableCheckboxesDiv = document.getElementById('consumableCheckboxes');
    if (consumableCheckboxesDiv) {
      consumableCheckboxesDiv.innerHTML = '';

      consumables.forEach((consumable) => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `consumable-${consumable.id}`;
        checkbox.value = consumable.id;
        checkbox.name = 'consumable';

        const label = document.createElement('label');
        label.htmlFor = `consumable-${consumable.id}`;
        label.textContent = consumable.name;

        const checkboxContainer = document.createElement('div');
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        consumableCheckboxesDiv.appendChild(checkboxContainer);
      });
    } else {
      console.error('消耗品チェックボックスのコンテナが見つかりません');
    }
    console.log('updateConsumableCheckboxes 終了');
  } catch (error) {
    console.error('消耗品リストの取得に失敗しました:', error);
  }
}

// 消耗品使用量の初期化処理
async function initializeConsumableUsage() {
  try {
    console.log('initializeConsumableUsage 開始');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 年と月の選択肢をセット
    const yearSelect = document.getElementById('usageYear');
    const monthSelect = document.getElementById('usageMonth');

    if (yearSelect && monthSelect) {
      for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      }

      for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
      }

      // フィルタボタンのイベントリスナーを設定
      const filterUsageButton = document.getElementById('filterUsage');
      if (filterUsageButton) {
        filterUsageButton.addEventListener('click', async () => {
          const year = parseInt(yearSelect.value);
          const month = parseInt(monthSelect.value);
          await displayConsumableUsage(year, month);
        });
      } else {
        console.error('消耗品使用量のフィルタボタンが見つかりません');
      }

      // 初期表示として現在の年と月のデータを表示
      await displayConsumableUsage(currentYear, currentMonth);
    } else {
      console.error('年または月のセレクトボックスが見つかりません');
    }
    console.log('initializeConsumableUsage 終了');
  } catch (error) {
    console.error('消耗品使用量の初期化に失敗しました:', error);
  }
}

// 消耗品使用量の表示
async function displayConsumableUsage(year, month) {
  try {
    console.log('displayConsumableUsage 開始');
    const consumableUsageList = await getConsumableUsage(year, month); // 消耗品使用量を取得
    const consumables = await getConsumables(); // 全ての消耗品を取得
    const usageTableBody = document.getElementById('consumableUsageList').querySelector('tbody');
    if (usageTableBody) {
      usageTableBody.innerHTML = '';

      // 消耗品使用量を集約
      const usageMap = {};

      consumableUsageList.forEach((usage) => {
        if (!usageMap[usage.consumableId]) {
          usageMap[usage.consumableId] = {
            quantityUsed: 0,
            timestamp: usage.timestamp,
          };
        }
        usageMap[usage.consumableId].quantityUsed += usage.quantityUsed;
      });

      // 集約した使用量を表示
      Object.keys(usageMap).forEach((consumableId) => {
        const consumable = consumables.find(c => c.id === consumableId);
        const consumableName = consumable ? consumable.name : '不明な消耗品';
        const usage = usageMap[consumableId];

        const row = document.createElement('tr');
        const date = new Date(usage.timestamp);

        // 年と月だけを表示するフォーマット
        const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}`;

        row.innerHTML = `
          <td>${consumableName}</td>
          <td>${usage.quantityUsed}</td>
          <td>${formattedDate}</td>
        `;
        usageTableBody.appendChild(row);
      });
    } else {
      console.error('消耗品使用量のテーブルボディが見つかりません');
    }
    console.log('displayConsumableUsage 終了');
  } catch (error) {
    console.error('消耗品使用量の表示に失敗しました:', error);
  }
}

async function addTransactionEditListeners() {
  const editButtons = document.querySelectorAll('.edit-transaction');
  editButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const transactionId = e.target.dataset.id;
      const transaction = await getTransactionById(transactionId);
      if (transaction) {
        // 商品情報を取得
        const product = await getProductById(transaction.items[0].productId);
        
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

        // 編集フォームに商品情報と現在の取引データをセット
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editTransactionTimestamp').value = new Date(transaction.timestamp).toISOString().slice(0, 16);
        document.getElementById('editTransactionProductName').value = product.name;
        document.getElementById('editTransactionQuantity').value = transaction.items[0].quantity;
        document.getElementById('editTransactionUnitPrice').value = product.price; // 商品の単価
        document.getElementById('editTransactionCost').value = product.cost; // 商品の原価
        document.getElementById('editTransactionSize').value = product.size; // 商品のサイズ
        paymentMethodSelect.value = transaction.paymentMethodId || '';

        // 編集フォームの表示
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
    
    // 取引IDを取得
    const transactionId = document.getElementById('editTransactionId').value;

    // フォームからデータを取得
    const quantity = parseFloat(document.getElementById('editTransactionQuantity').value);
    const unitPrice = parseFloat(document.getElementById('editTransactionUnitPrice').value);
    const cost = parseFloat(document.getElementById('editTransactionCost').value);
    const size = parseFloat(document.getElementById('editTransactionSize').value); // サイズを取得
    const subtotal = quantity * unitPrice * size; // 小計計算 (サイズを考慮)
    const profit = subtotal - (quantity * cost * size); // 利益計算 (サイズを考慮)

    const updatedData = {
      timestamp: new Date(document.getElementById('editTransactionTimestamp').value).toISOString(), // 日時
      items: [
        {
          productName: document.getElementById('editTransactionProductName').value, // 商品名
          quantity: quantity, // 数量
          unitPrice: unitPrice, // 販売単価
          cost: cost, // 原価
          size: size, // サイズ
          subtotal: subtotal, // 小計
          profit: profit, // 利益
        }
      ],
      totalAmount: subtotal, // 合計金額
      paymentMethodId: document.getElementById('editTransactionPaymentMethod').value, // 支払い方法
    };

    try {
      // 取引データを更新
      await updateTransaction(transactionId, updatedData);
      console.log('取引が更新されました:', updatedData); // 更新されたデータを確認するためのログ
      alert('取引が更新されました');

      // 編集フォームを非表示にし、フォームをリセット
      document.getElementById('editTransactionFormContainer').style.display = 'none';
      editTransactionForm.reset();

      // 最新のデータでリストを再描画
      await displayTransactions();
    } catch (error) {
      console.error(error);
      showError('取引の更新に失敗しました');
    }
  });
}

// 売上の手動追加フォームのsubmitイベントリスナー
document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 手動追加商品の情報を取得
  const productName = document.getElementById('transactionProductName').value; // 商品名を取得
  const productPrice = parseFloat(document.getElementById('transactionProductPrice').value); // 販売単価を取得
  const productQuantity = parseFloat(document.getElementById('transactionProductQuantity').value); // 数量を取得
  const productCost = parseFloat(document.getElementById('transactionProductCost').value); // 原価を取得
  const productSize = parseFloat(document.getElementById('transactionSize').value); // サイズを取得
  const paymentMethodId = document.getElementById('transactionPaymentMethod').value;

  // 自動計算する項目
  const totalAmount = productPrice * productQuantity * productSize; // 売上金額
  const profit = totalAmount - (productCost * productQuantity * productSize); // 利益計算

  // 売上データを生成
  const transactionData = {
    items: [
      {
        productName,
        unitPrice: productPrice,
        quantity: productQuantity,
        size: productSize, // サイズを追加
        totalAmount,
        cost: productCost,
        profit,
      }
    ],
    totalAmount,
    paymentMethodId,
    timestamp: new Date().toISOString(),
  };

  try {
    await addTransaction(transactionData);
    alert('売上が追加されました');
    document.getElementById('manualAddTransactionForm').style.display = 'none'; // フォームを非表示にする
    e.target.reset(); // フォームをリセット
    await displayTransactions(); // 最新の売上リストを再表示
  } catch (error) {
    console.error('売上の追加に失敗しました:', error);
    showError('売上の追加に失敗しました');
  }
});

// 商品追加フォームのイベントリスナー
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();

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

  // 消耗品の選択を取得
  const selectedConsumables = Array.from(document.querySelectorAll('input[name="consumable"]:checked')).map(
    (checkbox) => checkbox.value
  );
  productData.consumables = selectedConsumables; // 商品に関連付ける消耗品のIDリスト

  try {
    await addProduct(productData);
    alert('商品が追加されました');
    document.getElementById('addProductForm').reset(); // フォームをリセット
    await displayProducts(); // 商品一覧を再表示
  } catch (error) {
    console.error('商品の追加に失敗しました:', error);
    showError('商品の追加に失敗しました');
  }

  console.log('商品追加フォームの送信イベント終了');
});

// 消耗品リストを表示する関数
async function displayConsumables() {
  try {
    console.log('displayConsumables 開始');
    const consumablesList = await getConsumables();
    const consumableTableBody = document.getElementById('consumableList').querySelector('tbody');

    if (consumableTableBody) {
      consumableTableBody.innerHTML = '';

      consumablesList.forEach((consumable) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${consumable.name}</td>
          <td>¥${consumable.cost}</td>
          <td><button class="delete-consumable" data-id="${consumable.id}">削除</button></td>
        `;
        consumableTableBody.appendChild(row);
      });

      // 削除ボタンのイベントリスナーを設定
      document.querySelectorAll('.delete-consumable').forEach((button) => {
        button.addEventListener('click', async (e) => {
          const consumableId = e.target.dataset.id;
          await deleteConsumable(consumableId);
          alert('消耗品が削除されました');
          await displayConsumables(); // 最新の消耗品リストを再表示
        });
      });
    } else {
      console.error('consumableList が見つかりません');
    }
    console.log('displayConsumables 終了');
  } catch (error) {
    console.error('displayConsumables 中にエラーが発生しました:', error);
    showError('消耗品の表示に失敗しました');
  }
}

// 売上管理セクションの取引データ表示関数
export async function  displayTransactions(filter = {}) {
  try {
    console.log('displayTransactions 開始');
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

    const transactionList = document.getElementById('transactionList').querySelector('tbody');
    if (transactionList) {
      transactionList.innerHTML = '';
      for (const transaction of transactions) {
        const row = document.createElement('tr');
        if (transaction.isReturned) {
          row.style.color = 'red';
        }

        const productNames = transaction.items.map((item) => item.productName).join(', ');
        const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
        const paymentMethodName = paymentMethodMap[transaction.paymentMethodId] || '不明な支払い方法';

        // タイムスタンプを適切にフォーマット
        let formattedTimestamp = '日時情報なし';
        if (transaction.timestamp) {
          const date = new Date(transaction.timestamp);
          if (!isNaN(date.getTime())) {
            formattedTimestamp = date.toLocaleString('ja-JP');
          }
        }

        row.innerHTML = `
          <td>${transaction.id}</td>
          <td>${formattedTimestamp}</td>
          <td>${paymentMethodName}</td>
          <td>${productNames || '手動追加'}</td>
          <td>${totalQuantity || '-'}</td>
          <td>¥${transaction.totalAmount}</td>
          <td>¥${transaction.feeAmount || 0}</td>
          <td>¥${transaction.items[0].cost || 0}</td>
          <td>¥${transaction.netAmount - transaction.items[0].cost || 0}</td>
          <td>
            <button class="view-transaction-details" data-id="${transaction.id}">詳細</button>
            <button class="edit-transaction" data-id="${transaction.id}">編集</button>
          </td>
        `;

        transactionList.appendChild(row);
      }

      // 詳細ボタンと編集ボタンのイベントリスナーの追加
      document.querySelectorAll('.view-transaction-details').forEach((button) => {
        button.addEventListener('click', async (e) => {
          const transactionId = e.target.dataset.id;
          await displayTransactionDetails(transactionId);
        });
      });
      await addTransactionEditListeners();
    } else {
      console.error('transactionList が見つかりません');
    }
    console.log('displayTransactions 終了');
  } catch (error) {
    console.error('displayTransactions 中にエラーが発生しました:', error);
    showError('取引の表示に失敗しました');
  }
}


// 売上管理セクションの取引詳細を表示する関数
async function displayTransactionDetails(transactionId) {
  try {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      showError('取引が見つかりません');
      return;
    }

    // 詳細情報を表示するための要素を取得
    const transactionDetails = document.getElementById('transactionDetails');
    document.getElementById('detailTransactionId').textContent = transaction.id;

    // タイムスタンプのパース（シンプルな処理を採用）
    let timestampText = '日時情報なし';
    if (transaction.timestamp) {
      const date = new Date(transaction.timestamp); // タイムスタンプを直接使用
      if (!isNaN(date)) {
        timestampText = date.toLocaleString();
      }
    }
    document.getElementById('detailTimestamp').textContent = timestampText;

    document.getElementById('detailPaymentMethod').textContent = transaction.paymentMethodName || '情報なし';
    document.getElementById('detailFeeAmount').textContent = transaction.feeAmount !== undefined ? `¥${transaction.feeAmount}` : '¥0';
    document.getElementById('detailNetAmount').textContent = transaction.netAmount !== undefined ? `¥${transaction.netAmount}` : '¥0';
    document.getElementById('detailTotalCost').textContent = transaction.cost !== undefined ? `¥${transaction.cost}` : '¥0';
    document.getElementById('detailTotalProfit').textContent = transaction.profit !== undefined ? `¥${transaction.profit}` : '¥0';
    
    const detailProductList = document.getElementById('detailProductList');
    detailProductList.innerHTML = '';

    if (transaction.items && transaction.items.length > 0) {
      for (const item of transaction.items) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>¥${item.unitPrice !== undefined ? item.unitPrice : '情報なし'}</td>
          <td>¥${item.subtotal !== undefined ? item.subtotal : '情報なし'}</td>
          <td>¥${item.cost !== undefined ? item.cost : '情報なし'}</td>
          <td>¥${item.profit !== undefined ? item.profit : '情報なし'}</td>
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

    // 詳細表示エリアを表示
    transactionDetails.style.display = 'block';
  } catch (error) {
    console.error('取引の詳細表示に失敗しました:', error);
    showError('取引の詳細を表示できませんでした');
  }
}

const cancelEditTransactionButton = document.getElementById('cancelEditTransaction');
if (cancelEditTransactionButton) {
  cancelEditTransactionButton.addEventListener('click', () => {
    document.getElementById('editTransactionFormContainer').style.display = 'none';
    editTransactionForm.reset();
  });
}

const closeTransactionDetailsButton = document.getElementById('closeTransactionDetails');
if (closeTransactionDetailsButton) {
  closeTransactionDetailsButton.addEventListener('click', () => {
    document.getElementById('transactionDetails').style.display = 'none';
  });
}

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

async function handleDeleteTransaction(transactionId) {
  if (confirm('この取引を削除しますか？')) {
    try {
      // 取引を取得
      const transaction = await getTransactionById(transactionId);
      console.log('削除する取引:', transaction); // デバッグ: 取引内容を確認

      if (transaction && transaction.items && transaction.items.length > 0) {
        for (const item of transaction.items) {
          const productId = item.productId;
          const quantity = item.quantity;
          const size = item.size;
          const requiredQuantity = quantity * size;

          // 商品の取得
          const product = await getProductById(productId);
          if (!product) {
            console.error(`商品ID ${productId} が見つかりませんでした`);
            showError('商品が見つかりませんでした');
            continue; // 見つからなかった商品はスキップします
          }
          console.log('取得した商品:', product); // デバッグ: 商品情報を確認

          const updatedQuantity = product.quantity + quantity;
          await updateProduct(productId, { quantity: updatedQuantity });
          console.log(`商品ID ${productId} の在庫が更新されました: ${updatedQuantity}`); // デバッグ: 更新された在庫数量

          // サブカテゴリIDの取得と全体在庫の更新
          const subcategoryId = product.subcategoryId;
          if (!subcategoryId) {
            console.error(`商品 ${product.name} のサブカテゴリIDが見つかりません`);
            showError('サブカテゴリが見つかりませんでした');
            continue; // サブカテゴリが見つからなかった場合もスキップします
          }
          console.log(`サブカテゴリID: ${subcategoryId}`); // デバッグ: サブカテゴリIDの確認

          // サブカテゴリの在庫を更新
          await updateOverallInventory(subcategoryId, requiredQuantity);
          console.log(`サブカテゴリID ${subcategoryId} の全体在庫が更新されました: +${requiredQuantity}`); // デバッグ: 全体在庫の更新を確認
        }
      }

      // 取引を削除
      await deleteTransaction(transactionId);
      alert('取引が削除されました');
      document.getElementById('transactionDetails').style.display = 'none';
      await displayTransactions(); // 売上管理セクションを更新
      await displayOverallInventory(); // 全体在庫リストを再描画
      await displayInventoryProducts(); // 在庫管理リストを再描画
    } catch (error) {
      console.error(error);
      showError('取引の削除に失敗しました');
    }
  }
}

// 初期化関数ごとにログを追加
async function updateAllParentCategorySelects() {
  try {
    console.log('updateAllParentCategorySelects 開始');
    const parentCategories = await getParentCategories();
    // 親カテゴリセレクトボックスのID一覧
    const selectIds = [
      'subcategoryParentCategorySelect',
      'productParentCategorySelect',
      'filterParentCategorySelect',
      'inventoryParentCategorySelect',
      'overallInventoryParentCategorySelect',
      'pricingParentCategorySelect',
    ];

    selectIds.forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        const selectedValue = select.value || '';
        select.innerHTML = '<option value="">親カテゴリを選択</option>';

        parentCategories.forEach((category) => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          select.appendChild(option);
        });

        // 以前選択されていた値を再設定
        if (selectedValue) {
          select.value = selectedValue;
        }
      } else {
        console.error(`セレクトボックスが見つかりません: ${id}`);
      }
    });

    // サブカテゴリセレクトボックスの更新
    await updateSubcategorySelects();
    console.log('updateAllParentCategorySelects 終了');
  } catch (error) {
    console.error('updateAllParentCategorySelects 中にエラーが発生しました:', error);
    showError('親カテゴリの取得に失敗しました');
  }
}

// サブカテゴリセレクトボックスの更新
async function updateSubcategorySelects() {
  const parentCategorySelectIds = {
    productParentCategorySelect: 'productSubcategorySelect',
    filterParentCategorySelect: 'filterSubcategorySelect',
    inventoryParentCategorySelect: 'inventorySubcategorySelect',
    overallInventoryParentCategorySelect: 'overallInventorySubcategorySelect',
    pricingParentCategorySelect: 'pricingSubcategorySelect',
  };

  for (const parentSelectId in parentCategorySelectIds) {
    const parentCategoryId = document.getElementById(parentSelectId).value;
    const subcategorySelectId = parentCategorySelectIds[parentSelectId];
    await updateSubcategorySelect(parentCategoryId, subcategorySelectId);
  }
}

// サブカテゴリセレクトボックスの個別更新関数
async function updateSubcategorySelect(parentCategoryId, subcategorySelectId) {
  try {
    const select = document.getElementById(subcategorySelectId);
    select.innerHTML = '<option value="">サブカテゴリを選択</option>';
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
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの取得に失敗しました');
  }
}

// 各親カテゴリセレクトボックスのイベントリスナー
['productParentCategorySelect', 'filterParentCategorySelect', 'inventoryParentCategorySelect', 'overallInventoryParentCategorySelect', 'pricingParentCategorySelect'].forEach((id) => {
  document.getElementById(id).addEventListener('change', async () => {
    const parentCategoryId = document.getElementById(id).value;
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
});

// サブカテゴリセレクトボックスのイベントリスナー
['productSubcategorySelect', 'filterSubcategorySelect', 'inventorySubcategorySelect', 'overallInventorySubcategorySelect', 'pricingSubcategorySelect'].forEach((id) => {
  document.getElementById(id).addEventListener('change', async () => {
    if (id === 'inventorySubcategorySelect') {
      await displayInventoryProducts();
    } else if (id === 'filterSubcategorySelect') {
      await displayProducts();
    } else if (id === 'pricingSubcategorySelect') {
      await displayPricingRules();
    }
  });
});

// 親カテゴリ一覧の表示
async function displayParentCategories() {
  try {
    console.log('displayParentCategories 開始');
    const parentCategories = await getParentCategories();
    const parentCategoryList = document.getElementById('parentCategoryList');

    if (parentCategoryList) {
      // リストをクリアする
      parentCategoryList.innerHTML = '';

      for (const category of parentCategories) {
        const listItem = createParentCategoryListItem(category);
        parentCategoryList.appendChild(listItem);
      }
    } else {
      console.error('parentCategoryList が見つかりません');
    }
    console.log('displayParentCategories 終了');
  } catch (error) {
    console.error('displayParentCategories 中にエラーが発生しました:', error);
    showError('親カテゴリの表示に失敗しました');
  }
}

// 新規親カテゴリの追加処理
async function addNewParentCategory(categoryName) {
  try {
    const newCategory = await addParentCategory(categoryName);
    const parentCategoryList = document.getElementById('parentCategoryList');
    const listItem = createParentCategoryListItem(newCategory);
    parentCategoryList.appendChild(listItem);
    alert('親カテゴリが追加されました');
  } catch (error) {
    console.error('親カテゴリの追加に失敗しました', error);
    showError('親カテゴリの追加に失敗しました');
  }
}

// 親カテゴリのリストアイテムを作成する関数
function createParentCategoryListItem(category) {
  const listItem = document.createElement('li');
  listItem.textContent = category.name;

  // 編集ボタン
  const editButton = document.createElement('button');
  editButton.textContent = '編集';
  editButton.addEventListener('click', () => {
    const newName = prompt('新しいカテゴリ名を入力してください', category.name);
    if (newName) {
      updateParentCategory(category.id, newName)
        .then(async () => {
          alert('親カテゴリが更新されました');
          listItem.textContent = newName;
          listItem.appendChild(editButton);
          listItem.appendChild(deleteButton);
          const subcategoryList = await displaySubcategories(category.id);
          listItem.appendChild(subcategoryList);
          await updateAllParentCategorySelects();
        })
        .catch((error) => {
          console.error(error);
          showError('親カテゴリの更新に失敗しました');
        });
    }
  });

  // 削除ボタン
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '削除';
  deleteButton.addEventListener('click', () => {
    if (confirm('本当に削除しますか？この親カテゴリに属するサブカテゴリも削除されます。')) {
      deleteParentCategory(category.id)
        .then(() => {
          alert('親カテゴリが削除されました');
          listItem.remove();
          updateAllParentCategorySelects();
        })
        .catch((error) => {
          console.error(error);
          showError('親カテゴリの削除に失敗しました');
        });
    }
  });

  listItem.appendChild(editButton);
  listItem.appendChild(deleteButton);

  // サブカテゴリの表示
  displaySubcategories(category.id).then((subcategoryList) => {
    listItem.appendChild(subcategoryList);
  });

  return listItem;
}

// サブカテゴリの表示
async function displaySubcategories(parentCategoryId) {
  try {
    const subcategories = await getSubcategories(parentCategoryId);
    const subcategoryList = document.createElement('ul');
    for (const subcategory of subcategories) {
      const listItem = document.createElement('li');
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
      listItem.appendChild(editButton);
      listItem.appendChild(deleteButton);
      subcategoryList.appendChild(listItem);
    }
    return subcategoryList;
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの表示に失敗しました');
    return document.createElement('ul');
  }
}

// 商品追加フォームのイベントリスナー
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('商品追加フォームの送信イベント開始');

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
      // フォームをリセット
      document.getElementById('addProductForm').reset();
      alert('商品が追加されました');
      await displayProducts();
    } catch (error) {
      console.error(error);
      showError('商品の追加に失敗しました');
    }
  });

async function displayProducts() {
  try {
    console.log('displayProducts 開始');
    const parentCategoryId = document.getElementById('filterParentCategorySelect').value;
    const subcategoryId = document.getElementById('filterSubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);
    const consumablesList = await getConsumables(); // 消耗品リストを取得
    const productList = document.getElementById('productList');

    if (productList) {
      productList.innerHTML = '';

      products.forEach((product) => {
        // 商品に関連付けられた消耗品の名前を取得
        const consumableNames = product.consumables
          ? product.consumables.map(consumableId => {
              const consumable = consumablesList.find(c => c.id === consumableId);
              return consumable ? consumable.name : '不明な消耗品';
            }).join(', ')
          : 'なし';

        // 商品情報と消耗品情報を表示
        const listItem = document.createElement('li');
        listItem.innerHTML = `
          <strong>商品名:</strong> ${product.name}, <strong>数量:</strong> ${product.quantity || 0}, 
          <strong>価格:</strong> ${product.price}, <strong>原価:</strong> ${product.cost}, 
          <strong>バーコード:</strong> ${product.barcode}, <strong>サイズ:</strong> ${product.size}, 
          <strong>使用する消耗品:</strong> ${consumableNames}
        `;

        // 編集ボタン
        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.addEventListener('click', () => {
          editProduct(product);
        });

        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', async () => {
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

        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);
        productList.appendChild(listItem);
      });
    } else {
      console.error('productList が見つかりません');
    }
    console.log('displayProducts 終了');
  } catch (error) {
    console.error('displayProducts 中にエラーが発生しました:', error);
    showError('商品の表示に失敗しました');
  }
}

// 商品の編集フォーム表示関数
async function editProduct(product) {
  // 消耗品リストの取得
  const consumables = await getConsumables();

  // 編集用のフォームを作成
  const editForm = document.createElement('form');
  editForm.innerHTML = `
    <input type="text" name="name" value="${product.name}" required />
    <input type="number" name="price" value="${product.price}" required />
    <input type="number" name="cost" value="${product.cost}" required />
    <input type="text" name="barcode" value="${product.barcode}" />
    <input type="number" name="quantity" value="${product.quantity}" required />
    <input type="number" name="size" value="${product.size}" required />
    <div id="editConsumables">
      <label>使用する消耗品:</label>
      ${consumables.map(consumable => `
        <div>
          <input type="checkbox" name="consumable" value="${consumable.id}" id="edit-consumable-${consumable.id}" 
          ${product.consumables && product.consumables.includes(consumable.id) ? 'checked' : ''} />
          <label for="edit-consumable-${consumable.id}">${consumable.name}</label>
        </div>
      `).join('')}
    </div>
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

// 在庫管理セクションの商品一覧表示関数
export async function displayInventoryProducts() {
  try {
    console.log('displayInventoryProducts 開始');
    const parentCategoryId = document.getElementById('inventoryParentCategorySelect').value;
    const subcategoryId = document.getElementById('inventorySubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);
    const inventoryList = document.getElementById('inventoryList').querySelector('tbody');

    if (inventoryList) {
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
          <td><button class="update-inventory">更新</button></td>
        `;
        inventoryList.appendChild(row);
      }
      // 在庫数更新ボタンのイベントリスナー
      document.querySelectorAll('.update-inventory').forEach((button) => {
        button.addEventListener('click', async (e) => {
          const row = e.target.closest('tr');
          const productId = row.querySelector('.inventory-quantity').dataset.productId;
          const quantity = parseFloat(row.querySelector('.inventory-quantity').value);
          try {
            await updateProductQuantity(productId, quantity);
            alert('在庫数が更新されました');
            await displayInventoryProducts();
          } catch (error) {
            console.error(error);
            showError('在庫数の更新に失敗しました');
          }
        });
      });
    } else {
      console.error('inventoryList が見つかりません');
    }
    console.log('displayInventoryProducts 終了');
  } catch (error) {
    console.error('displayInventoryProducts 中にエラーが発生しました:', error);
    showError('在庫情報の表示に失敗しました');
  }
}

// 販売完了後に全体在庫を更新する関数
// 修正しました: 販売完了後に全体在庫を減少させる関数を追加
async function updateOverallInventoryAfterSale(productId, quantitySold) {
  try {
    await updateOverallInventory(productId, -quantitySold);
  } catch (error) {
    console.error('全体在庫の更新エラー:', error);
    showError('全体在庫の更新に失敗しました');
  }
}

// 全体在庫更新フォームのイベントリスナー
document
  .getElementById('updateOverallInventoryForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const subcategoryId = document.getElementById('overallInventorySubcategorySelect').value;
    const quantity = parseFloat(document.getElementById('overallInventoryQuantity').value);
    try {
      await updateOverallInventory(subcategoryId, quantity);
      alert('全体在庫が更新されました');
      await displayOverallInventory();
    } catch (error) {
      console.error(error);
      showError('全体在庫の更新に失敗しました');
    }
  });

// 全体在庫の表示関数を修正して削除ボタンを追加
// 修正しました: 全体在庫の表示関数に削除ボタンを追加
export async function displayOverallInventory() {
  try {
    console.log('displayOverallInventory 開始');
    const overallInventories = await getAllOverallInventories();
    const overallInventoryList = document.getElementById('overallInventoryList').querySelector('tbody');

    if (overallInventoryList) {
      overallInventoryList.innerHTML = '';
      for (const inventory of overallInventories) {
        const subcategory = await getSubcategoryById(inventory.id);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${subcategory ? subcategory.name : '不明なサブカテゴリ'}</td>
          <td>${inventory.quantity || 0}</td>
          <td><button class="delete-overall-inventory" data-id="${inventory.id}">削除</button></td>
        `;
        overallInventoryList.appendChild(row);
      }

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
    } else {
      console.error('overallInventoryList が見つかりません');
    }
    console.log('displayOverallInventory 終了');
  } catch (error) {
    console.error('displayOverallInventory 中にエラーが発生しました:', error);
    showError('全体在庫の表示に失敗しました');
  }
}

// 単価ルール追加フォームのイベントリスナー
document
  .getElementById('addPricingRuleForm')
  .addEventListener('submit', async (e) => {
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
      document.getElementById('addPricingRuleForm').reset();
    } catch (error) {
      console.error(error);
      showError('単価ルールの追加に失敗しました');
    }
  });

// 単価ルールの表示
async function displayPricingRules() {
  try {
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
        <td><button class="delete-pricing-rule" data-id="${rule.id}">削除</button></td>
      `;
      pricingRulesList.appendChild(row);
    }
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

// 単価設定セクションのサブカテゴリセレクトボックスのイベントリスナー
document.getElementById('pricingSubcategorySelect').addEventListener('change', async () => {
  await displayPricingRules();
});

// すべての親カテゴリのセレクトボックスを更新する関数
async function updateAllParentCategorySelectOptions() {
  try {
    const parentCategories = await getParentCategories();
    const selectIds = [
      'subcategoryParentCategorySelect', // 修正：HTMLのIDと一致させる
      'productParentCategorySelect',
      'filterParentCategorySelect',
      'inventoryParentCategorySelect',
      'overallInventoryParentCategorySelect',
      'pricingParentCategorySelect'
    ];
    
    selectIds.forEach((id) => {
      const select = document.getElementById(id);
      if (select) { // nullチェックを追加
        select.innerHTML = '<option value="">親カテゴリを選択</option>';
        parentCategories.forEach((category) => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          select.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error('親カテゴリの取得に失敗しました', error);
  }
}

// 親カテゴリモーダルを開く関数
function openParentCategoryModal() {
  const parentCategoryModal = document.getElementById('parentCategoryModal');
  if (parentCategoryModal) {
    parentCategoryModal.style.display = 'block';
  }
}

// 閉じる関数をここに追加
function closeParentCategoryModal() {
  const parentCategoryModal = document.getElementById('parentCategoryModal');
  if (parentCategoryModal) {
    parentCategoryModal.style.display = 'none';
  }
}

function closeSubcategoryModal() {
  const subcategoryModal = document.getElementById('subcategoryModal');
  if (subcategoryModal) {
    subcategoryModal.style.display = 'none';
  }
}

// サブカテゴリモーダルを開く関数
function openSubcategoryModal() {
  const subcategoryModal = document.getElementById('subcategoryModal');
  if (subcategoryModal) {
    subcategoryModal.style.display = 'block';
    updateAllParentCategorySelectOptions(); // ポップアップが開かれたときに親カテゴリのセレクトボックスを更新
  }
}

async function handleAddParentCategoryFormSubmit(e) {
  e.preventDefault();
  let parentCategoryName = document.getElementById('parentCategoryName').value.trim();

  if (parentCategoryName) {
    try {
      // カテゴリ名を小文字化
      parentCategoryName = parentCategoryName.toLowerCase();

      // 既存の親カテゴリを取得し、重複がないか確認
      const parentCategories = await getParentCategories();

      const isCategoryExists = parentCategories.some(
        category => category.name.trim().toLowerCase() === parentCategoryName
      );

      if (isCategoryExists) {
        alert('同じ名前の親カテゴリが既に存在するため、追加できません');
        return;
      }

      // 新しいカテゴリを追加
      await addParentCategory(parentCategoryName);
      document.getElementById('parentCategoryName').value = '';
      document.getElementById('parentCategoryModal').style.display = 'none';
      await updateAllParentCategorySelectOptions();
      await displayParentCategories();
      alert('親カテゴリが追加されました');
    } catch (error) {
      console.error('親カテゴリの追加に失敗しました', error);
      showError('親カテゴリの追加に失敗しました');
    }
  } else {
    console.error('親カテゴリ名が空です');
    showError('親カテゴリ名を入力してください');
  }
}

async function handleAddSubcategoryFormSubmit(e) {
  e.preventDefault();
  let subcategoryName = document.getElementById('subcategoryInput').value.trim();

  if (subcategoryName) {
    // サブカテゴリ名を小文字化
    subcategoryName = subcategoryName.toLowerCase();

    const parentCategoryId = document.getElementById('subcategoryParentCategorySelect').value; // 修正済み
    if (parentCategoryId) {
      try {
        const subcategories = await getSubcategories(parentCategoryId);

        // 重複チェック: 同じ名前が存在するなら追加を防ぐ
        const isDuplicate = subcategories.some(
          subcategory => subcategory.name.trim().toLowerCase() === subcategoryName
        );
        if (isDuplicate) {
          alert('同じ名前のサブカテゴリが既に存在するため、追加できません');
          return;
        }

        await addSubcategory(subcategoryName, parentCategoryId);
        document.getElementById('subcategoryInput').value = '';
        document.getElementById('subcategoryModal').style.display = 'none';
        await displayParentCategories();
        await updateAllParentCategorySelectOptions();
        alert('サブカテゴリが追加されました');
      } catch (error) {
        console.error('サブカテゴリの追加に失敗しました', error);
        showError('サブカテゴリの追加に失敗しました');
      }
    } else {
      console.error('親カテゴリが選択されていません');
      showError('親カテゴリを選択してください');
    }
  } else {
    console.error('サブカテゴリ名が空です');
    showError('サブカテゴリ名を入力してください');
  }
}


// DOMContentLoaded イベントで初期化処理を実行
document.addEventListener('DOMContentLoaded', async () => {
  console.log("初期化処理開始");

 try {
  // 初期化処理
  await updateAllParentCategorySelectOptions();
  await updatePricingParentCategorySelect();
  await displayParentCategories();
  await displayProducts();
  await displayOverallInventory();
  await displayInventoryProducts();
  await displayTransactions(); // 売上管理セクションの取引データ表示
  await displayConsumables(); // 消耗品リストの初期表示
  await updateConsumableCheckboxes(); // 消耗品選択リストのチェックボックスを更新
  await initializeConsumableUsage(); // 消耗品使用量の初期化

  // ナビゲーションリンクのイベントリスナーを追加
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // デフォルトのアンカーリンクの動作を防止

      const targetId = link.getAttribute('href').substring(1); // href属性からターゲットIDを取得
      showSection(targetId);
    });
  });

  // 初期表示のセクションを設定（例：ホームセクションを表示）
  showSection('home');

  // **ここからイベントリスナーの設定を追加します**

  // イベントリスナーの重複登録を防止
  const addParentCategoryButton = document.getElementById('addParentCategoryButton');
  if (addParentCategoryButton && !addParentCategoryButton.hasAttribute('listener-added')) {
    addParentCategoryButton.addEventListener('click', openParentCategoryModal);
    addParentCategoryButton.setAttribute('listener-added', 'true');
  }

  const addSubcategoryButton = document.getElementById('addSubcategoryButton');
  if (addSubcategoryButton && !addSubcategoryButton.hasAttribute('listener-added')) {
    addSubcategoryButton.addEventListener('click', openSubcategoryModal);
    addSubcategoryButton.setAttribute('listener-added', 'true');
  }

  // 親カテゴリモーダルの×ボタン
  const closeParentModalButton = document.getElementById('closeParentCategoryModal');
  if (closeParentModalButton && !closeParentModalButton.hasAttribute('listener-added')) {
    closeParentModalButton.addEventListener('click', closeParentCategoryModal);
    closeParentModalButton.setAttribute('listener-added', 'true');
  }

  // サブカテゴリモーダルの×ボタン
  const closeSubcategoryModalButton = document.getElementById('closeSubcategoryModal');
  if (closeSubcategoryModalButton && !closeSubcategoryModalButton.hasAttribute('listener-added')) {
    closeSubcategoryModalButton.addEventListener('click', closeSubcategoryModal);
    closeSubcategoryModalButton.setAttribute('listener-added', 'true');
  }

  // その他のイベントリスナーの設定
  const addParentCategoryForm = document.getElementById('addParentCategoryForm');
  if (addParentCategoryForm && !addParentCategoryForm.hasAttribute('listener-added')) {
    addParentCategoryForm.addEventListener('submit', handleAddParentCategoryFormSubmit);
    addParentCategoryForm.setAttribute('listener-added', 'true');
  }

  const addSubcategoryForm = document.getElementById('addSubcategoryForm');
  if (addSubcategoryForm && !addSubcategoryForm.hasAttribute('listener-added')) {
    addSubcategoryForm.addEventListener('submit', handleAddSubcategoryFormSubmit);
    addSubcategoryForm.setAttribute('listener-added', 'true');
  }
 console.log("初期化処理終了");
  } catch (error) {
    console.error('初期化処理中にエラーが発生しました:', error);
  }
});
