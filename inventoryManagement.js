// inventoryManagement.js
import { showErrorModal } from './errorHandling.js'; // エラー表示のためのモーダルインポート
import { updateGlobalSubcategorySelectForInventory } from './categories.js';

/**
 * 在庫アイテムを追加する関数
 * @param {Object} inventoryItem - 追加する在庫アイテム
 * @param {IDBDatabase} db - データベースオブジェクト
 * @returns {Promise<void>}
 */
function addInventoryItem(inventoryItem, db) {
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

            // サブカテゴリセレクトボックスのID取得部分
            const subcategorySelect = document.getElementById('inventory-subcategory-select');

            // サブカテゴリIDが正しく取得されているか確認する
            const selectedSubcategoryId = subcategorySelect && subcategorySelect.value !== '' ? parseInt(subcategorySelect.value, 10) : undefined;
            console.log('取得した selectedSubcategoryId:', selectedSubcategoryId);

            if (selectedSubcategoryId !== undefined && selectedSubcategoryId !== null && !isNaN(selectedSubcategoryId) && selectedSubcategoryId > 0) {
                console.log('サブカテゴリIDが取得されました:', selectedSubcategoryId);
                displayGlobalInventory(selectedSubcategoryId, db);  // 正しいサブカテゴリIDで呼び出し
            } else {
                console.warn('サブカテゴリが選択されていないか、IDが無効です。');
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function deleteInventoryItem(id, db) {
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
        const selectedSubcategoryId = subcategorySelect && subcategorySelect.value !== '' ? Number(subcategorySelect.value) : undefined;
        console.log('取得した selectedSubcategoryId:', selectedSubcategoryId);

        if (selectedSubcategoryId !== undefined && !isNaN(selectedSubcategoryId)) {
            displayGlobalInventory(selectedSubcategoryId, db); // 正しいサブカテゴリIDで呼び出し
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
async function displayGlobalInventory(selectedSubcategoryId, db) {
    console.log('displayGlobalInventory called with selectedSubcategoryId:', selectedSubcategoryId, '型:', typeof selectedSubcategoryId);

    if (selectedSubcategoryId == null || selectedSubcategoryId === undefined || isNaN(selectedSubcategoryId) || selectedSubcategoryId <= 0) {
        console.warn('選択されたサブカテゴリIDが無効です。初期表示のため在庫は表示されません。');
        clearInventoryDisplay(); // 在庫表示をクリアする関数を呼び出し
        return;
    }

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
        console.log('取得した在庫アイテム:', inventoryItems);

        if (inventoryItems.length === 0) {
            console.warn('サブカテゴリIDに対応する在庫が見つかりません。');
            clearInventoryDisplay(); // 在庫表示をクリア
            return;
        }

        const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');

        if (globalInventoryTableBody) {
            globalInventoryTableBody.innerHTML = '';  // 商品リストをクリア

            // すでに追加された productId を追跡するためのセット
            const addedProductIds = new Set();

            for (const inventoryItem of inventoryItems) {
                if (addedProductIds.has(inventoryItem.productId)) {
                    console.warn(`Product with ID ${inventoryItem.productId} is already added to the table.`);
                    continue; // 重複した商品をスキップ
                }

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
                    row.insertCell(6).appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'inventory-delete-button';
                    row.insertCell(7).appendChild(deleteButton);

                    // 編集ボタンのイベントリスナー
                    editButton.addEventListener('click', () => {
                        showEditInventoryForm(inventoryItem, db);
                    });

                    // 削除ボタンのイベントリスナー
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この在庫アイテムを削除しますか？')) {
                            deleteInventoryItem(inventoryItem.id, db);
                        }
                    });

                    // 商品IDをセットに追加して重複を阻止
                    addedProductIds.add(inventoryItem.productId);
                } else {
                    console.warn(`Product not found for productId: ${inventoryItem.productId}`);
                }
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function showEditInventoryForm(inventoryItem, db) {
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
                    const selectedSubcategoryId = subcategorySelect && subcategorySelect.value !== '' ? Number(subcategorySelect.value) : undefined;

                    if (selectedSubcategoryId !== undefined && !isNaN(selectedSubcategoryId)) {
                        displayGlobalInventory(selectedSubcategoryId, db);
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function updateInventoryParentCategorySelect(db) {
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
                updateInventorySubcategorySelect(selectedParentCategoryId, db);
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function updateInventorySubcategorySelect(parentCategoryId, db) {
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

            // データ型を統一して比較
            const filteredCategories = categories.filter(category => Number(category.parentId) === Number(parentCategoryId));

            filteredCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                subcategorySelect.appendChild(option);
            });

            if (filteredCategories.length === 0) {
                console.warn('選択された親カテゴリに対応するサブカテゴリが存在しません。');
            }

            // イベントリスナーが重複して登録されないよう、追加する前にリスナーを削除
            subcategorySelect.removeEventListener('change', handleSubcategoryChange);
            subcategorySelect.addEventListener('change', (event) => handleSubcategoryChange(event, db));

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
 * サブカテゴリ選択時に呼び出されるイベントハンドラー
 * @param {Event} event - イベントオブジェクト
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function handleSubcategoryChange(event, db) {
    const selectedSubcategoryId = Number(event.target.value);
    console.log('選択されたサブカテゴリID:', selectedSubcategoryId, '型:', typeof selectedSubcategoryId);

    // サブカテゴリIDのバリデーション
    if (!isNaN(selectedSubcategoryId) && selectedSubcategoryId !== 0) {
        displayGlobalInventory(selectedSubcategoryId, db);  // サブカテゴリ選択時に在庫を表示
    } else {
        console.warn('サブカテゴリが選択されていないか、無効なサブカテゴリIDです。');
    }
}

/**
 * 在庫管理セクションの初期化
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function initializeInventorySection(db) {
    if (!db) {
        console.error('データベースが初期化されていません。initializeInventorySection() を後で再度実行します。');
        return;
    }

    const subcategorySelect = document.getElementById('inventory-subcategory-select');

    if (subcategorySelect) {
        // イベントリスナーが重複しないように、既存のリスナーを削除
        subcategorySelect.removeEventListener('change', handleSubcategoryChange);
        subcategorySelect.addEventListener('change', (event) => handleSubcategoryChange(event, db));
    } else {
        console.error('サブカテゴリセレクトボックスが見つかりません。');
        showErrorModal('サブカテゴリセレクトボックスが見つかりません。');
    }

    // 親カテゴリセレクトボックスの更新
    updateInventoryParentCategorySelect(db);
}

// 在庫リストをクリアする関数
function clearInventoryDisplay() {
    const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');
    if (globalInventoryTableBody) {
        globalInventoryTableBody.innerHTML = ''; // 在庫リストをクリア
    }
}

/**
 * 全体在庫管理セクションの初期化
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function initializeGlobalInventorySection(db) {
    updateGlobalInventoryParentCategorySelect(db);
}

function updateGlobalInventoryParentCategorySelect(db) {
    // 関数の実装をここに追加してください
}

export {
    addInventoryItem,
    deleteInventoryItem,
    displayGlobalInventory,
    showEditInventoryForm,
    updateInventoryParentCategorySelect,
    updateInventorySubcategorySelect,
    initializeInventorySection,
    clearInventoryDisplay,
    initializeGlobalInventorySection,
    updateGlobalInventoryParentCategorySelect
};

// テスト用のログ
console.log('inventoryManagement.js が正しく読み込まれました。');
