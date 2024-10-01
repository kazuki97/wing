// db.js

import { displayGlobalInventory } from './inventoryManagement.js';
import { showErrorModal } from './errorHandling.js';

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
                    keyPath: 'id',          // 修正箇所：keyPathを 'id' に設定
                    autoIncrement: true     // 自動増分を有効にする
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

// テスト用のログ（正常に読み込まれているか確認）
console.log('db.js が正しく読み込まれました。');
