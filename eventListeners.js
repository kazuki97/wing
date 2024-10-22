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

import { getConsumables, getConsumableUsage } from './consumables.js'; // 消耗品使用量取得の関数もインポート
import { deleteConsumable } from './consumables.js'; // 削除の関数もインポート

// 追加: updatePricingParentCategorySelectの定義
async function updatePricingParentCategorySelect() {
  try {
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
async function updatePaymentMethodSelect() {
  try {
    const paymentMethods = await getPaymentMethods();
    const paymentMethodSelect = document.getElementById('transactionPaymentMethod');
    paymentMethodSelect.innerHTML = '<option value="">支払い方法を選択</option>';
    paymentMethods.forEach((method) => {
      const option = document.createElement('option');
      option.value = method.id;
      option.textContent = method.name;
      paymentMethodSelect.appendChild(option);
    });
  } catch (error) {
    console.error('支払い方法の取得に失敗しました:', error);
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

// 消耗品選択リストの更新関数
async function updateConsumableCheckboxes() {
  try {
    const consumables = await getConsumables();
    const consumableCheckboxesDiv = document.getElementById('consumableCheckboxes');
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
  } catch (error) {
    console.error('消耗品リストの取得に失敗しました:', error);
  }
}

// 消耗品使用量の初期化処理
async function initializeConsumableUsage() {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 年と月の選択肢をセット
    const yearSelect = document.getElementById('usageYear');
    const monthSelect = document.getElementById('usageMonth');

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
    document.getElementById('filterUsage').addEventListener('click', async () => {
      const year = parseInt(yearSelect.value);
      const month = parseInt(monthSelect.value);
      await displayConsumableUsage(year, month);
    });

    // 初期表示として現在の年と月のデータを表示
    await displayConsumableUsage(currentYear, currentMonth);
  } catch (error) {
    console.error('消耗品使用量の初期化に失敗しました:', error);
  }
}

// 消耗品使用量の表示
async function displayConsumableUsage(year, month) {
  try {
    const consumableUsageList = await getConsumableUsage(year, month); // 消耗品使用量を取得
    const consumables = await getConsumables(); // 全ての消耗品を取得
    const usageTableBody = document.getElementById('consumableUsageList').querySelector('tbody');
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

// 商品追加モーダルの要素を取得
const addProductModal = document.getElementById('addProductModal');
const openAddProductModalBtn = document.getElementById('openAddProductModal');
const closeAddProductModalBtn = document.getElementById('closeAddProductModal');

// 「商品を追加」ボタンのクリックイベント
openAddProductModalBtn.addEventListener('click', async () => {
  addProductModal.style.display = 'block';
  await updateAllParentCategorySelects(); // 親カテゴリのセレクトボックスを更新
  await updateConsumableCheckboxesInModal(); // 消耗品のチェックボックスを更新
});

// モーダルの閉じるボタンのクリックイベント
closeAddProductModalBtn.addEventListener('click', () => {
  addProductModal.style.display = 'none';
});

// モーダル外をクリックしたときにモーダルを閉じる
window.addEventListener('click', (event) => {
  if (event.target === addProductModal) {
    addProductModal.style.display = 'none';
  }
});

// モーダル内の商品の追加フォームの送信イベントリスナー
document.getElementById('modalAddProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  // フォームから商品情報を取得
  const productData = {
    name: document.getElementById('modalProductName').value,
    parentCategoryId: document.getElementById('modalProductParentCategorySelect').value,
    subcategoryId: document.getElementById('modalProductSubcategorySelect').value,
    price: parseFloat(document.getElementById('modalProductPrice').value),
    cost: parseFloat(document.getElementById('modalProductCost').value),
    barcode: document.getElementById('modalProductBarcode').value,
    quantity: parseFloat(document.getElementById('modalProductQuantity').value),
    size: parseFloat(document.getElementById('modalProductSize').value),
    consumables: Array.from(document.querySelectorAll('#modalConsumableCheckboxes input[name="consumable"]:checked')).map(
      (checkbox) => checkbox.value
    ),
  };
  try {
    await addProduct(productData);
    // フォームをリセット
    document.getElementById('modalAddProductForm').reset();
    alert('商品が追加されました');
    addProductModal.style.display = 'none';
    await displayProducts();
  } catch (error) {
    console.error(error);
    showError('商品の追加に失敗しました');
  }
});



// 消耗品リストを表示する関数
async function displayConsumables() {
  try {
    const consumablesList = await getConsumables();
    const consumableTableBody = document.getElementById('consumableList').querySelector('tbody');
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
  } catch (error) {
    console.error('消耗品の表示に失敗しました:', error);
    showError('消耗品の表示に失敗しました');
  }
}

// 売上管理セクションの取引データ表示関数
export async function displayTransactions(filter = {}) {
  try {
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

      // 修正箇所: 原価と利益をリストに表示
row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${formattedTimestamp}</td>
        <td>${paymentMethodName}</td>
        <td>${productNames || '手動追加'}</td>
        <td>${totalQuantity || '-'}</td>
        <td>¥${transaction.totalAmount}</td> <!-- 売上金額はそのまま -->
        <td>¥${transaction.feeAmount || 0}</td> <!-- 手数料を表示 -->
        <td>¥${transaction.items[0].cost || 0}</td> <!-- 原価を表示 -->
        <td>¥${transaction.netAmount - transaction.items[0].cost || 0}</td> <!-- 利益を表示 -->
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
  } catch (error) {
    console.error(error);
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
openAddParentCategoryModalBtn.addEventListener('click', () => {
  addParentCategoryModal.style.display = 'block';
  updateAllParentCategorySelects();
});

openAddSubcategoryModalBtn.addEventListener('click', () => {
  addSubcategoryModal.style.display = 'block';
  updateAllParentCategorySelects();
});

// モーダルを閉じるイベントリスナー
closeParentCategoryModalBtn.addEventListener('click', () => {
  addParentCategoryModal.style.display = 'none';
});

closeSubcategoryModalBtn.addEventListener('click', () => {
  addSubcategoryModal.style.display = 'none';
});

// モーダル外をクリックしたときにモーダルを閉じる
window.addEventListener('click', (event) => {
  if (event.target === addParentCategoryModal) {
    addParentCategoryModal.style.display = 'none';
  }
  if (event.target === addSubcategoryModal) {
    addSubcategoryModal.style.display = 'none';
  }
});

// モーダル内の親カテゴリ追加フォームの送信イベントリスナー
document.getElementById('modalAddParentCategoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('modalParentCategoryName').value;
  try {
    await addParentCategory(name);
    document.getElementById('modalParentCategoryName').value = '';
    addParentCategoryModal.style.display = 'none';
    await updateAllParentCategorySelects();
    await displayParentCategories();
    alert('親カテゴリが追加されました');
  } catch (error) {
    console.error(error);
    showError('親カテゴリの追加に失敗しました');
  }
});

// モーダル内のサブカテゴリ追加フォームの送信イベントリスナー
document.getElementById('modalAddSubcategoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const parentCategoryId = document.getElementById('modalSubcategoryParentCategorySelect').value;
  const name = document.getElementById('modalSubcategoryName').value;
  try {
    await addSubcategory(name, parentCategoryId);
    document.getElementById('modalSubcategoryName').value = '';
    addSubcategoryModal.style.display = 'none';
    await displayParentCategories();
    await updateAllParentCategorySelects();
    alert('サブカテゴリが追加されました');
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの追加に失敗しました');
  }
});

// 親カテゴリセレクトボックスの更新（全てのセレクトボックスを更新）
async function updateAllParentCategorySelects() {
  try {
    const parentCategories = await getParentCategories();
    const selectIds = [
      'productParentCategorySelect',
      'filterParentCategorySelect',
      'inventoryParentCategorySelect',
      'overallInventoryParentCategorySelect',
      'pricingParentCategorySelect',
      'modalSubcategoryParentCategorySelect',
      'modalProductParentCategorySelect', // 追加
      'modalEditProductParentCategorySelect', // 追加
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
  const parentCategorySelectIds = {
    productParentCategorySelect: 'productSubcategorySelect',
    filterParentCategorySelect: 'filterSubcategorySelect',
    inventoryParentCategorySelect: 'inventorySubcategorySelect',
    overallInventoryParentCategorySelect: 'overallInventorySubcategorySelect',
    pricingParentCategorySelect: 'pricingSubcategorySelect',
    modalProductParentCategorySelect: 'modalProductSubcategorySelect', // 追加
    modalEditProductParentCategorySelect: 'modalEditProductSubcategorySelect', // 追加
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

// サブカテゴリセレクトボックスの個別更新関数
async function updateSubcategorySelect(parentCategoryId, subcategorySelectId) {
  try {
    const select = document.getElementById(subcategorySelectId);
    if (select) {
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
    } else {
      console.warn(`IDが '${subcategorySelectId}' のサブカテゴリセレクトボックスが見つかりません`);
    }
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


async function displayProducts() {
  try {
    const parentCategoryId = document.getElementById('filterParentCategorySelect').value;
    const subcategoryId = document.getElementById('filterSubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);
    const consumablesList = await getConsumables(); // 消耗品リストを取得
    const productList = document.getElementById('productList');
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
  } catch (error) {
    console.error(error);
    showError('商品の表示に失敗しました');
  }
}

// 商品の編集フォーム表示関数
async function editProduct(product) {
  // 消耗品リストの取得
  const consumables = await getConsumables();

  // 編集用モーダル内のフォームに値をセット
  document.getElementById('editProductId').value = product.id;
  document.getElementById('modalEditProductName').value = product.name;
  document.getElementById('modalEditProductPrice').value = product.price;
  document.getElementById('modalEditProductCost').value = product.cost;
  document.getElementById('modalEditProductBarcode').value = product.barcode;
  document.getElementById('modalEditProductQuantity').value = product.quantity;
  document.getElementById('modalEditProductSize').value = product.size;

  // カテゴリのセレクトボックスを更新
  await updateAllParentCategorySelects();
  document.getElementById('modalEditProductParentCategorySelect').value = product.parentCategoryId;
  await updateSubcategorySelect(product.parentCategoryId, 'modalEditProductSubcategorySelect');
  document.getElementById('modalEditProductSubcategorySelect').value = product.subcategoryId;

  // 消耗品チェックボックスを更新
  const consumableCheckboxesDiv = document.getElementById('modalEditConsumableCheckboxes');
  consumableCheckboxesDiv.innerHTML = '';
  consumables.forEach((consumable) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `edit-consumable-${consumable.id}`;
    checkbox.value = consumable.id;
    checkbox.name = 'consumable';
    if (product.consumables && product.consumables.includes(consumable.id)) {
      checkbox.checked = true;
    }

    const label = document.createElement('label');
    label.htmlFor = `edit-consumable-${consumable.id}`;
    label.textContent = consumable.name;

    const checkboxContainer = document.createElement('div');
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);

    consumableCheckboxesDiv.appendChild(checkboxContainer);
  });

  // 編集用モーダルを表示
  editProductModal.style.display = 'block';
}

// 商品編集モーダルの要素を取得
const editProductModal = document.getElementById('editProductModal');
const closeEditProductModalBtn = document.getElementById('closeEditProductModal');

// モーダルの閉じるボタンのクリックイベント
closeEditProductModalBtn.addEventListener('click', () => {
  editProductModal.style.display = 'none';
});

// モーダル外をクリックしたときにモーダルを閉じる
window.addEventListener('click', (event) => {
  if (event.target === editProductModal) {
    editProductModal.style.display = 'none';
  }
});

// 編集フォームの送信イベントリスナー
document.getElementById('modalEditProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const productId = document.getElementById('editProductId').value;

  const updatedData = {
    name: document.getElementById('modalEditProductName').value,
    parentCategoryId: document.getElementById('modalEditProductParentCategorySelect').value,
    subcategoryId: document.getElementById('modalEditProductSubcategorySelect').value,
    price: parseFloat(document.getElementById('modalEditProductPrice').value),
    cost: parseFloat(document.getElementById('modalEditProductCost').value),
    barcode: document.getElementById('modalEditProductBarcode').value,
    quantity: parseFloat(document.getElementById('modalEditProductQuantity').value),
    size: parseFloat(document.getElementById('modalEditProductSize').value),
    consumables: Array.from(document.querySelectorAll('#modalEditConsumableCheckboxes input[name="consumable"]:checked')).map(
      (checkbox) => checkbox.value
    ),
  };
  try {
    await updateProduct(productId, updatedData);
    alert('商品が更新されました');
    editProductModal.style.display = 'none';
    await displayProducts();
  } catch (error) {
    console.error(error);
    showError('商品の更新に失敗しました');
  }
});

// 商品追加用モーダルの消耗品チェックボックスを更新
async function updateConsumableCheckboxesInModal() {
  try {
    const consumables = await getConsumables();
    const consumableCheckboxesDiv = document.getElementById('modalConsumableCheckboxes');
    consumableCheckboxesDiv.innerHTML = '';

    consumables.forEach((consumable) => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `modal-consumable-${consumable.id}`;
      checkbox.value = consumable.id;
      checkbox.name = 'consumable';

      const label = document.createElement('label');
      label.htmlFor = `modal-consumable-${consumable.id}`;
      label.textContent = consumable.name;

      const checkboxContainer = document.createElement('div');
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);

      consumableCheckboxesDiv.appendChild(checkboxContainer);
    });
  } catch (error) {
    console.error(error);
    showError('消耗品の取得に失敗しました');
  }
}

// 在庫管理セクションの商品一覧表示関数
export async function displayInventoryProducts() {
  try {
    const parentCategoryId = document.getElementById('inventoryParentCategorySelect').value;
    const subcategoryId = document.getElementById('inventorySubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);
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
  } catch (error) {
    console.error(error);
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
    const overallInventories = await getAllOverallInventories();
    const overallInventoryList = document.getElementById('overallInventoryList').querySelector('tbody');
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
  } catch (error) {
    console.error(error);
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

// 初期化処理に売上管理セクションの編集ボタンのリスナーを追加
window.addEventListener('DOMContentLoaded', async () => {
  await updateAllParentCategorySelects();
  await updatePricingParentCategorySelect();
  await displayParentCategories();
  await displayProducts();
  await displayOverallInventory();
  await displayInventoryProducts();
  await displayTransactions(); // 売上管理セクションの取引データ表示
  await displayConsumables(); // 消耗品リストの初期表示
  await updateConsumableCheckboxes(); // 消耗品選択リストのチェックボックスを更新
  await initializeConsumableUsage(); // 消耗品使用量の初期化

  // 手動で売上を追加するボタンのイベントリスナー
  const manualAddTransactionButton = document.getElementById('manualAddTransactionButton');
  if (manualAddTransactionButton) {
    manualAddTransactionButton.addEventListener('click', async () => {
      document.getElementById('manualAddTransactionForm').style.display = 'block';
      await updatePaymentMethodSelect(); // 支払い方法のセレクトボックスを更新
    });
  }

  // 手動追加フォームのキャンセルボタンのイベントリスナー
  const cancelAddTransactionButton = document.getElementById('cancelAddTransaction');
  if (cancelAddTransactionButton) {
    cancelAddTransactionButton.addEventListener('click', () => {
      document.getElementById('manualAddTransactionForm').style.display = 'none';
    });
  }
});
