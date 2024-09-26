// uiHelpers.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * カテゴリセレクトを更新する関数
 */
export function updateCategorySelects() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const categorySelectElements = document.querySelectorAll('.category-select');

        categorySelectElements.forEach(select => {
            // 現在の選択状態を保持
            const currentValue = select.value;

            // セレクトボックスをクリア
            select.innerHTML = '';

            // 「すべて」を追加
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'すべて';
            select.appendChild(allOption);

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });

            // 元の選択状態を復元
            select.value = currentValue;
        });
    };

    request.onerror = (event) => {
        console.error('Error fetching categories for selects:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}
