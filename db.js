// db.js
export let db;

/**
 * データベースの初期化を行う関数
 * @returns {Promise<void>} データベースの初期化が完了したら解決される
 */
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('inventoryDB', 14); // バージョン番号を14に更新

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

            // グローバル在庫ストアの作成
            if (!db.objectStoreNames.contains('globalInventory')) {
                const globalInventoryStore = db.createObjectStore('globalInventory', {
                    keyPath: 'id',          // keyPathを'subcategoryId'から'id'に変更
                    autoIncrement: true     // 自動インクリメントを有効にする
                });
                globalInventoryStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
                globalInventoryStore.createIndex('name', 'name', { unique: false });
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

            // データベースのバージョンが変更された場合、不要なオブジェクトストアを削除することも検討できます
            // ただし、データ損失に注意が必要です

            resolve(); // 初期化が完了したことを通知
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.errorCode);
            reject(event.target.error); // エラーを通知
        };
    });
}
