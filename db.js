// db.js

import { displayGlobalInventory } from './inventoryManagement.js'; // 修正後のファイルからインポート
import { showErrorModal } from './errorHandling.js'; // エラー表示のためのモーダルインポート

export let db;

/**
 * データベースの初期化を行う関数
 * @returns {Promise<void>} データベースの初期化が完了したら解決される
 */
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('inventoryDB', 18); // バージョン番号を18に更新

        request.onupgradeneeded = function(event) {
            db = event.target.result;

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
            let globalInventoryStore;
            if (!db.objectStoreNames.contains('globalInventory')) {
                globalInventoryStore = db.createObjectStore('globalInventory', {
                    keyPath: 'id',
                    autoIncrement: true
                });
            } else {
                globalInventoryStore = event.currentTarget.transaction.objectStore('globalInventory');
            }

            // 必要なインデックスを確認または作成
            if (!globalInventoryStore.indexNames.contains('productId')) {
                globalInventoryStore.createIndex('productId', 'productId', { unique: false });
            }
            if (!globalInventoryStore.indexNames.contains('subcategoryId')) {
                globalInventoryStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
            }
            if (!globalInventoryStore.indexNames.contains('quantity')) {
                globalInventoryStore.createIndex('quantity', 'quantity', { unique: false });
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
            db = event.target.result;
            console.log('Database initialized successfully.');
            resolve();
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.error);
        };
    });
}

/**
 * データベースを削除する関数
 */
export function deleteDatabase() {
    const deleteRequest = indexedDB.deleteDatabase('inventoryDB');

    deleteRequest.onsuccess = () => {
        console.log('データベースが正常に削除されました。');
        initializeDatabase().then(() => {
            console.log('データベースが再初期化されました。');
        }).catch(error => {
            console.error('データベースの再初期化中にエラーが発生しました:', error);
        });
    };

    deleteRequest.onerror = (event) => {
        console.error('データベースの削除中にエラーが発生しました:', event.target.error);
    };

    deleteRequest.onblocked = () => {
        console.warn('データベースの削除がブロックされました。');
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

// テスト用のログ（正常に読み込まれているか確認）
console.log('db.js が正しく読み込まれました。');
