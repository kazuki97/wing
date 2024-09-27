// main.js
import { initializeUI } from './ui.js';
import { initializeDatabase } from './db.js';
import { addTestInventoryItems, addTestProducts } from './inventory.js'; // 必要に応じて追加

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase()
        .then(() => {
            initializeUI();
            addTestProducts();        // テスト製品を追加（必要に応じて）
            addTestInventoryItems();  // テスト在庫を追加（必要に応じて）
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
        });
});
