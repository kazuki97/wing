import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 単価をデータベースに保存する関数
 * @param {Object} unitPrice - 保存する単価情報
 * @returns {Promise<void>}
 */
export function saveUnitPriceToDB(unitPrice) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('データベースが初期化されていません。'));
            return;
        }

        const transaction = db.transaction(['unitPrices'], 'readwrite');
        const store = transaction.objectStore('unitPrices');
        const addRequest = store.add(unitPrice);

        addRequest.onsuccess = () => {
            console.log('単価が正常に保存されました。');
            displayUnitPrices(); // 単価一覧を更新
            resolve();
        };

        addRequest.onerror = (event) => {
            console.error('単価の保存中にエラーが発生しました:', event.target.error);
            showErrorModal('単価の保存中にエラーが発生しました。');
            reject(event.target.error);
        };
    });
}

/**
 * 在庫アイテムを追加する関数
 * @param {Object} inventoryItem - 追加する在庫アイテム
 * @returns {Promise<void>}
 */
export function addInventoryItem(inventoryItem) {
    console.log('Adding inventory item:', inventoryItem); // デバッグログ

    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('データベースが初期化されていません。'));
            return;
        }

        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        const addRequest = store.add({
            productId: inventoryItem.productId,
            quantity: inventoryItem.quantity
        });

        addRequest.onsuccess = () => {
            console.log('在庫アイテムが正常に追加されました。');
            displayGlobalInventory(); // 在庫表示を更新
            resolve();
        };

        addRequest.onerror = (event) => {
            console.error('在庫アイテムの追加中にエラーが発生しました:', event.target.error);
            showErrorModal('在庫アイテムの追加中にエラーが発生しました。');
            reject(event.target.error);
        };
    });
}

/**
 * 単価の表示を行う関数
 */
export function displayUnitPrices() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readonly');
    const store = transaction.objectStore('unitPrices');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const unitPrices = event.target.result;
        const unitPriceTableBody = document.querySelector('#unit-price-table tbody');

        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            unitPrices.forEach(unitPrice => {
                const row = unitPriceTableBody.insertRow();
                row.insertCell(0).textContent = unitPrice.subcategoryId;
                row.insertCell(1).textContent = unitPrice.tier;
                row.insertCell(2).textContent = unitPrice.price;

                // 編集ボタンの作成
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'unit-price-button';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(unitPrice);
                });
                row.insertCell(3).appendChild(editButton);

                // 削除ボタンの作成
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'unit-price-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この単価を削除しますか？')) {
                        deleteUnitPrice(unitPrice.id);
                    }
                });
                row.insertCell(4).appendChild(deleteButton);
            });
        } else {
            console.error("unit-price-tableのtbodyが見つかりません。");
            showErrorModal('単価一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('単価の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('単価の取得中にエラーが発生しました。');
    };
}

/**
 * 単価を削除する関数
 * @param {number} id - 削除する単価のID
 */
export function deleteUnitPrice(id) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readwrite');
    const store = transaction.objectStore('unitPrices');
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => {
        console.log('単価が正常に削除されました。');
        displayUnitPrices();
    };

    deleteRequest.onerror = (event) => {
        console.error('単価の削除中にエラーが発生しました:', event.target.error);
        showErrorModal('単価の削除中にエラーが発生しました。');
    };
}

/**
 * グローバルサブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリID
 */
export function updateGlobalSubcategorySelect(parentCategoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const subcategorySelect = document.getElementById('inventory-subcategory-select');

        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            categories.forEach(category => {
                if (category.parentId === parentCategoryId) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    subcategorySelect.appendChild(option);
                }
            });

            // サブカテゴリが選択された際に在庫を表示
            subcategorySelect.addEventListener('change', () => {
                const selectedSubcategoryId = Number(subcategorySelect.value);
                if (selectedSubcategoryId) {
                    displayGlobalInventory(selectedSubcategoryId); // サブカテゴリIDで商品データを取得
                }
            });
        } else {
            console.error('inventory-subcategory-select が見つかりません。');
            showErrorModal('グローバルサブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 親カテゴリセレクトボックスを更新する関数（在庫管理用）
 */
export function updateInventoryParentCategorySelect() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const parentCategorySelect = document.getElementById('inventory-parent-category-select');

        if (parentCategorySelect) {
            parentCategorySelect.innerHTML = '<option value="">親カテゴリを選択</option>';
            categories.forEach(category => {
                if (category.parentId === null) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    parentCategorySelect.appendChild(option);
                }
            });

            parentCategorySelect.addEventListener('change', () => {
                const selectedParentCategoryId = Number(parentCategorySelect.value);
                updateGlobalSubcategorySelect(selectedParentCategoryId);
            });
        } else {
            console.error('inventory-parent-category-select が見つかりません。');
            showErrorModal('親カテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('親カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('親カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 在庫編集フォームを表示する関数
 * @param {Object} inventoryItem - 編集する在庫アイテム
 * @param {Object} product - 編集対象の在庫アイテムに関連する商品
 */
export function showEditInventoryForm(inventoryItem, product) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>在庫を編集</h3>
                <label>商品名: <input type="text" id="edit-inventory-name" value="${product.name}" disabled></label><br>
                <label>数量: <input type="number" id="edit-inventory-quantity" value="${inventoryItem.quantity}"></label><br>
                <button id="save-inventory-button">保存</button>
                <button id="cancel-inventory-button">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(editForm);

    const modal = editForm.querySelector('.modal');
    const closeButton = editForm.querySelector('.close-button');

    modal.style.display = 'block';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    const saveButton = editForm.querySelector('#save-inventory-button');
    saveButton.addEventListener('click', async () => {
        const editedQuantity = Number(editForm.querySelector('#edit-inventory-quantity').value.trim());

        if (!isNaN(editedQuantity)) {
            const updatedInventory = {
                id: inventoryItem.id,
                productId: inventoryItem.productId,
                quantity: editedQuantity
            };

            try {
                const transaction = db.transaction(['globalInventory'], 'readwrite');
                const store = transaction.objectStore('globalInventory');
                const updateRequest = store.put(updatedInventory);

                updateRequest.onsuccess = () => {
                    console.log('在庫が正常に更新されました。');
                    document.body.removeChild(editForm);
                    displayGlobalInventory();  // 更新後に再表示
                };

                updateRequest.onerror = (event) => {
                    console.error('在庫の更新中にエラーが発生しました:', event.target.error);
                    showErrorModal('在庫の更新中にエラーが発生しました。');
                };
            } catch (error) {
                console.error('在庫の更新中に例外が発生しました:', error);
                showErrorModal('在庫の更新中に予期せぬエラーが発生しました。');
            }
        } else {
            alert('数量を正しく入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-inventory-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * 全体在庫を表示する関数
 * @param {number} [selectedSubcategoryId] - 選択されたサブカテゴリID（オプション）
 */
export async function displayGlobalInventory(selectedSubcategoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const index = store.index('subcategoryId');
    const request = index.getAll(selectedSubcategoryId);

    request.onsuccess = (event) => {
        const products = event.target.result;
        const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');

        if (globalInventoryTableBody) {
            globalInventoryTableBody.innerHTML = '';

            products.forEach(product => {
                const row = globalInventoryTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;  // 在庫数量として表示
                row.insertCell(2).textContent = product.price;
                row.insertCell(3).textContent = product.cost;
                row.insertCell(4).textContent = product.barcode;
                row.insertCell(5).textContent = product.unitAmount;

                // 数量編集ボタン
                const editButton = document.createElement('button');
                editButton.textContent = '数量編集';
                editButton.className = 'inventory-edit-button';
                editButton.addEventListener('click', () => {
                    showEditInventoryForm(product);  // 商品の数量編集フォームを表示
                });
                row.insertCell(6).appendChild(editButton);

                // 削除ボタン
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'inventory-delete-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm(`${product.name} を削除しますか？`)) {
                        deleteProduct(product.id);  // 商品削除
                    }
                });
                row.insertCell(7).appendChild(deleteButton);
            });
        } else {
            console.error('global-inventory-table の tbody が見つかりません。');
            showErrorModal('在庫一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('商品の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('商品の取得中にエラーが発生しました。');
    };
}

/**
 * 在庫削除関数
 * @param {number} id - 削除する在庫アイテムのID
 */
export function deleteInventoryItem(id) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => {
        console.log(`在庫アイテム (ID: ${id}) が削除されました。`);
        displayGlobalInventory(); // 削除後に再表示
    };

    deleteRequest.onerror = (event) => {
        console.error('在庫削除中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫削除中にエラーが発生しました。');
    };
}

/**
 * テスト用の在庫データを追加する関数
 */
export function addTestInventoryItems() {
    if (!db) {
        console.error('Databaseが初期化されていません。');
        return;
    }

    const testItems = [
        { productId: 1, quantity: 100 },
        { productId: 2, quantity: 50 },
        { productId: 3, quantity: 200 }
    ];

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');

    testItems.forEach(item => {
        const addRequest = store.add(item);

        addRequest.onsuccess = () => {
            console.log(`テストデータ (Product ID: ${item.productId}) が追加されました。`);
        };

        addRequest.onerror = (event) => {
            console.error(`テストデータ (Product ID: ${item.productId}) の追加中にエラーが発生しました:`, event.target.error);
        };
    });
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('inventory.js が正しく読み込まれました。');
