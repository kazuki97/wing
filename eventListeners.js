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
} from './transactions.js';

import {
  getPaymentMethods,
} from './paymentMethods.js';

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

// エラーメッセージ表示関数
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// 売上管理セクションの取引データ編集ボタンのイベントリスナー
async function addTransactionEditListeners() {
  const editButtons = document.querySelectorAll('.edit-transaction');
  editButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const transactionId = e.target.dataset.id;
      const transaction = await getTransactionById(transactionId);
      if (transaction) {
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

        // 編集フォームに現在の取引データをセット
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editTransactionTotalAmount').value = transaction.totalAmount;

        // 支払い方法の選択肢から該当の支払い方法を選択するように修正
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
    const transactionId = document.getElementById('editTransactionId').value;
    const updatedData = {
      totalAmount: parseFloat(document.getElementById('editTransactionTotalAmount').value),
      paymentMethodId: document.getElementById('editTransactionPaymentMethod').value,
    };
   try {
  await updateTransaction(transactionId, updatedData);
  console.log('取引が更新されました:', updatedData); // 更新されたデータを確認するためのログ
  alert('取引が更新されました');

  // 編集フォームを非表示にし、取引データを再表示
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

// 売上管理セクションの取引データ表示関数
async function displayTransactions(filter = {}) {
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

      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${new Date(transaction.timestamp).toLocaleString()}</td>
        <td>${paymentMethodName}</td>
        <td>${productNames || '手動追加'}</td>
        <td>${totalQuantity || '-'}</td>
        <td>¥${transaction.totalAmount}</td>
        <td>¥${transaction.cost || 0}</td>
        <td>¥${transaction.profit || 0}</td>
        <td>
          <button class="view-transaction-details" data-id="${transaction.id}">詳細</button>
          <button class="edit-transaction" data-id="${transaction.id}">編集</button>
        </td>
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

    // 編集ボタンのイベントリスナー
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
    if (transaction) {
      console.log('取引詳細:', transaction);
    }
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

// 親カテゴリ追加フォームのイベントリスナー
document
  .getElementById('addParentCategoryForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('parentCategoryName').value;
    try {
      await addParentCategory(name);
      document.getElementById('parentCategoryName').value = '';
      await updateAllParentCategorySelects();
      await displayParentCategories();
      alert('親カテゴリが追加されました');
    } catch (error) {
      console.error(error);
      showError('親カテゴリの追加に失敗しました');
    }
  });

// サブカテゴリ追加フォームのイベントリスナー
document
  .getElementById('addSubcategoryForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const parentCategoryId = document.getElementById('subcategoryParentCategorySelect').value;
    const name = document.getElementById('subcategoryName').value;
    try {
      await addSubcategory(name, parentCategoryId);
      document.getElementById('subcategoryName').value = '';
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
      const selectedValue = select.value;
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
    });
    // サブカテゴリセレクトボックスの更新
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
    const parentCategories = await getParentCategories();
    const parentCategoryList = document.getElementById('parentCategoryList');
    parentCategoryList.innerHTML = '';
    for (const category of parentCategories) {
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
              await displayParentCategories();
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
      listItem.appendChild(editButton);
      listItem.appendChild(deleteButton);

      // サブカテゴリの表示
      const subcategoryList = await displaySubcategories(category.id);
      listItem.appendChild(subcategoryList);

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
document
  .getElementById('addProductForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    // フォームから商品情報を取得
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

// 商品一覧の表示
async function displayProducts() {
  try {
    const parentCategoryId = document.getElementById('filterParentCategorySelect').value;
    const subcategoryId = document.getElementById('filterSubcategorySelect').value;
    const products = await getProducts(parentCategoryId, subcategoryId);
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    products.forEach((product) => {
      const listItem = document.createElement('li');
      listItem.textContent = `
        商品名: ${product.name},
        数量: ${product.quantity || 0},
        価格: ${product.price},
        原価: ${product.cost},
        バーコード: ${product.barcode},
        サイズ: ${product.size}
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
function editProduct(product) {
  // 編集用のフォームを作成
  const editForm = document.createElement('form');
  editForm.innerHTML = `
    <input type="text" name="name" value="${product.name}" required />
    <input type="number" name="price" value="${product.price}" required />
    <input type="number" name="cost" value="${product.cost}" required />
    <input type="text" name="barcode" value="${product.barcode}" />
    <input type="number" name="quantity" value="${product.quantity}" required />
    <input type="number" name="size" value="${product.size}" required />
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
async function displayInventoryProducts() {
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
async function displayOverallInventory() {
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
});
