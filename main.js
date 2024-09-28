// main.js
import { initializeUI } from './ui.js';
import { initializeDatabase } from './db.js';
import { showErrorModal } from './errorHandling.js'; // 追加
import { initializeCategories } from './categories.js'; // 追加

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase()
        .then(() => {
            initializeUI();
            initializeCategories(); // 追加: カテゴリの初期化を呼び出す
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            // エラーモーダルを表示
            showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
        });
});
