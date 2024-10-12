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

window.addEventListener('DOMContentLoaded', async () => {
  // 親カテゴリ追加フォームのイベントリスナー
  // 親カテゴリを追加するフォームの送信を監視し、カテゴリを追加します。
  const addParentCategoryForm = document.getElementById('addParentCategoryForm');
  if (addParentCategoryForm) {
    addParentCategoryForm.addEventListener('submit', async (e) => {
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
  }

  // サブカテゴリ追加フォームのイベントリスナー
  // サブカテゴリを追加するフォームの送信を監視し、選択された親カテゴリの下にサブカテゴリを追加します。
  const addSubcategoryForm = document.getElementById('addSubcategoryForm');
  if (addSubcategoryForm) {
    addSubcategoryForm.addEventListener('submit', async (e) => {
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
  }

 // ポップアップの開閉処理
  const openPopupButton = document.getElementById('openCategorySettingsPopup');
  const popup = document.getElementById('categorySettingsPopup');
  const closePopupButton = document.getElementById('closePopup');

  if (openPopupButton && popup && closePopupButton) {
    openPopupButton.addEventListener('click', () => {
      popup.style.display = 'block';
    });

    closePopupButton.addEventListener('click', () => {
      popup.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === popup) {
        popup.style.display = 'none';
      }
    });
  }

// 親カテゴリセレクトボックスの更新（全てのセレクトボックスを更新）
  async function updateAllParentCategorySelects() {
    try {
      const parentCategories = await getParentCategories();
      // 親カテゴリセレクトボックスのID一覧
      const selectIds = [
        'popupSubcategoryParentCategorySelect',
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
  // 新しい商品を追加するフォームの送信を監視し、入力された情報を基に商品を追加します。
  const addProductForm = document.getElementById('addProductForm');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
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
        addProductForm.reset();
        alert('商品が追加されました');
        await displayProducts();
      } catch (error) {
        console.error(error);
        showError('商品の追加に失敗しました');
      }
    });
  }

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
  // 全体在庫の数量を更新するフォームの送信を監視し、選択されたサブカテゴリの在庫を更新します。
  const updateOverallInventoryForm = document.getElementById('updateOverallInventoryForm');
  if (updateOverallInventoryForm) {
    updateOverallInventoryForm.addEventListener('submit', async (e) => {
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
  }

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
  // 単価ルールを追加するフォームの送信を監視し、指定された数量範囲と単価でルールを追加します。
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

  await updateAllParentCategorySelects();
  await updatePricingParentCategorySelect();
  await displayParentCategories();
  await displayProducts();
  await displayOverallInventory();
  await displayInventoryProducts();
});
