// globalInventory.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 全体在庫セクションの初期化を行う関数
 */
export function initializeGlobalInventorySection() {
    // 必要な初期化処理があればここに追加
}

/**
 * 全体在庫を表示する関数
 * @param {number|null} subcategoryId - サブカテゴリID。nullの場合は全て表示
 */
export function displayGlobalInventory(subcategoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');

    let request;
    if (subcategoryId !== null) {
        const index = store.index('subcategoryId');
        request = index.getAll(subcategoryId);
    } else {
        request = store.getAll();
    }

    request.onsuccess = (event) => {
        const products = event.target.result;
        const inventoryTableBody = document.querySelector('#global-inventory-table tbody');
        if (inventoryTableBody) {
            inventoryTableBody.innerHTML = '';

            products.forEach(product => {
                const row = document.createElement('tr');

                const subcategoryIdCell = document.createElement('td');
                subcategoryIdCell.textContent = product.subcategoryId;
                row.appendChild(subcategoryIdCell);

                const quantityCell = document.createElement('td');
                quantityCell.textContent = product.quantity;
                row.appendChild(quantityCell);

                inventoryTableBody.appendChild(row);
            });
        } else {
            console.error("global-inventory-table tbody が見つかりません。");
            showErrorModal('全体在庫の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('全体在庫の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('全体在庫の取得中にエラーが発生しました。');
    };
}
