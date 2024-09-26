// inventory.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 在庫管理セクションのカテゴリセレクトボックスを更新する関数
 */
export function updateInventoryCategorySelects() {
    const parentCategorySelect = document.getElementById('inventory-parent-category-select');
    const subcategorySelect = document.getElementById('inventory-subcategory-select');

    // 親カテゴリのセレクトボックスを更新
    if (parentCategorySelect) {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const index = store.index('parentId');
        const request = index.getAll(null); // parentIdがnullのものを取得（親カテゴリ）

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

    // 親カテゴリ選択時にサブカテゴリを更新
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

    // サブカテゴリ選択時に商品を表示
    if (subcategorySelect) {
        subcategorySelect.addEventListener('change', () => {
            const subcategoryId = Number(subcategorySelect.value);
            if (subcategoryId) {
                displayInventoryProducts(subcategoryId);
            } else {
                // サブカテゴリが未選択の場合、テーブルをクリア
                const inventoryTableBody = document.getElementById('inventory-table')?.getElementsByTagName('tbody')[0];
                if (inventoryTableBody) {
                    inventoryTableBody.innerHTML = '';
                }
            }
        });
    }
}

/**
 * グローバルサブカテゴリセレクトボックスを更新する関数
 */
export function updateGlobalSubcategorySelect() {
    const globalParentCategorySelect = document.getElementById('global-parent-category-select');
    const globalSubcategorySelect = document.getElementById('global-subcategory-select');

    if (globalParentCategorySelect && globalSubcategorySelect) {
        globalParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = Number(globalParentCategorySelect.value);
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(parentCategoryId);

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        globalSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

/**
 * 単価サブカテゴリセレクトボックスを更新する関数
 */
export function updateUnitPriceSubcategorySelect() {
    const unitPriceParentCategorySelect = document.getElementById('unit-price-parent-category-select');
    const unitPriceSubcategorySelect = document.getElementById('unit-price-subcategory-select');

    if (unitPriceParentCategorySelect && unitPriceSubcategorySelect) {
        unitPriceParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = Number(unitPriceParentCategorySelect.value);
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(parentCategoryId);

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        unitPriceSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

/**
 * 在庫商品の表示を行う関数
 * @param {number} subcategoryId - 表示する商品のサブカテゴリID
 */
export function displayInventoryProducts(subcategoryId) {
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
        const inventoryTableBody = document.getElementById('inventory-table')?.getElementsByTagName('tbody')[0];
        if (inventoryTableBody) {
            inventoryTableBody.innerHTML = '';

            products.forEach(product => {
                const row = inventoryTableBody.insertRow();
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
                    showEditProductForm(product, subcategoryId);
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
                            displayInventoryProducts(subcategoryId);
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
            console.error("inventory-tableのtbodyが見つかりません。");
            showErrorModal('在庫一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching products:', event.target.error);
        showErrorModal('商品の取得中にエラーが発生しました。');
    };
}

/**
 * 単価一覧を表示する関数
 */
export function displayUnitPrices() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const unitPriceSubcategorySelect = document.getElementById('unit-price-subcategory-select');
    if (!unitPriceSubcategorySelect) {
        console.error('unit-price-subcategory-select が見つかりません。');
        return;
    }

    const subcategoryId = Number(unitPriceSubcategorySelect.value);
    if (!subcategoryId) {
        console.error('サブカテゴリが選択されていません。');
        return;
    }

    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const index = store.index('subcategoryId');
    const request = index.getAll(subcategoryId);

    request.onsuccess = (event) => {
        const products = event.target.result;
        const unitPriceTableBody = document.getElementById('unit-price-table')?.getElementsByTagName('tbody')[0];
        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            products.forEach(product => {
                const row = unitPriceTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.unitPrice || '未設定';

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(product);
                });
                row.insertCell(2).appendChild(editButton);
            });
        } else {
            console.error("unit-price-tableのtbodyが見つかりません。");
            showErrorModal('単価一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching products for unit prices:', event.target.error);
        showErrorModal('単価の取得中にエラーが発生しました。');
    };
}

/**
 * 単価編集フォームを表示する関数
 * @param {Object} product - 編集する商品オブジェクト
 */
function showEditUnitPriceForm(product) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>単価を編集</h3>
                <label>商品名: <span>${product.name}</span></label><br>
                <label>単価: <input type="number" id="edit-unit-price" value="${product.unitPrice || ''}"></label><br>
                <button id="save-unit-price-button">保存</button>
                <button id="cancel-unit-price-button">キャンセル</button>
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

    const saveButton = editForm.querySelector('#save-unit-price-button');
    saveButton.addEventListener('click', () => {
        const editedUnitPrice = Number(editForm.querySelector('#edit-unit-price').value.trim());

        if (!isNaN(editedUnitPrice)) {
            product.unitPrice = editedUnitPrice;

            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');

            const updateRequest = store.put(product);

            updateRequest.onsuccess = () => {
                console.log(`Unit price for "${product.name}" updated successfully.`);
                document.body.removeChild(editForm);
                displayUnitPrices();
            };

            updateRequest.onerror = (event) => {
                console.error('Error updating unit price:', event.target.error);
                showErrorModal('単価の更新中にエラーが発生しました。');
            };
        } else {
            alert('正しい単価を入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-unit-price-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}

/**
 * 商品編集フォームを表示する関数
 * @param {Object} product - 編集する商品オブジェクト
 * @param {number} subcategoryId - サブカテゴリID
 */
export function showEditProductForm(product, subcategoryId) {
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
                displayInventoryProducts(subcategoryId);
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
 * 在庫管理セクションの初期化を行う関数
 */
export function initializeInventorySection() {
    updateInventoryCategorySelects();
    updateGlobalSubcategorySelect();
    updateUnitPriceSubcategorySelect();
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('inventory.js が正しく読み込まれました。');
