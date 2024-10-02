import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

export function updateProductCategorySelects() {
    const productParentCategorySelect = document.getElementById('product-parent-category-select');
    const productSubcategorySelect = document.getElementById('product-subcategory-select');

    if (productParentCategorySelect) {
        productParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = productParentCategorySelect.value;
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(Number(parentCategoryId));

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
            } else {
                if (productSubcategorySelect) {
                    productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                }
            }
        });
    }

    if (productSubcategorySelect) {
        productSubcategorySelect.addEventListener('change', () => {
            const subcategoryId = Number(productSubcategorySelect.value);
            if (subcategoryId) {
                displayProducts(subcategoryId);
            } else {
                console.error('No subcategory selected.');
            }
        });
    }
}

export function saveProductToDB(product) {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const addRequest = store.put(product);

    addRequest.onsuccess = () => {
        console.log(`Product "${product.name}" saved successfully.`);
        displayProducts(product.subcategoryId); // 保存後にUIを更新

        // **保存後にデータが本当にDBに保存されたか確認する**
        const checkTransaction = db.transaction(['products'], 'readonly');
        const checkStore = checkTransaction.objectStore('products');
        const getRequest = checkStore.get(product.id);

        getRequest.onsuccess = (event) => {
            console.log('DBに保存された商品:', event.target.result);  // DBに保存されたデータを確認
            if (!event.target.result) {
                console.warn('データベースに商品が保存されていません。');
            }
        };

        getRequest.onerror = (event) => {
            console.error('商品データの取得中にエラーが発生しました:', event.target.error);
        };
    };

    addRequest.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

export function displayProducts(subcategoryId) {
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
                            displayProducts(subcategoryId);
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
                displayProducts(subcategoryId);
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
