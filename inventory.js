// inventory.js
import { db, initializeDatabase, verifyAndFixInventoryData } from './db.js';
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

        // productId を使用するように修正
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        const addRequest = store.add({
            productId: inventoryItem.productId, // 正しく productId を使用
            quantity: inventoryItem.quantity
        });

        addRequest.onsuccess = () => {
            console.log('在庫アイテムが正常に追加されました。');
            displayGlobalInventory();
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
 * 商品IDから商品の詳細を取得する関数
 * @param {number} productId - 商品のID
 * @returns {Promise<Object>} - 商品の詳細オブジェクト
 */
function getProductById(productId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('データベースが初期化されていません。'));
            return;
        }

        if (typeof productId === 'undefined' || productId === null) {
            reject(new Error('有効な productId が指定されていません。'));
            return;
        }

        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.get(productId);

        request.onsuccess = (event) => {
            const product = event.target.result;
            if (product) {
                resolve(product);
            } else {
                reject(new Error(`Product with ID ${productId} not found.`));
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * 全体在庫を表示する関数
 */
export async function displayGlobalInventory() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readonly');
    const store = transaction.objectStore('globalInventory');
    const request = store.getAll();

    request.onsuccess = async (event) => {
        const globalInventory = event.target.result;
        console.log('Retrieved global inventory:', globalInventory); // デバッグログ
        const globalInventoryTableBody = document.querySelector('#global-inventory-table tbody');

        if (globalInventoryTableBody) {
            globalInventoryTableBody.innerHTML = '';

            for (const item of globalInventory) {
                if (typeof item.productId === 'undefined' || item.productId === null) {
                    console.error('在庫アイテムに未定義の productId が含まれています:', item);
                    showErrorModal('在庫アイテムに未定義の productId が含まれています。');
                    continue; // このアイテムの処理をスキップ
                }

                try {
                    const product = await getProductById(item.productId);
                    console.log(`Retrieved product for inventory item ID ${item.id}:`, product); // デバッグログ
                    const row = globalInventoryTableBody.insertRow();

                    row.insertCell(0).textContent = product.name;
                    row.insertCell(1).textContent = item.quantity;
                    row.insertCell(2).textContent = product.price;
                    row.insertCell(3).textContent = product.cost;
                    row.insertCell(4).textContent = product.barcode;
                    row.insertCell(5).textContent = product.unitAmount;

                    // 編集ボタンの作成
                    const editButton = document.createElement('button');
                    editButton.textContent = '編集';
                    editButton.className = 'inventory-edit-button';
                    editButton.addEventListener('click', () => {
                        showEditInventoryForm(item, product);
                    });
                    row.insertCell(6).appendChild(editButton);

                    // 削除ボタンの作成
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'inventory-delete-button';
                    deleteButton.addEventListener('click', () => {
                        if (confirm(`${product.name} を削除しますか？`)) {
                            deleteInventoryItem(item.id);
                        }
                    });
                    row.insertCell(7).appendChild(deleteButton);
                } catch (error) {
                    console.error(`商品ID ${item.productId} の取得に失敗しました:`, error);
                    showErrorModal(`商品ID ${item.productId} の取得に失敗しました。`);
                }
            }
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
 * 在庫データの整合性を確認し、必要に応じて修正する関数
 */
export async function verifyAndFixInventoryData() {
    if (!db) {
        console.error('Databaseが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');
    const request = store.getAll();

    request.onsuccess = async (event) => {
        const globalInventory = event.target.result;

        for (const item of globalInventory) {
            if (typeof item.productId === 'undefined' || item.productId === null) {
                console.warn('未定義の productId を持つ在庫アイテム:', item);
                // ここで適切な処理を行います。例えば削除するか、修正する。
                // 以下は削除の例です。
                try {
                    await deleteInventoryItem(item.id);
                    console.log(`未定義の productId を持つ在庫アイテム (ID: ${item.id}) を削除しました。`);
                } catch (error) {
                    console.error(`在庫アイテム (ID: ${item.id}) の削除中にエラーが発生しました:`, error);
                }
            }
        }

        console.log('在庫データの整合性確認が完了しました。');
    };

    request.onerror = (event) => {
        console.error('在庫データの取得中にエラーが発生しました:', event.target.error);
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

// テスト用のログ（正常に読み込まれているか確認）
console.log('inventory.js が正しく読み込まれました。');
