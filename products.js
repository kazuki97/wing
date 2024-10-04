// products.js

import { showErrorModal } from './errorHandling.js';
import { displayGlobalInventory } from './inventoryManagement.js'; // インベントリ管理関数のインポート

/**
 * 商品をデータベースに保存する関数
 * @param {Object} product - 保存する商品オブジェクト
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function saveProductToDB(product, db) {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const addRequest = store.put(product);

    addRequest.onsuccess = (event) => {
        const savedProductId = event.target.result;
        console.log(`Product "${product.name}" saved successfully with ID: ${savedProductId}.`);

        // globalInventory にも商品を登録する処理を追加
        addProductToGlobalInventory({
            productId: savedProductId,
            subcategoryId: product.subcategoryId,
            quantity: product.quantity
        }, db);

        displayProducts(product.subcategoryId, db);
        updateProductCategorySelects(db); // カテゴリセレクトボックスを更新
    };

    addRequest.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

/**
 * globalInventory に商品を追加する関数
 * @param {Object} inventoryItem - 追加する在庫アイテム
 * @param {IDBDatabase} db - データベースオブジェクト
 */
function addProductToGlobalInventory(inventoryItem, db) {
    const transaction = db.transaction(['globalInventory'], 'readwrite');
    const store = transaction.objectStore('globalInventory');

    const addRequest = store.put(inventoryItem);

    addRequest.onsuccess = () => {
        console.log('globalInventory に商品が正常に追加されました。');
    };

    addRequest.onerror = (event) => {
        console.error('globalInventory への商品追加中にエラーが発生しました:', event.target.error);
        showErrorModal('在庫の保存中にエラーが発生しました。');
    };
}

/**
 * 商品を表示する関数
 * @param {number} subcategoryId - 表示する商品のサブカテゴリID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function displayProducts(subcategoryId, db) {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const index = store.index('subcategoryId');
    const request = index.getAll(subcategoryId);

    request.onsuccess = (event) => {
        const products = event.target.result;
        const productTableBody = document.getElementById('product-table')?.getElementsByTagName('tbody')[0];
        if (productTableBody) {
            productTableBody.innerHTML = '';

            products.forEach(product => {
                const row = productTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;
                row.insertCell(2).textContent = product.price;
                row.insertCell(3).textContent = product.cost;
                row.insertCell(4).textContent = product.barcode;
                row.insertCell(5).textContent = product.unitAmount;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    showEditProductForm(product, subcategoryId, db);
                });
                row.insertCell(6).appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'product-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        const deleteTransaction = db.transaction(['products'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('products');
                        deleteStore.delete(product.id);

                        deleteTransaction.oncomplete = () => {
                            console.log(`Product "${product.name}" deleted successfully.`);
                            displayProducts(subcategoryId, db);
                            updateProductCategorySelects(db); // カテゴリセレクトボックスを更新
                        };

                        deleteTransaction.onerror = (event) => {
                            console.error('Error deleting product:', event.target.error);
                            showErrorModal('商品の削除中にエラーが発生しました。');
                        };
                    }
                });
                row.insertCell(7).appendChild(deleteButton);
            });
        } else {
            console.error("product-tableのtbodyが見つかりません。");
            showErrorModal('商品一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching products:', event.target.error);
        showErrorModal('商品の取得中にエラーが発生しました。');
    };
}

/**
 * 商品編集フォームを表示する関数
 * @param {Object} product - 編集対象の商品
 * @param {number} subcategoryId - サブカテゴリID
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function showEditProductForm(product, subcategoryId, db) {
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
                displayProducts(subcategoryId, db);
                updateProductCategorySelects(db); // カテゴリセレクトボックスを更新
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

/**
 * 商品管理セクションのカテゴリセレクトボックスを更新する関数
 * @param {IDBDatabase} db - データベースオブジェクト
 */
export function updateProductCategorySelects(db) {
    const productParentCategorySelect = document.getElementById('product-parent-category-select');
    const productSubcategorySelect = document.getElementById('product-subcategory-select');

    if (!db) {
        console.error('データベースが初期化されていません。');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    // 親カテゴリのセレクトボックスを更新
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;

        if (productParentCategorySelect) {
            productParentCategorySelect.innerHTML = '<option value="">親カテゴリを選択</option>';
            categories.forEach(category => {
                if (category.parentId === null) {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    productParentCategorySelect.appendChild(option);
                }
            });
        } else {
            console.error('product-parent-category-select が見つかりません。');
            showErrorModal('親カテゴリセレクトボックスが見つかりません。');
        }

        if (productSubcategorySelect) {
            productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
        } else {
            console.error('product-subcategory-select が見つかりません。');
            showErrorModal('サブカテゴリセレクトボックスが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };

    // 親カテゴリ選択時にサブカテゴリを更新
    if (productParentCategorySelect) {
        productParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = Number(productParentCategorySelect.value);

            if (!db) {
                console.error('データベースが初期化されていません。');
                showErrorModal('データベースが初期化されていません。');
                return;
            }

            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const index = store.index('parentId');
            const request = index.getAll(parentCategoryId);

            request.onsuccess = (event) => {
                const subcategories = event.target.result;
                if (productSubcategorySelect) {
                    productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        productSubcategorySelect.appendChild(option);
                    });
                }
            };

            request.onerror = (event) => {
                console.error('Error fetching subcategories for products:', event.target.error);
                showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
            };
        });
    }
}
