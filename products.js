// products.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 商品をデータベースに保存する関数
 * @param {Object} product - 保存する商品情報
 * @returns {Promise<void>}
 */
export function saveProductToDB(product) {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const addRequest = store.put(product);

    addRequest.onsuccess = () => {
        console.log(`Product "${product.name}" saved successfully.`);
        displayProducts(product.subcategoryId);
    };

    addRequest.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

/**
 * 商品を表示する関数
 * @param {number} subcategoryId - サブカテゴリID
 */
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

/**
 * 商品編集フォームを表示する関数
 * @param {Object} product - 編集する商品
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

/**
 * 商品IDから商品情報を取得する関数
 * @param {number} productId - 商品のID
 * @returns {Promise<Object>} - 商品情報
 */
export function getProductById(productId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.get(productId);

        request.onsuccess = (event) => {
            const product = event.target.result;
            if (product) {
                resolve(product);
            } else {
                reject(new Error(`Product with ID ${productId} not found.`));
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('products.js が正しく読み込まれました。');
