// main.js

import { initializeUI } from './ui.js';
import { initializeDatabase, deleteDatabase, db } from './db.js'; // db をインポート
import { showErrorModal } from './errorHandling.js';
import { initializeCategories } from './categories.js';
import { initializeInventorySection } from './inventoryManagement.js';

// ページが読み込まれたときにデータベースを初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeDatabase();
        initializeUI();
        initializeCategories();
        initializeInventorySection(db); // db を渡す
    } catch (error) {
        console.error('Database initialization failed:', error);
        showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
    }
});

// データベースリセットボタンの処理
document.getElementById('reset-database').addEventListener('click', async () => {
    if (confirm('本当にデータベースをリセットしますか？すべてのデータが削除されます。')) {
        try {
            await deleteDatabase();
            console.log('データベースがリセットされました。');
            alert('データベースが正常にリセットされました。ページを再読み込みしてください。');
        } catch (error) {
            console.error('データベースのリセット中にエラーが発生しました:', error);
            showErrorModal('データベースのリセット中にエラーが発生しました。');
        }
    }
});
