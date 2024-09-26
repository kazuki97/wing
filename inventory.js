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
 * 単価の表示を行う関数
 */
export function displayUnitPrices() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readonly');
    const store = transaction.objectStore('unitPrices');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const unitPrices = event.target.result;
        const unitPriceTableBody = document.getElementById('unit-price-table')?.getElementsByTagName('tbody')[0];
        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            unitPrices.forEach(unitPrice => {
                const row = unitPriceTableBody.insertRow();
                row.insertCell(0).textContent = unitPrice.subcategoryId;
                row.insertCell(1).textContent = unitPrice.tier;
                row.insertCell(2).textContent = unitPrice.price;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'unit-price-button';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(unitPrice);
                });
                row.insertCell(3).appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'unit-price-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この単価を削除しますか？')) {
                        const deleteTransaction = db.transaction(['unitPrices'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('unitPrices');
                        deleteStore.delete(unitPrice.id);

                        deleteTransaction.oncomplete = () => {
                            console.log('単価が正常に削除されました。');
                            displayUnitPrices();
                        };

                        deleteTransaction.onerror = (event) => {
                            console.error('単価の削除中にエラーが発生しました:', event.target.error);
                            showErrorModal('単価の削除中にエラーが発生しました。');
                        };
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
 * 在庫を表示する関数
 */
export function displayInventory() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const products = event.target.result;
        const inventoryTableBody = document.getElementById('inventory-table')?.getElementsByTagName('tbody')[0];
        if (inventoryTableBody) {
            inventoryTableBody.innerHTML = '';

            products.forEach(product => {
                const row = inventoryTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;

                // 編集ボタンの作成
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'inventory-edit-button';
                editButton.addEventListener('click', () => {
                    showEditInventoryForm(product);
                });
                row.insertCell(2).appendChild(editButton);

                // 削除ボタンの作成
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'inventory-delete-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm(`${product.name} を削除しますか？`)) {
                        const deleteTransaction = db.transaction(['products'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('products');
                        deleteStore.delete(product.id);

                        deleteTransaction.oncomplete = () => {
                            console.log(`${product.name} が削除されました。`);
                            displayInventory();  // 再表示
                        };

                        deleteTransaction.onerror = (event) => {
                            console.error('在庫削除中にエラーが発生しました:', event.target.error);
                            showErrorModal('在庫削除中にエラーが発生しました。');
                        };
                    }
                });
                row.insertCell(3).appendChild(deleteButton);
            });
        } else {
            console.error("inventory-tableのtbodyが見つかりません。");
            showErrorModal('在庫一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('在庫の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫の取得中にエラーが発生しました。');
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

    modal.style.display = 'block';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

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

            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');

            const updateRequest = store.put(updatedInventory);

            updateRequest.onsuccess = () => {
                console.log('在庫が正常に更新されました。');
                document.body.removeChild(editForm);
                displayInventory();  // 更新後に再表示
            };

            updateRequest.onerror = (event) => {
                console.error('在庫の更新中にエラーが発生しました:', event.target.error);
                showErrorModal('在庫の更新中にエラーが発生しました。');
            };
        } else {
            alert('商品名と数量を正しく入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-inventory-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * 単価サブカテゴリセレクトを更新する関数
 */
export function updateUnitPriceSubcategorySelect() {
    if (!db) {
        console.error('Database is not initialized.');
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

// テスト用のログ（正常に読み込まれているか確認）
console.log('inventory.js が正しく読み込まれました。');
