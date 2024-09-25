// db.js
export let db;

export function initializeDatabase() {
    const request = indexedDB.open('inventoryDB', 13);

    request.onupgradeneeded = function(event) {
        db = event.target.result;

        if (!db.objectStoreNames.contains('categories')) {
            const categoryStore = db.createObjectStore('categories', {
                keyPath: 'id',
                autoIncrement: true
            });
            categoryStore.createIndex('parentId', 'parentId', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', {
                keyPath: 'id',
                autoIncrement: true
            });
            productStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: true });
            productStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('sales')) {
            const salesStore = db.createObjectStore('sales', {
                keyPath: 'id',
                autoIncrement: true
            });
            salesStore.createIndex('productName', 'productName', { unique: false });
        }

        if (!db.objectStoreNames.contains('globalInventory')) {
            db.createObjectStore('globalInventory', { keyPath: 'subcategoryId' });
        }

        if (!db.objectStoreNames.contains('unitPrices')) {
            const unitPriceStore = db.createObjectStore('unitPrices', {
                keyPath: 'id',
                autoIncrement: true
            });
            unitPriceStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully.');
        initializeUI();
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
        showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
    };
}
