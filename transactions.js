// transactions.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

export let currentTransaction = {
    salesLocation: null,
    products: []
};

export function initializeTransactionUI() {
    const completeTransactionButton = document.getElementById('complete-transaction');
    const currentTransactionList = document.getElementById('current-transaction-list');

    if (!currentTransactionList) {
        console.error("current-transaction-list が見つかりません。");
        showErrorModal('現在のトランザクション一覧の表示エリアが見つかりません。');
        return;
    }

    window.updateTransactionUI = function() {
        currentTransactionList.innerHTML = '';

        currentTransaction.products.forEach((item, index) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.product.name} - 数量: ${item.quantity}`;
            
            const removeButton = document.createElement('button');
            removeButton.textContent = '削除';
            removeButton.addEventListener('click', () => {
                currentTransaction.products.splice(index, 1);
                updateTransactionUI();
                toggleCompleteButton();
            });

            listItem.appendChild(removeButton);
            currentTransactionList.appendChild(listItem);
        });
    };

    window.toggleCompleteButton = function() {
        if (completeTransactionButton) {
            completeTransactionButton.disabled = currentTransaction.products.length === 0;
        }
    };

    toggleCompleteButton();
    updateTransactionUI();
}

export async function processTransaction() {
    if (!db) {
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

export function displaySales() {
    if (!db) {
        console.error('Database is not initialized.');
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
