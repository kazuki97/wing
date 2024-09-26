// products.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 商品管理セクションのカテゴリセレクトボックスを更新する関数
 */
export function updateProductCategorySelects() {
    const productParentCategorySelect = document.getElementById('product-parent-category-select');
    const productSubcategorySelect = document.getElementById('product-subcategory-select');

    // 親カテゴリのセレクトボックスを更新
    if (productParentCategorySelect) {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const index = store.index('parentId');
        const request = index.getAll(null); // parentIdがnullのものを取得（親カテゴリ）

        request.onsuccess = (event) => {
            const parentCategories = event.target.result;
            productParentCategorySelect.innerHTML = '<option value="">親カテゴリを選択</option>';
            parentCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.text = category.name;
                productParentCategorySelect.appendChild(option);
            });
        };

        request.onerror = (event) => {
            console.error('親カテゴリの取得中にエラーが発生しました:', event.target.error);
            showErrorModal('親カテゴリの取得中にエラーが発生しました。');
        };
    }

    // 親カテゴリ選択時にサブカテゴリを更新
    if (productParentCategorySelect && productSubcategorySelect) {
        productParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = Number(productParentCategorySelect.value);
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(parentCategoryId);

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        productSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

/**
 * 商品をデータベースに保存する関数
 * @param {Object} product - 保存する商品オブジェクト
 */
export function saveProductToDB(product) {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const addRequest = store.put(product);

    addRequest.onsuccess = () => {
        console.log(`Product "${product.name}" saved successfully.`);
        // 商品追加後の処理があればここに追加
    };

    addRequest.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

// 商品編集フォームや商品一覧表示機能はinventory.jsに移動しました。
