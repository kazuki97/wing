import { initializeUI } from './ui.js';
import { initializeDatabase, deleteDatabase } from './db.js';
import { showErrorModal } from './errorHandling.js';
import { initializeCategories } from './categories.js';
// 分割後のファイルに置き換える
import { initializeInventorySection } from './inventoryManagement.js';

// ページが読み込まれたときにデータベースを初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase()
        .then(() => {
            initializeUI();
            initializeCategories(); // カテゴリの初期化を呼び出す
            initializeInventorySection(); // 在庫管理セクションの初期化を呼び出す
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            // エラーモーダルを表示
            showErrorModal('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
        });
});

// データベースリセットボタンの処理
document.getElementById('reset-database').addEventListener('click', () => {
    if (confirm('本当にデータベースをリセットしますか？すべてのデータが削除されます。')) {
        deleteDatabase()
            .then(() => {
                console.log('データベースがリセットされました。');
                alert('データベースが正常にリセットされました。ページを再読み込みしてください。');
            })
            .catch((error) => {
                console.error('データベースのリセット中にエラーが発生しました:', error);
                showErrorModal('データベースのリセット中にエラーが発生しました。');
            });
    }
});
