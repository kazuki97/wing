import { displayGlobalInventory, initializeInventorySection, updateInventoryParentCategorySelect } from './inventoryManagement.js'; // 修正: 分割後のファイルからインポート
import { showErrorModal } from './errorHandling.js'; // エラー表示のためのモーダルインポート

export let db;

/**
 * データベースの初期化を行う関数
 * @returns {Promise<void>} データベースの初期化が完了したら解決される
 */
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('inventoryDB', 19); // **バージョン番号を19に更新**

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
    db = event.target.result;
    console.log('Database initialized successfully.');

    // globalInventory オブジェクトストアの存在確認
    if (db.objectStoreNames.contains('globalInventory')) {
        console.log('globalInventory オブジェクトストアは存在します。');
    } else {
        console.error('globalInventory オブジェクトストアが存在しません。');
    }
            // **初期化処理を追加**
            initializeInventorySection();
            updateInventoryParentCategorySelect();

            // **デバッグ用関数を呼び出す**
            debugLogAllCategories();

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
            if (typeof item.productId === 'undefined' || item.productId === null || typeof item.subcategoryId === 'undefined') {
                console.warn('未定義の productId または subcategoryId を持つ在庫アイテム:', item);
                try {
                    await deleteInventoryItem(item.id);
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
        displayGlobalInventory(); 
    };

    deleteRequest.onerror = (event) => {
        console.error('在庫削除中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫削除中にエラーが発生しました。');
    };
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('db.js が正しく読み込まれました。');

/**
 * デバッグ用: 全てのカテゴリをコンソールに表示する関数
 */
function debugLogAllCategories() {
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
