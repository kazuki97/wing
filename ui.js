// ui.js
import { initializeTransactionUI } from './transactions.js';
import { updateCategorySelects, displayCategories } from './categories.js';
import { displaySales } from './transactions.js';
import { initializeEventListeners } from './eventListeners.js';
import { showErrorModal } from './errorHandling.js';
import { initializeInventorySection } from './inventory.js';
import { updateProductCategorySelects } from './products.js';

/**
 * UIの初期化を行う関数
 */
export function initializeUI() {
    // データベースの初期化が完了してからUIを初期化する
    import('./db.js').then(({ initializeDatabase }) => {
        initializeDatabase().then(() => {
            // 最初に表示するセクションを設定（例：homeセクション）
            showSection('home');

            // 各種初期化関数を呼び出す
            initializeTransactionUI();
            updateCategorySelects();
            displayCategories();
            displaySales();

            // 商品管理セクションの初期化
            updateProductCategorySelects();

            // 在庫管理セクションの初期化
            initializeInventorySection();

            // イベントリスナーの初期化
            initializeEventListeners();
        }).catch(error => {
            console.error('Database initialization failed:', error);
            showErrorModal('データベースの初期化に失敗しました。');
        });
    }).catch(error => {
        console.error('Error importing db.js:', error);
        showErrorModal('必要なモジュールの読み込みに失敗しました。');
    });
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

// テスト用のログ（正常に読み込まれているか確認）
console.log('ui.js が正しく読み込まれました。');
