// unitPriceCategoryManagement.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';
import { displayGlobalInventory } from './inventoryManagement.js'; // 必要に応じてインポート

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
        console.error('Databaseが初期化されていません。');
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
        console.error('Databaseが初期化されていません。');
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
 * 単価サブカテゴリセレクトを更新する関数
 */
export function updateUnitPriceSubcategorySelect() {
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
 * 在庫サブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリID
 */
export function updateGlobalSubcategorySelect(parentCategoryId) {
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
                updateGlobalSubcategorySelect(selectedParentCategoryId); // 選択された親カテゴリに基づいてサブカテゴリを更新
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
console.log('unitPriceCategoryManagement.js が正しく読み込まれました。');
