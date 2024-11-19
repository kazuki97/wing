// eventListeners.js

// インポート
import { auth } from './db.js';

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
  updateProductQuantity, // この行を追加
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
  getPricingRuleById, // **追加**
  updatePricingRule,  // **追加**
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

import {
  getConsumables,
  getConsumableUsage,
  getConsumableUsageById, // **追加**
  updateConsumableUsage,  // **追加**
  deleteConsumableUsage,  // **追加**
  getConsumableById,      // **ここを追加**
  updateConsumable,       // **ここを追加**
} from './consumables.js';
import { deleteConsumable } from './consumables.js'; // 削除の関数もインポート


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
export async function updateConsumableCheckboxes() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('消耗品リストを取得するにはログインが必要です。');
      return;
    }
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
export async function initializeConsumableUsage() {
  try {
const user = auth.currentUser;
if (!user) {
  alert('この操作を行うにはログインが必要です。');
  return;
}
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
const user = auth.currentUser;
if (!user) {
  alert('この操作を行うにはログインが必要です。');
  return;
}
    const consumableUsageList = await getConsumableUsage(year, month); // 消耗品使用量を取得
    const consumables = await getConsumables(); // 全ての消耗品を取得
    const usageTableBody = document.getElementById('consumableUsageList').querySelector('tbody');
    usageTableBody.innerHTML = '';

    // 消耗品使用量を表示
    consumableUsageList.forEach((usage) => {
      const consumable = consumables.find(c => c.id === usage.consumableId);
      const consumableName = consumable ? consumable.name : '不明な消耗品';

      const row = document.createElement('tr');
      const date = new Date(usage.timestamp);

      // 日時を表示するフォーマット
      const formattedDate = date.toLocaleString();

      row.innerHTML = `
        <td>${consumableName}</td>
        <td>${usage.quantityUsed}</td>
        <td>${formattedDate}</td>
        <td>
          <button class="edit-consumable-usage" data-id="${usage.id}">編集</button>
          <button class="delete-consumable-usage" data-id="${usage.id}">削除</button>
        </td>
      `;
      usageTableBody.appendChild(row);
    });

    // **編集ボタンのイベントリスナーを追加**
    document.querySelectorAll('.edit-consumable-usage').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const usageId = e.target.dataset.id;
        await openEditConsumableUsageModal(usageId);
      });
    });

    // **削除ボタンのイベントリスナーを追加**
    document.querySelectorAll('.delete-consumable-usage').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const usageId = e.target.dataset.id;
        if (confirm('本当に削除しますか？')) {
          await deleteConsumableUsage(usageId);
          alert('消耗品使用量が削除されました');
          // 選択されている年と月で再表示
          await displayConsumableUsage(year, month);
        }
      });
    });
  } catch (error) {
    console.error('消耗品使用量の表示に失敗しました:', error);
    showError('消耗品使用量の表示に失敗しました');
  }
}


// 消耗品使用量編集用モーダルを開く関数
async function openEditConsumableUsageModal(usageId) {
  try {
const user = auth.currentUser;
if (!user) {
  alert('この操作を行うにはログインが必要です。');
  return;
}
    const usageData = await getConsumableUsageById(usageId);
    if (!usageData) {
      showError('消耗品使用量が見つかりません');
      return;
    }

    // 消耗品リストを取得してセレクトボックスを更新
    const consumables = await getConsumables();
    const consumableSelect = document.getElementById('editConsumableSelect');
    consumableSelect.innerHTML = '';
    consumables.forEach((consumable) => {
      const option = document.createElement('option');
      option.value = consumable.id;
      option.textContent = consumable.name;
      consumableSelect.appendChild(option);
    });

    document.getElementById('editConsumableUsageId').value = usageData.id;
    document.getElementById('editConsumableSelect').value = usageData.consumableId;
    document.getElementById('editQuantityUsed').value = usageData.quantityUsed;
    document.getElementById('editUsageTimestamp').value = new Date(usageData.timestamp).toISOString().slice(0, -1);
    document.getElementById('editConsumableUsageModal').style.display = 'block';
  } catch (error) {
    console.error(error);
    showError('消耗品使用量の取得に失敗しました');
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
        let product = null;

        if (transaction.items[0].productId) {
          // 商品情報を取得
          product = await getProductById(transaction.items[0].productId);
        } else {
          // 手動追加の場合、transaction.items[0] から商品情報を取得
          product = {
            name: transaction.items[0].productName,
            price: transaction.items[0].unitPrice,
            cost: transaction.items[0].cost,
            size: transaction.items[0].size,
          };
        }
        
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
    const paymentMethodId = document.getElementById('editTransactionPaymentMethod').value;

    // 入力値の検証
    if (isNaN(quantity) || isNaN(unitPrice) || isNaN(cost) || isNaN(size)) {
      showError('有効な数値を入力してください');
      return;
    }

    const subtotal = quantity * unitPrice * size; // 小計計算 (サイズを考慮)

    // 支払い方法の手数料を取得
    let feeAmount = 0;
    if (paymentMethodId) {
      const paymentMethod = await getPaymentMethodById(paymentMethodId);
      if (paymentMethod && paymentMethod.feeRate) {
        feeAmount = subtotal * paymentMethod.feeRate; // 手数料計算
      }
    }

    // 利益の計算
    const profitAmount = subtotal - (quantity * cost * size) - feeAmount; // 利益計算 (サイズと手数料を考慮)

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
          profit: profitAmount, // 利益
        }
      ],
      totalAmount: subtotal, // 合計金額
      paymentMethodId,
      feeAmount: feeAmount,           // 手数料
      netAmount: subtotal - feeAmount, // 手数料を引いた金額
      profit: profitAmount,           // 総利益
    };

    try {
      // 取引データを更新
      await updateTransaction(transactionId, updatedData);
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

document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
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
  const totalCost = productCost * productQuantity * productSize; // 総原価

  // 支払い方法の手数料を取得
  let feeAmount = 0;
  if (paymentMethodId) {
    const paymentMethod = await getPaymentMethodById(paymentMethodId);
    if (paymentMethod && paymentMethod.feeRate) {
      feeAmount = subtotal * paymentMethod.feeRate; // 手数料計算（例：feeRateが0.03なら3%）
    }
  }

  // 利益の計算
  const profitAmount = subtotal - totalCost - feeAmount; // 利益（手数料を差し引く）

  // 売上データを生成
  const transactionData = {
    items: [
      {
        productName,
        unitPrice: productPrice,
        quantity: productQuantity,
        size: productSize,
        subtotal: subtotal,  // 小計
        cost: productCost,   // 単価原価
        profit: profitAmount, // 利益
      }
    ],
    totalCost: totalCost,      // 取引全体の総原価
    totalAmount: subtotal,     // 合計金額
    paymentMethodId,
    timestamp: new Date().toISOString(),
    feeAmount: feeAmount,          // 手数料
    netAmount: subtotal - feeAmount, // 手数料を引いた金額
    profit: profitAmount,       // 総利益
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


// 商品追加フォームのイベントリスナー
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
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
});

// 消耗品リストを表示する関数
async function displayConsumables() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('消耗品を表示するにはログインが必要です。');
      return;
    }
    const consumablesList = await getConsumables();
    const consumableTableBody = document.getElementById('consumableList').querySelector('tbody');
    consumableTableBody.innerHTML = '';

    consumablesList.forEach((consumable) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${consumable.name}</td>
        <td>¥${consumable.cost}</td>
        <td>
          <button class="edit-consumable" data-id="${consumable.id}">編集</button>
          <button class="delete-consumable" data-id="${consumable.id}">削除</button>
        </td>
      `;
      consumableTableBody.appendChild(row);
    });

    // **編集ボタンのイベントリスナーを追加**
    document.querySelectorAll('.edit-consumable').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const consumableId = e.target.dataset.id;
        await openEditConsumableModal(consumableId);
      });
    });

    // 削除ボタンのイベントリスナーを設定
    document.querySelectorAll('.delete-consumable').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const consumableId = e.target.dataset.id;
        if (confirm('本当に削除しますか？')) {
          await deleteConsumable(consumableId);
          alert('消耗品が削除されました');
          await displayConsumables(); // 最新の消耗品リストを再表示
        }
      });
    });
  } catch (error) {
    console.error('消耗品の表示に失敗しました:', error);
    showError('消耗品の表示に失敗しました');
  }
}

// 消耗品編集用モーダルを開く関数
async function openEditConsumableModal(consumableId) {
  try {
const user = auth.currentUser;
if (!user) {
  alert('この操作を行うにはログインが必要です。');
  return;
}
    const consumable = await getConsumableById(consumableId);
    if (!consumable) {
      showError('消耗品が見つかりません');
      return;
    }
    // モーダル内のフォームに値をセット
    document.getElementById('editConsumableId').value = consumable.id;
    document.getElementById('editConsumableName').value = consumable.name;
    document.getElementById('editConsumableCost').value = consumable.cost;
    // モーダルを表示
    document.getElementById('editConsumableModal').style.display = 'block';
  } catch (error) {
    console.error(error);
    showError('消耗品の取得に失敗しました');
  }
}

// モーダルを閉じるボタンのイベントリスナー
document.getElementById('closeEditConsumableModal').addEventListener('click', () => {
  document.getElementById('editConsumableModal').style.display = 'none';
});

// 消耗品の更新フォームの送信イベントリスナー
document.getElementById('editConsumableForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const consumableId = document.getElementById('editConsumableId').value;
  const updatedName = document.getElementById('editConsumableName').value.trim();
  const updatedCost = parseFloat(document.getElementById('editConsumableCost').value);

  if (!updatedName || isNaN(updatedCost) || updatedCost < 0) {
    showError('消耗品名と有効な原価を入力してください');
    return;
  }

  try {
    await updateConsumable(consumableId, { name: updatedName, cost: updatedCost });
    alert('消耗品が更新されました');
    document.getElementById('editConsumableModal').style.display = 'none';
    await displayConsumables();
  } catch (error) {
    console.error('消耗品の更新に失敗しました:', error);
    showError('消耗品の更新に失敗しました');
  }
});


// 売上管理セクションの取引データ表示関数
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

    const transactionList = document.getElementById('transactionList').querySelector('tbody');
    transactionList.innerHTML = '';

    for (const transaction of transactions) {
      const row = document.createElement('tr');
      if (transaction.isReturned) {
        row.style.color = 'red';
      }

      // transaction.items が存在し、配列であり、少なくとも1つの要素があるかを確認
      const itemsExist = Array.isArray(transaction.items) && transaction.items.length > 0;

      const productNames = itemsExist
        ? transaction.items.map((item) => item.productName).join(', ')
        : '商品情報なし';

      const totalQuantity = itemsExist
        ? transaction.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
        : '-';

      const paymentMethodName = paymentMethodMap[transaction.paymentMethodId] || '不明な支払い方法';

      // タイムスタンプを適切にフォーマット
      let formattedTimestamp = '日時情報なし';
      if (transaction.timestamp) {
        const date = new Date(transaction.timestamp);
        if (!isNaN(date.getTime())) {
          formattedTimestamp = date.toLocaleString('ja-JP');
        }
      }

     // totalCost の計算
let totalCost = 0;
if (transaction.totalCost !== undefined && !isNaN(parseFloat(transaction.totalCost))) {
  totalCost = parseFloat(transaction.totalCost);
} else if (itemsExist) {
  totalCost = transaction.items.reduce((sum, item) => {
    let itemTotalCost = parseFloat(item.cost);
    if (isNaN(itemTotalCost)) itemTotalCost = 0;
    return sum + itemTotalCost; // 手動追加の場合、item.costは総原価
  }, 0);
} else {
  totalCost = 0;
}


      // netAmount と feeAmount の数値変換
      const netAmount = parseFloat(transaction.netAmount) || 0;
      const feeAmount = parseFloat(transaction.feeAmount) || 0;

      // profit の計算
      const profit =
        transaction.profit !== undefined
          ? parseFloat(transaction.profit) || 0
          : netAmount - totalCost - feeAmount;

     row.innerHTML = `
  <td>${transaction.id}</td>
  <td>${formattedTimestamp}</td>
  <td>${paymentMethodName}</td>
  <td>${productNames}</td>
  <td>${totalQuantity}</td>
  <td>¥${Math.round(netAmount)}</td>
  <td>¥${Math.round(feeAmount)}</td>
  <td>¥${Math.round(totalCost)}</td>
  <td>¥${Math.round(profit)}</td>
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

    // 詳細情報を表示するための要素を取得
    const transactionDetails = document.getElementById('transactionDetails');
    document.getElementById('detailTransactionId').textContent = transaction.id;

    // タイムスタンプのパース
    let timestampText = '日時情報なし';
    if (transaction.timestamp) {
      const date = new Date(transaction.timestamp);
      if (!isNaN(date)) {
        timestampText = date.toLocaleString();
      }
    }
    document.getElementById('detailTimestamp').textContent = timestampText;

    // 支払い方法名を取得（必要なら追加のコードが必要）
    document.getElementById('detailPaymentMethod').textContent = transaction.paymentMethodName || '情報なし';
    document.getElementById('detailFeeAmount').textContent = transaction.feeAmount !== undefined ? `¥${Math.round(transaction.feeAmount)}` : '¥0';
    document.getElementById('detailNetAmount').textContent = transaction.netAmount !== undefined ? `¥${Math.round(transaction.netAmount)}` : '¥0';
    const totalCost = parseFloat(transaction.totalCost);
    document.getElementById('detailTotalCost').textContent = !isNaN(totalCost) ? `¥${Math.round(totalCost)}` : '¥0';
    document.getElementById('detailTotalProfit').textContent = transaction.profit !== undefined ? `¥${Math.round(transaction.profit)}` : '¥0';

    const detailProductList = document.getElementById('detailProductList');
    detailProductList.innerHTML = '';

    if (transaction.items && transaction.items.length > 0) {
      const totalFee = transaction.feeAmount || 0;
      const totalSubtotal = transaction.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

      for (const item of transaction.items) {
        const row = document.createElement('tr');

        // 各商品の総原価を計算
        const itemTotalCost = (item.cost || 0) * (item.quantity || 0) * (item.size || 1); // **修正ポイント**

        // 手数料を各商品の売上金額に比例して割り当て
        const itemFee = totalSubtotal > 0 ? (item.subtotal || 0) / totalSubtotal * totalFee : 0;

        // 利益を計算（手数料を含める）
        const itemProfit = (item.subtotal || 0) - itemTotalCost - itemFee;

        row.innerHTML = `
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>${item.size}</td>
          <td>¥${item.unitPrice !== undefined ? Math.round(item.unitPrice) : '情報なし'}</td>
          <td>¥${item.subtotal !== undefined ? Math.round(item.subtotal) : '情報なし'}</td>
          <td>¥${!isNaN(itemTotalCost) ? Math.round(itemTotalCost) : '情報なし'}</td>
          <td>¥${!isNaN(itemProfit) ? Math.round(itemProfit) : '情報なし'}</td>
        `;
        detailProductList.appendChild(row);
      }
    } else {
      // 手動追加のため、商品明細が無い
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="7">商品情報はありません</td>';
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
  const user = auth.currentUser;
  if (!user) {
    alert('取引を削除するにはログインが必要です。');
    return;
  }
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
  const user = auth.currentUser;
  if (!user) {
    alert('親カテゴリを追加するにはログインが必要です。');
    return;
  }
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
    addSubcategoryModal.style.display = 'none';
    await displayParentCategories();
    await updateAllParentCategorySelects();
    alert('サブカテゴリが追加されました');
  } catch (error) {
    console.error(error);
    showError('サブカテゴリの追加に失敗しました');
  }
});

// 商品追加モーダル要素の取得
const addProductModal = document.getElementById('addProductModal');

// モーダルを開くボタンの取得
const openAddProductModalBtn = document.getElementById('openAddProductModal');

// モーダルを閉じるボタンの取得
const closeAddProductModalBtn = document.getElementById('closeAddProductModal');

// モーダルを開くイベントリスナー
openAddProductModalBtn.addEventListener('click', async () => {
  addProductModal.style.display = 'block';
  await updateAllParentCategorySelects(); // カテゴリセレクトボックスを更新
  await updateConsumableCheckboxes(); // 消耗品チェックボックスを更新
});

// モーダルを閉じるイベントリスナー
closeAddProductModalBtn.addEventListener('click', () => {
  addProductModal.style.display = 'none';
  document.getElementById('addProductForm').reset();
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

// サブカテゴリセレクトボックスの個別更新関数
async function updateSubcategorySelect(parentCategoryId, subcategorySelectId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('サブカテゴリを取得するにはログインが必要です。');
      return;
    }
    const select = document.getElementById(subcategorySelectId);
    if (select) {
      // **既存のオプションを削除**
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }

      // **初期のオプションを追加**
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

// イベントリスナーの重複登録を防ぐためのフラグ
let subcategoryEventListenersAdded = false;

function addSubcategorySelectEventListeners() {
  if (subcategoryEventListenersAdded) {
    return; // すでにイベントリスナーが登録されている場合は何もしない
  }

  const subcategorySelectIds = [
    'productSubcategorySelect',
    'filterSubcategorySelect',
    'inventorySubcategorySelect',
    'overallInventorySubcategorySelect',
    'pricingSubcategorySelect',
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

  subcategoryEventListenersAdded = true; // フラグを立てる
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
    const consumablesList = await getConsumables(); // 消耗品リストを取得
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    // サブカテゴリごとに商品をグループ化
    const subcategoryMap = {};
    for (const product of products) {
      const subcategory = await getSubcategoryById(product.subcategoryId);
      const subcategoryName = subcategory ? subcategory.name : '不明なサブカテゴリ';
      if (!subcategoryMap[subcategoryName]) {
        subcategoryMap[subcategoryName] = [];
      }
      subcategoryMap[subcategoryName].push(product);
    }

    // サブカテゴリごとに商品を表示
    for (const subcategoryName in subcategoryMap) {
      const subcategoryHeader = document.createElement('h3');
      subcategoryHeader.textContent = subcategoryName;
      productList.appendChild(subcategoryHeader);

      const productUl = document.createElement('ul');

      subcategoryMap[subcategoryName].forEach((product) => {
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
        productUl.appendChild(listItem);
      });

      productList.appendChild(productUl);
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
  const consumables = await getConsumables();

  // 編集用のフォームを作成
  const editForm = document.createElement('form');
  editForm.innerHTML = `
    <input type="text" name="name" value="${product.name}" required />
    <input type="number" name="price" value="${product.price}" required />
    <input type="number" name="cost" value="${product.cost}" required />
    <input type="text" name="barcode" value="${product.barcode || ''}" />
    <input type="number" name="quantity" value="${product.quantity || 0}" required />
    <input type="number" name="size" value="${product.size || 1}" required />
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

    // **商品を名前内の数値でソート**
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
        <td><button class="update-inventory">更新</button></td>
      `;
      inventoryList.appendChild(row);
    }

    // 在庫数更新ボタンのイベントリスナー（既存のコード）
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

// **商品名から数値を抽出する関数を追加**
function extractNumberFromName(name) {
  const match = name.match(/\d+/);
  return match ? parseFloat(match[0]) : 0;
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
document.getElementById('updateOverallInventoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    alert('全体在庫を更新するにはログインが必要です。');
    return;
  }
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
    document.getElementById('editMinQuantity').value = rule.minQuantity;
    document.getElementById('editMaxQuantity').value = rule.maxQuantity;
    document.getElementById('editUnitPrice').value = rule.unitPrice;
    // モーダルを表示
    document.getElementById('editPricingRuleModal').style.display = 'block';
  } catch (error) {
    console.error(error);
    showError('単価ルールの取得に失敗しました');
  }
}

// **単価ルールを更新するイベントリスナーを追加**
document.getElementById('editPricingRuleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ruleId = document.getElementById('editPricingRuleId').value;
  const minQuantity = parseFloat(document.getElementById('editMinQuantity').value);
  const maxQuantity = parseFloat(document.getElementById('editMaxQuantity').value);
  const unitPrice = parseFloat(document.getElementById('editUnitPrice').value);

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

// **モーダルを閉じるボタンのイベントリスナーを追加**
document.getElementById('closeEditPricingRuleModal').addEventListener('click', () => {
  document.getElementById('editPricingRuleModal').style.display = 'none';
});

// 単価設定セクションのサブカテゴリセレクトボックスのイベントリスナー
document.getElementById('pricingSubcategorySelect').addEventListener('change', async () => {
  await displayPricingRules();
});



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
