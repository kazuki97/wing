// ui.js
import { initializeDatabase, db } from './db.js';
import { initializeTransactionUI, processTransaction, currentTransaction } from './transactions.js';
import { updateCategorySelects, displayCategories } from './categories.js';
import { displaySales } from './transactions.js';
import { displayUnitPrices } from './inventory.js';
import { displayGlobalInventory } from './inventory.js';
import { initializeEventListeners } from './eventListeners.js';
import { showErrorModal } from './errorHandling.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
});

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

// セクションの表示切替関数
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
