// main.js
import { initializeUI } from './ui.js';
import { initializeDatabase } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase()
        .then(() => {
            initializeUI();
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            // 必要に応じてエラーモーダルを表示
            // showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
        });
});
