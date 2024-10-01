import { db } from './db.js';
import { showErrorModal } from './errorHandling.js'; // エラー表示のためのモーダルインポート

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
            quantity: inventoryItem.quantity,
            subcategoryId: inventoryItem.subcategoryId  // サブカテゴリIDを追加
        });

        addRequest.onsuccess = () => {
            console.log('在庫アイテムが正常に追加されました。');
            
            const subcategorySelect = document.getElementById('inventory-subcategory-select');
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
 * 在庫削除関数
 * @param {number} id - 削除する在庫アイテムのID
 */
export function deleteInventoryItem(id) {
    if (!db) {
        console.error('データベースが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => {
        console.log(`在庫アイテム (ID: ${id}) が削除されました。`);
        
        const subcategorySelect = document.getElementById('inventory-subcategory-select');
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
    console.log('displayGlobalInventory called with subcategoryId:', selectedSubcategoryId);  // サブカテゴリIDを表示して確認

    if (!db) {
        console.error('Databaseが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const inventoryStore = db.transaction(['globalInventory'], 'readonly').objectStore('globalInventory');
    const index = inventoryStore.index('subcategoryId');
    const request = index.getAll(selectedSubcategoryId);

    request.onsuccess = async (event) => {
        const inventoryItems = event.target.result;
        console.log('Retrieved inventory items:', inventoryItems);  // 取得した在庫アイテムを表示して確認

        const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');

        if (globalInventoryTableBody) {
            globalInventoryTableBody.innerHTML = '';

            for (const inventoryItem of inventoryItems) {
                const productRequest = db.transaction(['products'], 'readonly')
                    .objectStore('products')
                    .get(inventoryItem.productId);

                const product = await new Promise((resolve, reject) => {
                    productRequest.onsuccess = (event) => resolve(event.target.result);
                    productRequest.onerror = (event) => reject(event.target.error);
                });

                if (product) {
                    const row = globalInventoryTableBody.insertRow();
                    row.insertCell(0).textContent = product.name;
                    row.insertCell(1).textContent = inventoryItem.quantity;
                    row.insertCell(2).textContent = product.price;
                    row.insertCell(3).textContent = product.cost;
                    row.insertCell(4).textContent = product.barcode;
                    row.insertCell(5).textContent = product.unitAmount;

                    const editButton = document.createElement('button');
                    editButton.textContent = '数量編集';
                    editButton.className = 'inventory-edit-button';
                    editButton.addEventListener('click', () => {
                        showEditInventoryForm(inventoryItem);
                    });
                    row.insertCell(6).appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'inventory-delete-button';
                    deleteButton.addEventListener('click', () => {
                        if (confirm(`${product.name} を削除しますか？`)) {
                            deleteInventoryItem(inventoryItem.id);
                        }
                    });
                    row.insertCell(7).appendChild(deleteButton);
                } else {
                    console.warn(`Product not found for productId: ${inventoryItem.productId}`);
                }
            }

            if (inventoryItems.length === 0) {
                const row = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = 8;
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
        console.error('在庫アイテムの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫アイテムの取得中にエラーが発生しました。');
    };
}

/**
 * 在庫編集フォームを表示する関数
 * @param {Object} inventoryItem - 編集対象の在庫アイテム
 */
export function showEditInventoryForm(inventoryItem) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>在庫を編集</h3>
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
                ...inventoryItem,
                quantity: editedQuantity
            };

            try {
                const transaction = db.transaction(['globalInventory'], 'readwrite');
                const store = transaction.objectStore('globalInventory');
                const updateRequest = store.put(updatedInventory);

                updateRequest.onsuccess = () => {
                    console.log('在庫が正常に更新されました。');
                    document.body.removeChild(editForm);
                    
                    const subcategorySelect = document.getElementById('inventory-subcategory-select');
                    const selectedSubcategoryId = Number(subcategorySelect.value);

                    if (selectedSubcategoryId) {
                        displayGlobalInventory(selectedSubcategoryId); 
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

    const cancelButton = editForm.querySelector('#cancel-inventory-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * 親カテゴリセレクトボックスを更新する関数
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
                if (category.parentId === null) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    parentCategorySelect.appendChild(option);
                }
            });

            parentCategorySelect.addEventListener('change', () => {
                const selectedParentCategoryId = Number(parentCategorySelect.value);
                updateInventorySubcategorySelect(selectedParentCategoryId);
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
 * サブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリID
 */
export function updateInventorySubcategorySelect(parentCategoryId) {
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

           // 修正後
subcategorySelect.addEventListener('change', () => {
    const selectedSubcategoryId = Number(subcategorySelect.value);
    if (!isNaN(selectedSubcategoryId)) {  // 修正点: NaNチェックを追加して、選択されたIDが数字かを確認
        displayGlobalInventory(selectedSubcategoryId);  // サブカテゴリ選択時に在庫を表示
    } else {
        console.warn('サブカテゴリが選択されていません。');  // サブカテゴリが無効な場合に警告
    }
});

        } else {
            console.error('inventory-subcategory-select が見つかりません。');
            showErrorModal('サブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 在庫管理セクションの初期化
 */
export function initializeInventorySection() {
    updateInventoryParentCategorySelect(); // 在庫管理用の親カテゴリセレクトボックスを初期化
}
