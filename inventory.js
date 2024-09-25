// inventory.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

export function updateGlobalSubcategorySelect() {
    const globalParentCategorySelect = document.getElementById('global-parent-category-select');
    const globalSubcategorySelect = document.getElementById('global-subcategory-select');

    if (globalParentCategorySelect) {
        globalParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = globalParentCategorySelect.value;
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(Number(parentCategoryId));

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    if (globalSubcategorySelect) {
                        globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                        subcategories.forEach(subcategory => {
                            const option = document.createElement('option');
                            option.value = subcategory.id;
                            option.text = subcategory.name;
                            globalSubcategorySelect.appendChild(option);
                        });
                    }
                };

                request.onerror = (event) => {
                    console.error('Error fetching subcategories for global inventory:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                if (globalSubcategorySelect) {
                    globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                }
            }
        });
    }
}

export function updateUnitPriceSubcategorySelect() {
    const unitPriceParentCategorySelect = document.getElementById('unit-price-parent-category-select');
    const unitPriceSubcategorySelect = document.getElementById('unit-price-subcategory-select');

    if (unitPriceParentCategorySelect) {
        unitPriceParentCategorySelect.addEventListener('change', () => {
            const parentCategoryId = unitPriceParentCategorySelect.value;
            if (parentCategoryId) {
                const transaction = db.transaction(['categories'], 'readonly');
                const store = transaction.objectStore('categories');
                const index = store.index('parentId');
                const request = index.getAll(Number(parentCategoryId));

                request.onsuccess = (event) => {
                    const subcategories = event.target.result;
                    if (unitPriceSubcategorySelect) {
                        unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                        subcategories.forEach(subcategory => {
                            const option = document.createElement('option');
                            option.value = subcategory.id;
                            option.text = subcategory.name;
                            unitPriceSubcategorySelect.appendChild(option);
                        });
                    }
                };

                request.onerror = (event) => {
                    console.error('Error fetching subcategories for unit prices:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                if (unitPriceSubcategorySelect) {
                    unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                }
            }
        });
    }
}

export function displayGlobalInventory() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['globalInventory'], 'readonly');
    const store = transaction.objectStore('globalInventory');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const inventory = event.target.result;
        const inventoryTableBody = document.getElementById('global-inventory-table')?.getElementsByTagName('tbody')[0];
        if (inventoryTableBody) {
            inventoryTableBody.innerHTML = '';

            inventory.forEach(item => {
                const row = inventoryTableBody.insertRow();
                row.insertCell(0).textContent = item.subcategoryId;
                row.insertCell(1).textContent = item.quantity;
            });
        } else {
            console.error("global-inventory-tableのtbodyが見つかりません。");
            showErrorModal('全体在庫一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching global inventory:', event.target.error);
        showErrorModal('全体在庫の取得中にエラーが発生しました。');
    };
}

export function displayUnitPrices() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readonly');
    const store = transaction.objectStore('unitPrices');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const unitPrices = event.target.result;
        const unitPriceTableBody = document.getElementById('unit-price-table')?.getElementsByTagName('tbody')[0];
        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            unitPrices.forEach(unitPrice => {
                const row = unitPriceTableBody.insertRow();
                row.insertCell(0).textContent = unitPrice.subcategoryId;
                row.insertCell(1).textContent = unitPrice.tier;
                row.insertCell(2).textContent = unitPrice.price;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'unit-price-button';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(unitPrice);
                });
                row.insertCell(3).appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'unit-price-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この単価を削除しますか？')) {
                        const deleteTransaction = db.transaction(['unitPrices'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('unitPrices');
                        deleteStore.delete(unitPrice.id);

                        deleteTransaction.oncomplete = () => {
                            console.log('Unit price deleted successfully.');
                            displayUnitPrices();
                        };

                        deleteTransaction.onerror = (event) => {
                            console.error('Error deleting unit price:', event.target.error);
                            showErrorModal('単価の削除中にエラーが発生しました。');
                        };
                    }
                });
                row.insertCell(4).appendChild(deleteButton);
            });
        } else {
            console.error("unit-price-tableのtbodyが見つかりません。");
            showErrorModal('単価一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching unit prices:', event.target.error);
        showErrorModal('単価の取得中にエラーが発生しました。');
    };
}

function showEditUnitPriceForm(unitPrice) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>単価を編集</h3>
                <label>サブカテゴリID: <input type="number" id="edit-unit-price-subcategoryId" value="${unitPrice.subcategoryId}" disabled></label><br>
                <label>階層: <input type="number" id="edit-unit-price-tier" value="${unitPrice.tier}"></label><br>
                <label>価格: <input type="number" id="edit-unit-price-price" value="${unitPrice.price}"></label><br>
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
        const editedTier = Number(editForm.querySelector('#edit-unit-price-tier').value.trim());
        const editedPrice = Number(editForm.querySelector('#edit-unit-price-price').value.trim());

        if (!isNaN(editedTier) && !isNaN(editedPrice)) {
            const updatedUnitPrice = {
                id: unitPrice.id,
                subcategoryId: unitPrice.subcategoryId,
                tier: editedTier,
                price: editedPrice
            };

            const transaction = db.transaction(['unitPrices'], 'readwrite');
            const store = transaction.objectStore('unitPrices');

            const updateRequest = store.put(updatedUnitPrice);

            updateRequest.onsuccess = () => {
                console.log('Unit price updated successfully.');
                document.body.removeChild(editForm);
                displayUnitPrices();
            };

            updateRequest.onerror = (event) => {
                console.error('Error updating unit price:', event.target.error);
                showErrorModal('単価の更新中にエラーが発生しました。');
            };
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    });

    const cancelButton = editForm.querySelector('#cancel-unit-price-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}
