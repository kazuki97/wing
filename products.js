// products.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 商品セレクトボックスを更新する関数
 */
export function updateProductCategorySelects() {
    const parentCategorySelect = document.getElementById('product-parent-category-select');
    const subcategorySelect = document.getElementById('product-subcategory-select');

    if (parentCategorySelect) {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const index = store.index('parentId');
        const request = index.getAll(null);

        request.onsuccess = (event) => {
            const parentCategories = event.target.result;
            parentCategorySelect.innerHTML = '<option value="">親カテゴリを選択</option>';
            parentCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.text = category.name;
                parentCategorySelect.appendChild(option);
            });
        };

        request.onerror = (event) => {
            console.error('親カテゴリの取得中にエラーが発生しました:', event.target.error);
            showErrorModal('親カテゴリの取得中にエラーが発生しました。');
        };
    }

    if (parentCategorySelect && subcategorySelect) {
        parentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = Number(parentCategorySelect.value);
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(parentCategoryId);

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        subcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                subcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

/**
 * 商品をデータベースに保存する関数
 * @param {Object} product - 保存する商品情報
 */
export function saveProductToDB(product) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const addRequest = store.add(product);

    addRequest.onsuccess = () => {
        console.log(`Product "${product.name}" saved successfully.`);
        displayProducts();
    };

    addRequest.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

/**
 * 商品一覧を表示する関数
 */
export function displayProducts() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const products = event.target.result;
        const productList = document.getElementById('product-list');
        if (productList) {
            productList.innerHTML = '';

            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product-item';
                productDiv.textContent = product.name;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    showEditProductForm(product);
                });
                productDiv.appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'product-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        deleteProduct(product.id);
                    }
                });
                productDiv.appendChild(deleteButton);

                productList.appendChild(productDiv);
            });
        } else {
            console.error("product-list が見つかりません。");
            showErrorModal('商品一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching products:', event.target.error);
        showErrorModal('商品の取得中にエラーが発生しました。');
    };
}

/**
 * 商品を削除する関数
 * @param {number} productId - 削除する商品のID
 */
function deleteProduct(productId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    store.delete(productId);

    transaction.oncomplete = () => {
        console.log(`Product with ID ${productId} deleted successfully.`);
        displayProducts();
    };

    transaction.onerror = (event) => {
        console.error('Error deleting product:', event.target.error);
        showErrorModal('商品の削除中にエラーが発生しました。');
    };
}

/**
 * 商品編集フォームを表示する関数
 * @param {Object} product - 編集する商品オブジェクト
 */
function showEditProductForm(product) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>商品を編集</h3>
                <label>商品名: <input type="text" id="edit-product-name" value="${product.name}"></label><br>
                <label>数量: <input type="number" id="edit-product-quantity" value="${product.quantity}"></label><br>
                <label>価格: <input type="number" id="edit-product-price" value="${product.price}"></label><br>
                <label>原価: <input type="number" id="edit-product-cost" value="${product.cost}"></label><br>
                <label>バーコード: <input type="text" id="edit-product-barcode" value="${product.barcode}"></label><br>
                <label>サイズ（量）: <input type="number" id="edit-product-unit-amount" value="${product.unitAmount}"></label><br>
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
        const editedName = editForm.querySelector('#edit-product-name').value.trim();
        const editedQuantity = Number(editForm.querySelector('#edit-product-quantity').value.trim());
        const editedPrice = Number(editForm.querySelector('#edit-product-price').value.trim());
        const editedCost = Number(editForm.querySelector('#edit-product-cost').value.trim());
        const editedBarcode = editForm.querySelector('#edit-product-barcode').value.trim();
        const editedUnitAmount = Number(editForm.querySelector('#edit-product-unit-amount').value.trim());

        if (editedName && !isNaN(editedQuantity) && !isNaN(editedPrice) && !isNaN(editedCost) && editedBarcode && !isNaN(editedUnitAmount)) {
            const updatedProduct = {
                id: product.id,
                subcategoryId: product.subcategoryId,
                name: editedName,
                quantity: editedQuantity,
                price: editedPrice,
                cost: editedCost,
                barcode: editedBarcode,
                unitAmount: editedUnitAmount
            };

            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');

            const updateRequest = store.put(updatedProduct);

            updateRequest.onsuccess = () => {
                console.log(`Product "${updatedProduct.name}" updated successfully.`);
                document.body.removeChild(editForm);
                displayProducts();
            };

            updateRequest.onerror = (event) => {
                console.error('Error updating product:', event.target.error);
                showErrorModal('商品の更新中にエラーが発生しました。');
            };
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-edit-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('products.js が正しく読み込まれました。');
