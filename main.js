// main.js
import { initializeUI } from './ui.js';
import { initializeDatabase } from './db.js';
import { addTestInventoryItems, addTestProducts } from './inventory.js'; // 必要な関数をインポート
import { showErrorModal } from './errorHandling.js'; // エラーハンドリング用のインポート

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase()
        .then(() => {
            initializeUI();
            addTestProducts();        // テスト製品を追加
            addTestInventoryItems();  // テスト在庫を追加
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
        });
});
