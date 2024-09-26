// categories.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';
import { updateCategorySelects, displayCategories } from './categories.js';

/**
 * カテゴリをデータベースに保存する関数
 * @param {Object} category - 保存するカテゴリ情報
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
        updateCategorySelects();
        displayCategories();
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

                const editParentButton = document.createElement('button');
                editParentButton.textContent = '編集';
                editParentButton.className = 'category-button';
                editParentButton.addEventListener('click', () => {
                    showEditCategoryForm(parentCategory);
                });
                parentDiv.appendChild(editParentButton);

                const deleteParentButton = document.createElement('button');
                deleteParentButton.textContent = '削除';
                deleteParentButton.className = 'category-button';
                deleteParentButton.addEventListener('click', () => {
                    if (confirm('このカテゴリとそのサブカテゴリを削除しますか？')) {
                        deleteCategoryAndSubcategories(parentCategory.id);
                    }
                });
                parentDiv.appendChild(deleteParentButton);

                // サブカテゴリを表示
                const subcategories = categories.filter(cat => cat.parentId === parentCategory.id);
                subcategories.forEach(subcategory => {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subcategory';
                    subDiv.textContent = ` - ${subcategory.name}`;

                    const editSubButton = document.createElement('button');
                    editSubButton.textContent = '編集';
                    editSubButton.className = 'category-button';
                    editSubButton.addEventListener('click', () => {
                        showEditCategoryForm(subcategory);
                    });
                    subDiv.appendChild(editSubButton);

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
 * カテゴリとそのサブカテゴリを削除する関数
 * @param {number} categoryId - 削除するカテゴリのID
 */
function deleteCategoryAndSubcategories(categoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');

    // 親カテゴリを削除
    store.delete(categoryId);

    // サブカテゴリを取得して削除
    const subRequest = index.getAll(categoryId);
    subRequest.onsuccess = (event) => {
        const subcategories = event.target.result;
        subcategories.forEach(subcategory => {
            store.delete(subcategory.id);
        });
    };

    subRequest.onerror = (event) => {
        console.error('Error fetching subcategories for deletion:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };

    transaction.oncomplete = () => {
        console.log(`Category ID ${categoryId} and its subcategories deleted successfully.`);
        displayCategories();
        updateCategorySelects();
    };

    transaction.onerror = (event) => {
        console.error('Error deleting category and subcategories:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

/**
 * カテゴリを編集する関数（モーダルの表示など）
 * @param {Object} category - 編集するカテゴリオブジェクト
 */
function showEditCategoryForm(category) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>カテゴリを編集</h3>
                <label>カテゴリ名: <input type="text" id="edit-category-name" value="${category.name}"></label><br>
                <button id="save-edit-button">保存</button>
                <button id="cancel-edit-button">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(editForm);

    const modal = editForm.querySelector('.modal');
    const closeButton = editForm.querySelector('.close-button');

    modal.style.display = 'block';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    const saveButton = editForm.querySelector('#save-edit-button');
    saveButton.addEventListener('click', () => {
        const editedName = editForm.querySelector('#edit-category-name').value.trim();

        if (editedName) {
            category.name = editedName;

            const transaction = db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');

            const updateRequest = store.put(category);

            updateRequest.onsuccess = () => {
                console.log(`Category "${category.name}" updated successfully.`);
                document.body.removeChild(editForm);
                updateCategorySelects();
                displayCategories();
            };

            updateRequest.onerror = (event) => {
                console.error('Error updating category:', event.target.error);
                showErrorModal('カテゴリの更新中にエラーが発生しました。');
            };
        } else {
            alert('カテゴリ名を入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-edit-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * カテゴリを削除する関数
 * @param {number} categoryId - 削除するカテゴリのID
 */
function deleteCategory(categoryId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    store.delete(categoryId);

    transaction.oncomplete = () => {
        console.log(`Category with ID ${categoryId} deleted successfully.`);
        displayCategories();
        updateCategorySelects();
    };

    transaction.onerror = (event) => {
        console.error('Error deleting category:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}
