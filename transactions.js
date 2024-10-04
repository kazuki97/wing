// transactions.js

import { showErrorModal } from './errorHandling.js';

/**
 * 現在のトランザクション情報
 */
export let currentTransaction = {
    salesLocation: null,
    products: []
};

/**
 * 完了ボタンとトランザクション一覧のDOM要素
 */
let completeTransactionButtonElement = null;
let currentTransactionListElement = null;

/**
 * トランザクションUIを初期化する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function initializeTransactionUI(db) {
    completeTransactionButtonElement = document.getElementById('complete-transaction');
    currentTransactionListElement = document.getElementById('current-transaction-list');

    if (!currentTransactionListElement) {
        console.error("current-transaction-list が見つかりません。");
        showErrorModal('現在のトランザクション一覧の表示エリアが見つかりません。');
        return;
    }

    // 初期状態でボタンの状態を設定
    toggleCompleteButton();
    updateTransactionUI();

    // 完了ボタンにイベントリスナーを追加
    if (completeTransactionButtonElement) {
        completeTransactionButtonElement.addEventListener('click', () => processTransaction(db));
    }
}

/**
 * トランザクション一覧を更新する関数
 */
export function updateTransactionUI() {
    if (!currentTransactionListElement) {
        console.error("current-transaction-list が見つかりません。");
        showErrorModal('現在のトランザクション一覧の表示エリアが見つかりません。');
        return;
    }

    currentTransactionListElement.innerHTML = '';

    currentTransaction.products.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.product.name} - 数量: ${item.quantity}`;
        
        const removeButton = document.createElement('button');
        removeButton.textContent = '削除';
        removeButton.className = 'remove-button';
        removeButton.addEventListener('click', () => {
            currentTransaction.products.splice(index, 1);
            updateTransactionUI();
            toggleCompleteButton();
        });

        listItem.appendChild(removeButton);
        currentTransactionListElement.appendChild(listItem);
    });
}

/**
 * 完了ボタンの有効/無効を切り替える関数
 */
export function toggleCompleteButton() {
    if (completeTransactionButtonElement) {
        completeTransactionButtonElement.disabled = currentTransaction.products.length === 0;
    }
}

/**
 * トランザクションを処理する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export async function processTransaction(db) {
    if (!db) {
        showErrorModal('データベースが初期化されていません。');
        throw new Error('データベースが初期化されていません。');
    }

    const transaction = db.transaction(['sales', 'products'], 'readwrite');
    const salesStore = transaction.objectStore('sales');
    const productsStore = transaction.objectStore('products');

    currentTransaction.products.forEach(item => {
        const sale = {
            productName: item.product.name,
            quantity: item.quantity,
            date: new Date()
        };
        salesStore.add(sale);

        const updatedProduct = { ...item.product };
        updatedProduct.quantity -= item.quantity;
        productsStore.put(updatedProduct);
    });

    transaction.oncomplete = () => {
        console.log('トランザクションが正常に完了しました。');
        // トランザクション情報をリセット
        currentTransaction = {
            salesLocation: null,
            products: []
        };
        updateTransactionUI();
        toggleCompleteButton();
        alert('トランザクションが完了しました。');
    };

    transaction.onerror = (event) => {
        console.error('トランザクション中にエラーが発生しました:', event.target.error);
        showErrorModal('トランザクションの処理中にエラーが発生しました。');
    };
}

/**
 * 売上一覧を表示する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function displaySales(db) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const sales = event.target.result;
        const salesTableBody = document.getElementById('sales-table')?.getElementsByTagName('tbody')[0];
        if (salesTableBody) {
            salesTableBody.innerHTML = '';

            sales.forEach(sale => {
                const row = salesTableBody.insertRow();
                row.insertCell(0).textContent = sale.productName;
                row.insertCell(1).textContent = sale.quantity;
                row.insertCell(2).textContent = new Date(sale.date).toLocaleString();
            });
        } else {
            console.error("sales-tableのtbodyが見つかりません。");
            showErrorModal('売上一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching sales:', event.target.error);
        showErrorModal('売上の取得中にエラーが発生しました。');
    };
}

// テスト用のログ（正常に読み込まれたことを確認）
console.log('transactions.js が正しく読み込まれました。');
