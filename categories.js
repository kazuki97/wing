// categories.js

import { showErrorModal } from './errorHandling.js';
import { updateProductCategorySelects } from './products.js';
import { 
    updateUnitPriceSubcategorySelect 
} from './unitPriceCategoryManagement.js';

/**
 * カテゴリセレクトを更新する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function updateCategorySelects(db) {
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

        const parentCategorySelects = [
            document.getElementById('parent-category-select'),
            document.getElementById('product-parent-category-select'),
            document.getElementById('global-parent-category-select'),
            document.getElementById('unit-price-parent-category-select'),
            document.getElementById('inventory-parent-category-select') // 追加
        ];

        parentCategorySelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">親カテゴリを選択</option>';

                categories.filter(cat => cat.parentId === null).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    select.appendChild(option);
                });
            }
        });

        // サブカテゴリセレクトの更新
        updateProductCategorySelects(db);
        updateUnitPriceSubcategorySelect(db);

        // inventory-parent-category-selectから選択された親カテゴリIDを取得
        const inventoryParentCategorySelect = document.getElementById('inventory-parent-category-select');
        const selectedParentCategoryId = inventoryParentCategorySelect ? Number(inventoryParentCategorySelect.value) : null;

        updateInventorySubcategorySelect(selectedParentCategoryId, db);

        // カテゴリ一覧の表示
        displayCategories(db);
    };

    request.onerror = (event) => {
        console.error('カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 在庫管理用のサブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function updateInventorySubcategorySelect(parentCategoryId, db) {
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
        const subcategorySelect = document.getElementById('inventory-subcategory-select');

        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

            // デバッグ用ログを追加して確認
            console.log('取得したカテゴリリスト:', categories);
            categories.forEach(category => {
                console.log(
                    'カテゴリID:', category.id,
                    'カテゴリ名:', category.name,
                    '親カテゴリID:', category.parentId,
                    '親カテゴリIDの型:', typeof category.parentId
                );
            });

            // データ型を統一して比較
            const filteredCategories = categories.filter(category => Number(category.parentId) === Number(parentCategoryId));

            // フィルタ結果を確認
            console.log('Filtered Categories:', filteredCategories);

            filteredCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.text = category.name;
                subcategorySelect.appendChild(option);
            });

            if (filteredCategories.length === 0) {
                console.warn('選択された親カテゴリに対応するサブカテゴリが存在しません。');
            }
        } else {
            console.error('inventory-subcategory-select が見つかりません。');
            showErrorModal('サブカテゴリセレクトが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 在庫管理用のサブカテゴリセレクトを更新する関数
 * @param {number} parentCategoryId - 選択された親カテゴリのID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function updateGlobalSubcategorySelectForInventory(parentCategoryId, db) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');
    const request = index.getAll(parentCategoryId);

    request.onsuccess = (event) => {
        const subcategories = event.target.result;
        const subcategorySelect = document.getElementById('inventory-subcategory-select');

        if (subcategorySelect) {
            subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

            subcategories.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.id;
                option.text = subcategory.name;
                subcategorySelect.appendChild(option);
            });

            // サブカテゴリセレクトボックスのイベントリスナーを設定
            subcategorySelect.addEventListener('change', () => {
                const selectedSubcategoryId = Number(subcategorySelect.value);
                console.log('Selected Inventory Subcategory ID:', selectedSubcategoryId); // 追加: 選択されたサブカテゴリIDをログ出力
            });
        }
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * カテゴリをデータベースに保存する関数
 * @param {Object} category - 保存するカテゴリ情報
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function saveCategoryToDB(category, db) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const addRequest = store.add(category);

    addRequest.onsuccess = () => {
        console.log(`Category "${category.name}" saved successfully.`);
        updateCategorySelects(db);
        displayCategories(db);
    };

    addRequest.onerror = (event) => {
        console.error('カテゴリの保存中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの保存中にエラーが発生しました。');
    };
}

/**
 * カテゴリ一覧を表示する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function displayCategories(db) {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const categoryList = document.getElementById('category-list');
        if (categoryList) {
            categoryList.innerHTML = '';

            categories.filter(cat => cat.parentId === null).forEach(parentCategory => {
                const parentDiv = document.createElement('div');
                parentDiv.className = 'parent-category';
                parentDiv.textContent = parentCategory.name;

                const editParentButton = document.createElement('button');
                editParentButton.textContent = '編集';
                editParentButton.className = 'category-button';
                editParentButton.addEventListener('click', () => {
                    const newName = prompt('新しいカテゴリ名を入力してください:', parentCategory.name);
                    if (newName) {
                        parentCategory.name = newName;
                        const transaction = db.transaction(['categories'], 'readwrite');
                        const store = transaction.objectStore('categories');
                        store.put(parentCategory);

                        transaction.oncomplete = () => {
                            console.log(`Category "${newName}" updated successfully.`);
                            displayCategories(db);
                            updateCategorySelects(db);
                        };

                        transaction.onerror = (event) => {
                            console.error('カテゴリの更新中にエラーが発生しました:', event.target.error);
                            showErrorModal('カテゴリの更新中にエラーが発生しました。');
                        };
                    }
                });
                parentDiv.appendChild(editParentButton);

                const deleteParentButton = document.createElement('button');
                deleteParentButton.textContent = '削除';
                deleteParentButton.className = 'category-button';
                deleteParentButton.addEventListener('click', () => {
                    if (confirm('このカテゴリとそのサブカテゴリを削除しますか？')) {
                        deleteCategoryAndSubcategories(parentCategory.id, db);
                    }
                });
                parentDiv.appendChild(deleteParentButton);

                const subcategories = categories.filter(cat => cat.parentId === parentCategory.id);
                subcategories.forEach(subcategory => {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subcategory';
                    subDiv.textContent = ` - ${subcategory.name}`;

                    const editSubButton = document.createElement('button');
                    editSubButton.textContent = '編集';
                    editSubButton.className = 'category-button';
                    editSubButton.addEventListener('click', () => {
                        const newName = prompt('新しいサブカテゴリ名を入力してください:', subcategory.name);
                        if (newName) {
                            subcategory.name = newName;
                            const transaction = db.transaction(['categories'], 'readwrite');
                            const store = transaction.objectStore('categories');
                            store.put(subcategory);

                            transaction.oncomplete = () => {
                                console.log(`Subcategory "${newName}" updated successfully.`);
                                displayCategories(db);
                                updateCategorySelects(db);
                            };

                            transaction.onerror = (event) => {
                                console.error('サブカテゴリの更新中にエラーが発生しました:', event.target.error);
                                showErrorModal('サブカテゴリの更新中にエラーが発生しました。');
                            };
                        }
                    });
                    subDiv.appendChild(editSubButton);

                    const deleteSubButton = document.createElement('button');
                    deleteSubButton.textContent = '削除';
                    deleteSubButton.className = 'category-button';
                    deleteSubButton.addEventListener('click', () => {
                        if (confirm('このサブカテゴリを削除しますか？')) {
                            deleteCategory(subcategory.id, db);
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
        console.error('カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * カテゴリとそのサブカテゴリを削除する関数
 * @param {number} categoryId - 削除するカテゴリのID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function deleteCategoryAndSubcategories(categoryId, db) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');

    // 親カテゴリを削除
    const deleteParentRequest = store.delete(categoryId);

    deleteParentRequest.onsuccess = () => {
        console.log(`Parent category ID ${categoryId} deleted successfully.`);

        // サブカテゴリを取得して削除
        const subRequest = index.getAll(categoryId);
        subRequest.onsuccess = (event) => {
            const subcategories = event.target.result;
            subcategories.forEach(subcategory => {
                store.delete(subcategory.id); // サブカテゴリも削除
            });

            console.log(`Subcategories of parent category ID ${categoryId} deleted successfully.`);
        };

        subRequest.onerror = (event) => {
            console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
            showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
        };
    };

    deleteParentRequest.onerror = (event) => {
        console.error('親カテゴリの削除中にエラーが発生しました:', event.target.error);
        showErrorModal('親カテゴリの削除中にエラーが発生しました。');
    };

    transaction.oncomplete = () => {
        displayCategories(db);
        updateCategorySelects(db);
    };

    transaction.onerror = (event) => {
        console.error('カテゴリの削除中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

/**
 * サブカテゴリを削除する関数
 * @param {number} categoryId - 削除するサブカテゴリのID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function deleteCategory(categoryId, db) {
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
        displayCategories(db);
        updateCategorySelects(db);
    };

    deleteRequest.onerror = (event) => {
        console.error('カテゴリの削除中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

/**
 * カテゴリとサブカテゴリの parentId をコンソールに出力する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function logCategoryParentIds(db) {
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
        console.log('カテゴリとサブカテゴリの parentId を表示します:');
        categories.forEach(category => {
            console.log(`ID: ${category.id}, Name: ${category.name}, parentId: ${category.parentId}`);
        });
    };

    request.onerror = (event) => {
        console.error('カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 初期化時にログを出力する関数（オプション）
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function initializeCategories(db) {
    updateCategorySelects(db);
    displayCategories(db);
    logCategoryParentIds(db); // 追加: parentId のログ出力
}

// テスト用のログ（正常に読み込まれたことを確認）
console.log('categories.js が正しく読み込まれました。');
