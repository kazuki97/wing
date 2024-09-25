// categories.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';
import { updateProductCategorySelects } from './products.js';
import { updateGlobalSubcategorySelect, updateUnitPriceSubcategorySelect } from './inventory.js';

export function updateCategorySelects() {
    if (!db) {
        console.error('Database is not initialized.');
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
            document.getElementById('unit-price-parent-category-select')
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

        updateProductCategorySelects();
        updateGlobalSubcategorySelect();
        updateUnitPriceSubcategorySelect();

        displayCategories();
    };

    request.onerror = (event) => {
        console.error('Error fetching categories:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

export function saveCategoryToDB(category) {
    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const addRequest = store.add(category);

    addRequest.onsuccess = () => {
        console.log(`Category "${category.name}" saved successfully.`);
        updateCategorySelects();
        displayCategories();
    };

    addRequest.onerror = (event) => {
        console.error('Error saving category:', event.target.error);
        showErrorModal('カテゴリの保存中にエラーが発生しました。');
    };
}

export function displayCategories() {
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
                            displayCategories();
                            updateCategorySelects();
                        };

                        transaction.onerror = (event) => {
                            console.error('Error updating category:', event.target.error);
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
                        deleteCategoryAndSubcategories(parentCategory.id);
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
                                displayCategories();
                                updateCategorySelects();
                            };

                            transaction.onerror = (event) => {
                                console.error('Error updating subcategory:', event.target.error);
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

function deleteCategoryAndSubcategories(categoryId) {
    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');

    store.delete(categoryId);

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

function deleteCategory(categoryId) {
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
