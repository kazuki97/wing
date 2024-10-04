// db.js

import { showErrorModal } from './errorHandling.js'; // エラー表示のためのモーダルインポート

/**
 * データベースの初期化を行う関数
 * @returns {Promise<IDBDatabase>} データベースオブジェクトを返す
 */
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('inventoryDB', 19); // **バージョン番号を19に更新**

        request.onupgradeneeded = function(event) {
            const db = event.target.result;

            // カテゴリストアの作成
            if (!db.objectStoreNames.contains('categories')) {
                const categoryStore = db.createObjectStore('categories', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                categoryStore.createIndex('parentId', 'parentId', { unique: false });
            }

            // 商品ストアの作成
            if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                productStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
                productStore.createIndex('barcode', 'barcode', { unique: true });
                productStore.createIndex('name', 'name', { unique: false });
            }

            // 売上ストアの作成
            if (!db.objectStoreNames.contains('sales')) {
                const salesStore = db.createObjectStore('sales', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                salesStore.createIndex('productName', 'productName', { unique: false });
            }

            // グローバル在庫ストアの作成または更新
            if (!db.objectStoreNames.contains('globalInventory')) {
                const globalInventoryStore = db.createObjectStore('globalInventory', {
                    keyPath: 'id',          // **修正点：keyPathを 'id' に設定**
                    autoIncrement: true     // **修正点：自動増分を有効にする**
                });
                globalInventoryStore.createIndex('productId', 'productId', { unique: false });
                globalInventoryStore.createIndex('subcategoryId', 'subcategoryId', { unique: false }); // **修正点：subcategoryIdのインデックスを追加**
                globalInventoryStore.createIndex('name', 'name', { unique: false });
                globalInventoryStore.createIndex('quantity', 'quantity', { unique: false });
            } else {
                const transaction = event.target.transaction;
                const store = transaction.objectStore('globalInventory');

                if (!store.indexNames.contains('productId')) {
                    store.createIndex('productId', 'productId', { unique: false });
                    console.log('productId インデックスを globalInventory ストアに追加しました。');
                }
                if (!store.indexNames.contains('subcategoryId')) {
                    store.createIndex('subcategoryId', 'subcategoryId', { unique: false });
                    console.log('subcategoryId インデックスを globalInventory ストアに追加しました。');
                }
            }

            // 単価ストアの作成
            if (!db.objectStoreNames.contains('unitPrices')) {
                const unitPriceStore = db.createObjectStore('unitPrices', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                unitPriceStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
            }

            console.log('Database upgrade completed.');
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            console.log('Database initialized successfully.');

            // globalInventory オブジェクトストアの存在確認
            if (db.objectStoreNames.contains('globalInventory')) {
                console.log('globalInventory オブジェクトストアは存在します。');
            } else {
                console.error('globalInventory オブジェクトストアが存在しません。');
            }

            // 必要に応じて他の初期化処理をここに記述

            resolve(db); // データベースオブジェクトを返す
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.error);
        };
    });
}

/**
 * データベースを削除する関数
 * @returns {Promise<void>} データベースの削除が完了したら解決される
 */
export function deleteDatabase() {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('inventoryDB');

        deleteRequest.onsuccess = () => {
            console.log('データベースが正常に削除されました。');
            resolve();
        };

        deleteRequest.onerror = (event) => {
            console.error('データベースの削除中にエラーが発生しました:', event.target.error);
            reject(event.target.error);
        };

        deleteRequest.onblocked = () => {
            console.warn('データベースの削除がブロックされました。');
        };
    });
}

/**
 * 在庫データの整合性を確認し、必要に応じて修正する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export async function verifyAndFixInventoryData(db) {
    if (!db) {
        console.error('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');
    const request = store.getAll();

    request.onsuccess = async (event) => {
        const globalInventory = event.target.result;

        for (const item of globalInventory) {
            if (typeof item.productId === 'undefined' || item.productId === null || typeof item.subcategoryId === 'undefined') {
                console.warn('未定義の productId または subcategoryId を持つ在庫アイテム:', item);
                try {
                    await deleteInventoryItem(item.id, db);
                    console.log(`未定義のデータを持つ在庫アイテム (ID: ${item.id}) を削除しました。`);
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
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function deleteInventoryItem(id, db) {
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
        // 必要に応じて在庫表示の更新関数を呼び出す
    };

    deleteRequest.onerror = (event) => {
        console.error('在庫削除中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫削除中にエラーが発生しました。');
    };
}

// テスト用のログ（正常に読み込まれたことを確認）
console.log('db.js が正しく読み込まれました。');

/**
 * デバッグ用: 全てのカテゴリをコンソールに表示する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function debugLogAllCategories(db) {
    if (!db) {
        console.error('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        console.log('データベース内の全カテゴリ:', categories);

        categories.forEach(category => {
            console.log(
                'カテゴリID:', category.id,
                'カテゴリ名:', category.name,
                '親カテゴリID:', category.parentId,
                '親カテゴリIDの型:', typeof category.parentId
            );
        });
    };

    request.onerror = (event) => {
        console.error('カテゴリの取得中にエラーが発生しました:', event.target.error);
    };
}
