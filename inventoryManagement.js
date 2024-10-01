import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

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
            
            // 現在選択されているサブカテゴリIDを取得
            const subcategorySelect = document.getElementById('global-subcategory-select');
            const selectedSubcategoryId = Number(subcategorySelect.value);

            if (selectedSubcategoryId) {
                displayGlobalInventory(selectedSubcategoryId); // 正しいサブカテゴリIDで呼び出し
            } else {
                console.warn('サブカテゴリが選択されていません。');
            }
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
 * 在庫の削除関数
 * @param {number} id - 削除する在庫アイテムのID
 */
export function deleteInventoryItem(id) {
    if (!db) {
        console.error('Databaseが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => {
        console.log(`在庫アイテム (ID: ${id}) が削除されました。`);
        
        // 現在選択されているサブカテゴリIDを取得
        const subcategorySelect = document.getElementById('global-subcategory-select');
        const selectedSubcategoryId = Number(subcategorySelect.value);
        
        if (selectedSubcategoryId) {
            displayGlobalInventory(selectedSubcategoryId); // 正しいサブカテゴリIDで呼び出し
        } else {
            console.warn('サブカテゴリが選択されていません。');
        }
    };

    deleteRequest.onerror = (event) => {
        console.error('在庫削除中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫削除中にエラーが発生しました。');
    };
}

/**
 * 全体在庫を表示する関数
 * @param {number} [selectedSubcategoryId] - 選択されたサブカテゴリID（オプション）
 */
export async function displayGlobalInventory(selectedSubcategoryId) {
    console.log('displayGlobalInventory called with subcategoryId:', selectedSubcategoryId);

    if (!db) {
        console.error('Databaseが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const inventoryStore = db.transaction(['products'], 'readonly').objectStore('products');
    const index = inventoryStore.index('subcategoryId');
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
                        deleteInventoryItem(product.id);  // 商品削除
                    }
                });
                row.insertCell(7).appendChild(deleteButton);
            });

            if (products.length === 0) {
                const row = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 8; // 列数に合わせて調整
                noDataCell.textContent = '在庫データがありません。';
                row.appendChild(noDataCell);
                globalInventoryTableBody.appendChild(row);
            }
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
 * 指定されたサブカテゴリIDに属する商品IDのリストを取得する関数
 * @param {number} subcategoryId - サブカテゴリのID
 * @returns {Promise<number[]>} - 商品IDのリスト
 */
export async function getProductIdsBySubcategory(subcategoryId) {
    console.log('Fetching product IDs for subcategoryId:', subcategoryId);
    return new Promise((resolve, reject) => {
        const productsStore = db.transaction(['products'], 'readonly').objectStore('products');
        const index = productsStore.index('subcategoryId');
        const request = index.getAll(IDBKeyRange.only(subcategoryId));

        request.onsuccess = (event) => {
            const products = event.target.result;
            const productIds = products.map(product => product.id);
            resolve(productIds);
        };

        request.onerror = (event) => {
            console.error('サブカテゴリIDで商品を取得中にエラーが発生しました:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * 在庫編集フォームを表示する関数
 * @param {Object} product - 編集対象の商品
 */
export function showEditInventoryForm(product) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>在庫を編集</h3>
                <label>商品名: <input type="text" id="edit-inventory-name" value="${product.name}" disabled></label><br>
                <label>数量: <input type="number" id="edit-inventory-quantity" value="${product.quantity}"></label><br>
                <button id="save-inventory-button">保存</button>
                <button id="cancel-inventory-button">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(editForm);

    const modal = editForm.querySelector('.modal');
    const closeButton = editForm.querySelector('.close-button');

    // モーダルを表示
    modal.style.display = 'block';

    // 閉じるボタンのイベントリスナー
    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    // 保存ボタンのイベントリスナー
    const saveButton = editForm.querySelector('#save-inventory-button');
    saveButton.addEventListener('click', async () => {
        const editedQuantity = Number(editForm.querySelector('#edit-inventory-quantity').value.trim());

        if (!isNaN(editedQuantity)) {
            const updatedInventory = {
                id: product.id,
                productId: product.productId,
                quantity: editedQuantity
            };

            try {
                const transaction = db.transaction(['globalInventory'], 'readwrite');
                const store = transaction.objectStore('globalInventory');
                const updateRequest = store.put(updatedInventory);

                updateRequest.onsuccess = () => {
                    console.log('在庫が正常に更新されました。');
                    document.body.removeChild(editForm);
                    
                    // 現在選択されているサブカテゴリIDを取得
                    const subcategorySelect = document.getElementById('global-subcategory-select');
                    const selectedSubcategoryId = Number(subcategorySelect.value);

                    if (selectedSubcategoryId) {
                        displayGlobalInventory(selectedSubcategoryId); // 正しいサブカテゴリIDで呼び出し
                    } else {
                        console.warn('サブカテゴリが選択されていません。');
                    }
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

    // キャンセルボタンのイベントリスナー
    const cancelButton = editForm.querySelector('#cancel-inventory-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
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

/**
 * 親カテゴリセレクトボックスを更新する関数（在庫管理用）
 */
export function updateInventoryParentCategorySelect() {
    if (!db) {
        console.error('Databaseが初期化されていません。');
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
                if (category.parentId === null) { // 親カテゴリのみを対象
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    parentCategorySelect.appendChild(option);
                }
            });

            // 親カテゴリ選択に応じてサブカテゴリを更新
            parentCategorySelect.addEventListener('change', () => {
                const selectedParentCategoryId = Number(parentCategorySelect.value);
                updateGlobalInventorySubcategorySelect(selectedParentCategoryId); // 選択された親カテゴリに基づいてサブカテゴリを更新
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
 * 全体在庫専用のサブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリID
 */
export function updateGlobalInventorySubcategorySelect(parentCategoryId) {
    if (!db) {
        console.error('データベースが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const subcategorySelect = document.getElementById('global-subcategory-select');

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
            console.error('global-subcategory-select が見つかりません。');
            showErrorModal('サブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 全体在庫管理セクションの初期化
 */
export function initializeGlobalInventorySection() {
    updateGlobalInventoryParentCategorySelect(); // 親カテゴリセレクトボックスを初期化
}
