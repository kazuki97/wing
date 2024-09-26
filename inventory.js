// inventory.js
import { db, initializeDatabase } from './db.js';
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
 */
export function updateGlobalSubcategorySelect() {
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
        const subcategorySelect = document.getElementById('global-subcategory-select');

        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            categories.forEach(category => {
                if (category.parentId !== null) { // サブカテゴリのみを対象
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    subcategorySelect.appendChild(option);
                }
            });
        } else {
            console.error('global-subcategory-select が見つかりません。');
            showErrorModal('グローバルサブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 単価サブカテゴリセレクトを更新する関数
 */
export function updateUnitPriceSubcategorySelect() {
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
        const subcategorySelect = document.getElementById('unit-price-subcategory-select');

        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            categories.forEach(category => {
                if (category.parentId !== null) { // サブカテゴリのみを対象
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    subcategorySelect.appendChild(option);
                }
            });
        } else {
            console.error('unit-price-subcategory-select が見つかりません。');
            showErrorModal('単価サブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 単価編集フォームを表示する関数
 * @param {Object} unitPrice - 編集する単価情報
 */
export function showEditUnitPriceForm(unitPrice) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>単価を編集</h3>
                <label>サブカテゴリID: <input type="number" id="edit-unit-price-subcategoryId" value="${unitPrice.subcategoryId}" disabled></label><br>
                <label>階層: <input type="number" id="edit-unit-price-tier" value="${unitPrice.tier}"></label><br>
                <label>価格: <input type="number" id="edit-unit-price-price" value="${unitPrice.price}"></label><br>
                <button id="save-unit-price-button">保存</button>
                <button id="cancel-unit-price-button">キャンセル</button>
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
    const saveButton = editForm.querySelector('#save-unit-price-button');
    saveButton.addEventListener('click', () => {
        const editedTier = Number(editForm.querySelector('#edit-unit-price-tier').value.trim());
        const editedPrice = Number(editForm.querySelector('#edit-unit-price-price').value.trim());

        if (!isNaN(editedTier) && !isNaN(editedPrice)) {
            const updatedUnitPrice = {
                id: unitPrice.id,
                subcategoryId: unitPrice.subcategoryId,
                tier: editedTier,
                price: editedPrice
            };

            const transaction = db.transaction(['unitPrices'], 'readwrite');
            const store = transaction.objectStore('unitPrices');

            const updateRequest = store.put(updatedUnitPrice);

            updateRequest.onsuccess = () => {
                console.log('単価が正常に更新されました。');
                document.body.removeChild(editForm);
                displayUnitPrices();
            };

            updateRequest.onerror = (event) => {
                console.error('単価の更新中にエラーが発生しました:', event.target.error);
                showErrorModal('単価の更新中にエラーが発生しました。');
            };
        } else {
            alert('階層と価格を正しく入力してください。');
        }
    });

    // キャンセルボタンのイベントリスナー
    const cancelButton = editForm.querySelector('#cancel-unit-price-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * 全体在庫を表示する関数
 */
export function displayGlobalInventory() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readonly');
    const store = transaction.objectStore('globalInventory');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const globalInventory = event.target.result;
        const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');

        if (globalInventoryTableBody) {
            globalInventoryTableBody.innerHTML = '';

            globalInventory.forEach(item => {
                const row = globalInventoryTableBody.insertRow();
                row.insertCell(0).textContent = item.name;
                row.insertCell(1).textContent = item.quantity;

                // 編集ボタンの作成
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'inventory-edit-button';
                editButton.addEventListener('click', () => {
                    showEditInventoryForm(item);
                });
                row.insertCell(2).appendChild(editButton);

                // 削除ボタンの作成
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'inventory-delete-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm(`${item.name} を削除しますか？`)) {
                        deleteInventoryItem(item.id);
                    }
                });
                row.insertCell(3).appendChild(deleteButton);
            });
        } else {
            console.error("global-inventory-tableのtbodyが見つかりません。");
            showErrorModal('全体在庫の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('全体在庫の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('全体在庫の取得中にエラーが発生しました。');
    };
}

/**
 * 在庫アイテムを削除する関数
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
        displayGlobalInventory();  // 再表示
    };

    deleteRequest.onerror = (event) => {
        console.error('在庫削除中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫削除中にエラーが発生しました。');
    };
}

/**
 * 在庫編集フォームを表示する関数
 * @param {Object} inventoryItem - 編集する在庫アイテム
 */
export function showEditInventoryForm(inventoryItem) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>在庫を編集</h3>
                <label>商品名: <input type="text" id="edit-inventory-name" value="${inventoryItem.name}"></label><br>
                <label>数量: <input type="number" id="edit-inventory-quantity" value="${inventoryItem.quantity}"></label><br>
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
    saveButton.addEventListener('click', () => {
        const editedName = editForm.querySelector('#edit-inventory-name').value.trim();
        const editedQuantity = Number(editForm.querySelector('#edit-inventory-quantity').value.trim());

        if (editedName && !isNaN(editedQuantity)) {
            const updatedInventory = {
                id: inventoryItem.id,
                name: editedName,
                quantity: editedQuantity
            };

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
        } else {
            alert('商品名と数量を正しく入力してください。');
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
        console.error('Database is not initialized.');
        return;
    }

    const testItems = [
        { subcategoryId: 1, name: '商品A', quantity: 100 },
        { subcategoryId: 2, name: '商品B', quantity: 50 },
        { subcategoryId: 3, name: '商品C', quantity: 200 }
    ];

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');

    testItems.forEach(item => {
        store.add(item).onsuccess = () => {
            console.log(`テストデータ '${item.name}' が追加されました。`);
        };

        store.add(item).onerror = (event) => {
            console.error(`テストデータ '${item.name}' の追加中にエラーが発生しました:`, event.target.error);
        };
    });
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('inventory.js が正しく読み込まれました。');
