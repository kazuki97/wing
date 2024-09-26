// categories.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 親カテゴリとサブカテゴリのセレクトボックスを更新する関数
 */
export function updateCategorySelects() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');
    const request = index.getAll(null); // parentIdがnullのカテゴリ（親カテゴリ）のみを取得

    request.onsuccess = (event) => {
        const parentCategories = event.target.result;

        // 親カテゴリセレクトボックスのIDリスト
        const parentCategorySelectIds = [
            'parent-category-select',
            'product-parent-category-select',
            'inventory-parent-category-select',
            'unit-price-parent-category-select'
        ];

        parentCategorySelectIds.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // セレクトボックスの既存のオプションをクリア
                select.innerHTML = '';

                // デフォルトのオプションを追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = '親カテゴリを選択';
                select.appendChild(defaultOption);

                // 親カテゴリのオプションを追加
                parentCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    select.appendChild(option);
                });
            }
        });

        // カテゴリ一覧の更新
        displayCategories();
    };

    request.onerror = (event) => {
        console.error('Error fetching parent categories:', event.target.error);
        showErrorModal('親カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * カテゴリをデータベースに保存する関数
 * @param {Object} category - 保存するカテゴリ情報
 * 例: { name: 'カテゴリ名', parentId: null } // 親カテゴリ
 *      { name: 'サブカテゴリ名', parentId: 親カテゴリのID } // サブカテゴリ
 */
export function saveCategoryToDB(category) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    // parentIdが未定義または空の場合はnullに設定
    if (typeof category.parentId === 'undefined' || category.parentId === '') {
        category.parentId = null;
    } else {
        // parentIdを数値に変換
        const parsedParentId = Number(category.parentId);
        if (!isNaN(parsedParentId)) {
            category.parentId = parsedParentId;
        } else {
            category.parentId = null;
            console.warn(`Invalid parentId "${category.parentId}" provided. Setting parentId to null.`);
        }
    }

    // デバッグ用ログ
    console.log('Saving category:', category);

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const addRequest = store.add(category);

    addRequest.onsuccess = () => {
        console.log(`Category "${category.name}" saved successfully with parentId: ${category.parentId}`);
        updateCategorySelects(); // セレクトボックスを更新
    };

    addRequest.onerror = (event) => {
        console.error('Error saving category:', event.target.error);
        showErrorModal('カテゴリの保存中にエラーが発生しました。');
    };
}

/**
 * カテゴリ一覧を表示する関数
 */
export function displayCategories() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;

        // デバッグ用ログ
        console.log('全カテゴリの取得結果:', categories);

        const categoryList = document.getElementById('category-list');
        if (categoryList) {
            categoryList.innerHTML = '';

            const parentCategories = categories.filter(cat => cat.parentId === null);
            parentCategories.forEach(parentCategory => {
                const parentDiv = document.createElement('div');
                parentDiv.className = 'parent-category';
                parentDiv.textContent = parentCategory.name;

                // 編集ボタン
                const editParentButton = document.createElement('button');
                editParentButton.textContent = '編集';
                editParentButton.className = 'category-button';
                editParentButton.addEventListener('click', () => {
                    showEditCategoryForm(parentCategory);
                });
                parentDiv.appendChild(editParentButton);

                // 削除ボタン
                const deleteParentButton = document.createElement('button');
                deleteParentButton.textContent = '削除';
                deleteParentButton.className = 'category-button';
                deleteParentButton.addEventListener('click', () => {
                    if (confirm('このカテゴリとそのサブカテゴリを削除しますか？')) {
                        deleteCategoryAndSubcategories(parentCategory.id);
                    }
                });
                parentDiv.appendChild(deleteParentButton);

                // サブカテゴリの表示
                const subcategories = categories.filter(cat => cat.parentId === parentCategory.id);
                subcategories.forEach(subcategory => {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subcategory';
                    subDiv.textContent = ` - ${subcategory.name}`;

                    // 編集ボタン
                    const editSubButton = document.createElement('button');
                    editSubButton.textContent = '編集';
                    editSubButton.className = 'category-button';
                    editSubButton.addEventListener('click', () => {
                        showEditCategoryForm(subcategory);
                    });
                    subDiv.appendChild(editSubButton);

                    // 削除ボタン
                    const deleteSubButton = document.createElement('button');
                    deleteSubButton.textContent = '削除';
                    deleteSubButton.className = 'category-button';
                    deleteSubButton.addEventListener('click', () => {
                        if (confirm('このサブカテゴリを削除しますか？')) {
                            deleteCategory(subcategory.id);
                        }
                    });
                    subDiv.appendChild(deleteSubButton);

                    parentDiv.appendChild(subDiv);
                });

                categoryList.appendChild(parentDiv);
            });
        } else {
            console.error("category-list が見つかりません。");
            showErrorModal('カテゴリ一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching categories for display:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * カテゴリ編集フォームを表示する関数
 * @param {Object} category - 編集するカテゴリオブジェクト
 */
function showEditCategoryForm(category) {
    const editForm = document.createElement('div');
    editForm.className = 'modal edit-form';
    editForm.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h3>カテゴリを編集</h3>
            <form>
                <label>カテゴリ名: <input type="text" id="edit-category-name" value="${category.name}" required></label><br>
                <button type="submit">保存</button>
                <button type="button" id="cancel-edit-category">キャンセル</button>
            </form>
        </div>
    `;

    document.body.appendChild(editForm);

    const modal = editForm.querySelector('.modal-content');
    const closeButton = editForm.querySelector('.close-button');
    const cancelButton = editForm.querySelector('#cancel-edit-category');
    const form = editForm.querySelector('form');

    // モーダルを表示
    editForm.style.display = 'block';

    // 閉じるボタンのイベントリスナー
    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    // キャンセルボタンのイベントリスナー
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    // 保存ボタンのイベントリスナー
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // フォームのデフォルト送信を防ぐ
        const newName = editForm.querySelector('#edit-category-name').value.trim();
        if (newName === '') {
            alert('カテゴリ名を入力してください。');
            return;
        }

        // カテゴリの更新
        category.name = newName;
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const updateRequest = store.put(category);

        updateRequest.onsuccess = () => {
            console.log(`Category "${category.name}" updated successfully.`);
            document.body.removeChild(editForm);
            updateCategorySelects(); // セレクトボックスを更新
            displayCategories(); // カテゴリ一覧を更新
        };

        updateRequest.onerror = (event) => {
            console.error('Error updating category:', event.target.error);
            showErrorModal('カテゴリの更新中にエラーが発生しました。');
        };
    });
}

/**
 * カテゴリを削除する関数（サブカテゴリなし）
 * @param {number} categoryId - 削除するカテゴリのID
 */
export function deleteCategory(categoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const deleteRequest = store.delete(categoryId);

    deleteRequest.onsuccess = () => {
        console.log(`Category with ID ${categoryId} deleted successfully.`);
        updateCategorySelects(); // セレクトボックスを更新
        displayCategories(); // カテゴリ一覧を更新
    };

    deleteRequest.onerror = (event) => {
        console.error('Error deleting category:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

/**
 * カテゴリとそのサブカテゴリを削除する関数
 * @param {number} categoryId - 親カテゴリのID
 */
export function deleteCategoryAndSubcategories(categoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');
    const subcategoriesRequest = index.getAll(categoryId);

    subcategoriesRequest.onsuccess = (event) => {
        const subcategories = event.target.result;
        subcategories.forEach(subcategory => {
            store.delete(subcategory.id);
        });
    };

    subcategoriesRequest.onerror = (event) => {
        console.error('Error fetching subcategories for deletion:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };

    transaction.oncomplete = () => {
        console.log(`Category ID ${categoryId} and its subcategories deleted successfully.`);
        updateCategorySelects(); // セレクトボックスを更新
        displayCategories(); // カテゴリ一覧を更新
    };

    transaction.onerror = (event) => {
        console.error('Error deleting category and subcategories:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}
