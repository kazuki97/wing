// unitPriceCategoryManagement.js

import { showErrorModal } from './errorHandling.js';

/**
 * 単価をデータベースに保存する関数
 * @param {Object} unitPrice - 保存する単価情報
 * @param {IDBDatabase} db - データベースオブジェクト
 * @returns {Promise<void>}
 */
export function saveUnitPriceToDB(unitPrice, db) {
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
            displayUnitPrices(db); // 単価一覧を更新
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function displayUnitPrices(db) {
    if (!db) {
        console.error('Databaseが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readonly');
    const store = transaction.objectStore('unitPrices');
    const request = store.getAll();

    request.onsuccess = async (event) => {
        const unitPrices = event.target.result;
        const unitPriceTableBody = document.querySelector('#unit-price-table tbody');

        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            // 各単価について、サブカテゴリIDからサブカテゴリ名を取得して表示
            for (const unitPrice of unitPrices) {
                const subcategoryName = await getSubcategoryName(unitPrice.subcategoryId, db);
                const unit = unitPrice.unit || '不明';  // 単位を取得

                const row = unitPriceTableBody.insertRow();
                row.insertCell(0).textContent = subcategoryName || 'サブカテゴリ不明';
                row.insertCell(1).textContent = `${unitPrice.minAmount || 0} - ${unitPrice.maxAmount || '不明'}`;
                row.insertCell(2).textContent = unitPrice.price || '不明';
                row.insertCell(3).textContent = unit;  // 単位を表示

                // 編集ボタンの作成
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'unit-price-button';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(unitPrice, db);
                });
                row.insertCell(4).appendChild(editButton);

                // 削除ボタンの作成
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'unit-price-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この単価を削除しますか？')) {
                        deleteUnitPrice(unitPrice.id, db);
                    }
                });
                row.insertCell(5).appendChild(deleteButton); // 削除ボタンは6列目
            }
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function deleteUnitPrice(id, db) {
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
        displayUnitPrices(db); // 削除後、一覧を更新
    };

    deleteRequest.onerror = (event) => {
        console.error('単価の削除中にエラーが発生しました:', event.target.error);
        showErrorModal('単価の削除中にエラーが発生しました。');
    };
}

/**
 * サブカテゴリIDからサブカテゴリ名を取得する関数
 * @param {number} subcategoryId - サブカテゴリのID
 * @param {IDBDatabase} db - データベースオブジェクト
 * @returns {Promise<string>} サブカテゴリ名
 */
function getSubcategoryName(subcategoryId, db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.get(subcategoryId);

        request.onsuccess = (event) => {
            const category = event.target.result;
            if (category) {
                resolve(category.name);
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => {
            reject(new Error('サブカテゴリ名の取得中にエラーが発生しました。'));
        };
    });
}

/**
 * 単価サブカテゴリセレクトを更新する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function updateUnitPriceSubcategorySelect(db) {
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
 * 単位セレクトボックスを設定する関数
 */
export function setupUnitSelect() {
    const unitSelect = document.getElementById('unit-price-unit-select');
    if (unitSelect) {
        unitSelect.innerHTML = `
            <option value="ml">ml</option>
            <option value="g">g</option>
            <option value="個">個</option>
        `;
    }
}

/**
 * 単価編集フォームを表示する関数（必要に応じて実装）
 * @param {Object} unitPrice - 編集対象の単価オブジェクト
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function showEditUnitPriceForm(unitPrice, db) {
    // ここに編集フォームの実装を追加します
    // 編集後、データベースを更新し、displayUnitPrices(db) を呼び出して一覧を更新します
}

// テスト用のログ（正常に読み込まれたことを確認）
console.log('unitPriceCategoryManagement.js が正しく読み込まれました。');
