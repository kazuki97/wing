// inventory-management.js
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
    console.log('displayGlobalInventory called with subcategoryId:', selectedSubcategoryId);

    if (!db) {
        console.error('Database is not initialized.');
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
 * 在庫管理セクションの初期化
 */
export function initializeInventorySection() {
    updateInventoryParentCategorySelect(); // 親カテゴリセレクトボックスを初期化
}
