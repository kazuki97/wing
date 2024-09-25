// ui.js
import { initializeTransactionUI } from './transactions.js';
import { updateCategorySelects, displayCategories } from './categories.js';
import { displaySales } from './transactions.js';
import { displayUnitPrices } from './inventory.js';
import { displayGlobalInventory } from './inventory.js';
import { initializeEventListeners } from './eventListeners.js';
import { showErrorModal } from './errorHandling.js';

/**
 * UIの初期化を行う関数
 */
export function initializeUI() {
    showSection('home');
    initializeTransactionUI();

    // 初期ロード処理
    updateCategorySelects();
    displayCategories();
    displaySales();
    displayUnitPrices();
    displayGlobalInventory();

    // イベントリスナーの初期化
    initializeEventListeners();
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
