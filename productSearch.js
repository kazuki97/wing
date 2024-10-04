// productSearch.js

import { showErrorModal } from './errorHandling.js';

/**
 * 商品名で商品を検索する関数
 * @param {string} name - 検索する商品名
 * @param {IDBDatabase} db - データベースオブジェクト
 * @returns {Promise<Object|null>} - 検索結果の商品のオブジェクトまたはnull
 */
export function findProductByName(name, db) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('データベースが初期化されていません。'));
            return;
        }

        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('name');
        const request = index.get(name);

        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result) {
                resolve(result);
            } else {
                resolve(null); // 見つからなかった場合
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * バーコードで商品を検索する関数
 * @param {string} barcode - 検索するバーコード
 * @param {IDBDatabase} db - データベースオブジェクト
 * @returns {Promise<Object|null>} - 検索結果の商品のオブジェクトまたはnull
 */
export function findProductByBarcode(barcode, db) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('データベースが初期化されていません。'));
            return;
        }

        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('barcode');
        const request = index.get(barcode);

        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result) {
                resolve(result);
            } else {
                resolve(null); // 見つからなかった場合
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
