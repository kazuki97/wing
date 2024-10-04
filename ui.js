// ui.js
import { initializeTransactionUI } from './transactions.js';
import { updateCategorySelects, displayCategories } from './categories.js';
import { displaySales } from './transactions.js';
import { displayUnitPrices } from './unitPriceCategoryManagement.js'; // 修正: 単価管理機能は unitPriceCategoryManagement.js に移動
import { displayGlobalInventory } from './inventoryManagement.js'; // 修正: 在庫管理機能は inventoryManagement.js に移動
import { initializeEventListeners } from './eventListeners.js';
import { showErrorModal } from './errorHandling.js';

/**
 * UIの初期化を行う関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function initializeUI(db) {
    showSection('home');
    initializeTransactionUI(db);

    // 初期ロード処理
    updateCategorySelects(db);
    displayCategories(db);
    displaySales(db);
    displayUnitPrices(db);
    displayGlobalInventory(db);

    // イベントリスナーの初期化
    initializeEventListeners(db);
}

/**
 * 指定されたセクションを表示し、他を非表示にする関数
 * @param {string} section - 表示するセクションの名前（idのプレフィックス）
 */
export function showSection(section) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(sec => {
        sec.style.display = 'none';
    });

    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        console.error(`セクション "${section}-section" が見つかりません。`);
        showErrorModal(`セクション "${section}" が見つかりません。`);
    }
}

// その他のUI関連関数があればここに追加

// テスト用のログ（正常に読み込まれたことを確認）
console.log('ui.js が正しく読み込まれました。');
