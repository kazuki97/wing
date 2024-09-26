// unitPrice.js
import { db } from './db.js';
import { showErrorModal } from './errorHandling.js';

/**
 * 単価管理セクションの初期化を行う関数
 */
export function initializeUnitPriceSection() {
    // 必要な初期化処理があればここに追加
}

/**
 * 単価をデータベースに保存する関数
 * @param {Object} unitPrice - 保存する単価情報
 */
export function saveUnitPriceToDB(unitPrice) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readwrite');
    const store = transaction.objectStore('unitPrices');
    const addRequest = store.add(unitPrice);

    addRequest.onsuccess = () => {
        console.log(`単価が保存されました: サブカテゴリID=${unitPrice.subcategoryId}, 階層=${unitPrice.tier}, 価格=${unitPrice.price}`);
        displayUnitPrices();
    };

    addRequest.onerror = (event) => {
        console.error('単価の保存中にエラーが発生しました:', event.target.error);
        showErrorModal('単価の保存中にエラーが発生しました。');
    };
}

/**
 * 単価一覧を表示する関数
 */
export function displayUnitPrices() {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readonly');
    const store = transaction.objectStore('unitPrices');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const unitPrices = event.target.result;
        const unitPriceTableBody = document.querySelector('#unit-price-table tbody');
        if (unitPriceTableBody) {
            unitPriceTableBody.innerHTML = '';

            unitPrices.forEach(unitPrice => {
                const row = document.createElement('tr');

                const subcategoryIdCell = document.createElement('td');
                subcategoryIdCell.textContent = unitPrice.subcategoryId;
                row.appendChild(subcategoryIdCell);

                const tierCell = document.createElement('td');
                tierCell.textContent = unitPrice.tier;
                row.appendChild(tierCell);

                const priceCell = document.createElement('td');
                priceCell.textContent = unitPrice.price;
                row.appendChild(priceCell);

                // 編集ボタン
                const editCell = document.createElement('td');
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.addEventListener('click', () => {
                    showEditUnitPriceForm(unitPrice);
                });
                editCell.appendChild(editButton);
                row.appendChild(editCell);

                // 削除ボタン
                const deleteCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この単価を削除しますか？')) {
                        deleteUnitPrice(unitPrice.id);
                    }
                });
                deleteCell.appendChild(deleteButton);
                row.appendChild(deleteCell);

                unitPriceTableBody.appendChild(row);
            });
        } else {
            console.error("unit-price-table tbody が見つかりません。");
            showErrorModal('単価一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('単価一覧の取得中にエラーが発生しました:', event.target.error);
        showErrorModal('単価一覧の取得中にエラーが発生しました。');
    };
}

/**
 * 単価を削除する関数
 * @param {number} unitPriceId - 削除する単価のID
 */
function deleteUnitPrice(unitPriceId) {
    if (!db) {
        console.error('Database is not initialized.');
        showErrorModal('データベースが初期化されていません。');
        return;
    }

    const transaction = db.transaction(['unitPrices'], 'readwrite');
    const store = transaction.objectStore('unitPrices');
    const deleteRequest = store.delete(unitPriceId);

    deleteRequest.onsuccess = () => {
        console.log(`単価 ID ${unitPriceId} が削除されました。`);
        displayUnitPrices();
    };

    deleteRequest.onerror = (event) => {
        console.error('単価の削除中にエラーが発生しました:', event.target.error);
        showErrorModal('単価の削除中にエラーが発生しました。');
    };
}

/**
 * 単価編集フォームを表示する関数
 * @param {Object} unitPrice - 編集する単価オブジェクト
 */
function showEditUnitPriceForm(unitPrice) {
    const editForm = document.createElement('div');
    editForm.className = 'edit-form';

    editForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>単価を編集</h3>
                <label>階層: <input type="number" id="edit-unit-price-tier" value="${unitPrice.tier}" min="0"></label><br>
                <label>価格: <input type="number" id="edit-unit-price-price" value="${unitPrice.price}" min="0" step="0.01"></label><br>
                <button id="save-edit-unit-price-button">保存</button>
                <button id="cancel-edit-unit-price-button">キャンセル</button>
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

    const saveButton = editForm.querySelector('#save-edit-unit-price-button');
    saveButton.addEventListener('click', () => {
        const editedTier = Number(editForm.querySelector('#edit-unit-price-tier').value.trim());
        const editedPrice = Number(editForm.querySelector('#edit-unit-price-price').value.trim());

        if (isNaN(editedTier) || isNaN(editedPrice) || editedTier < 0 || editedPrice < 0) {
            alert('階層と価格は有効な数値を入力してください。');
            return;
        }

        const updatedUnitPrice = {
            ...unitPrice,
            tier: editedTier,
            price: editedPrice
        };

        const transaction = db.transaction(['unitPrices'], 'readwrite');
        const store = transaction.objectStore('unitPrices');
        const updateRequest = store.put(updatedUnitPrice);

        updateRequest.onsuccess = () => {
            console.log(`単価 ID ${updatedUnitPrice.id} が更新されました。`);
            document.body.removeChild(editForm);
            displayUnitPrices();
        };

        updateRequest.onerror = (event) => {
            console.error('単価の更新中にエラーが発生しました:', event.target.error);
            showErrorModal('単価の更新中にエラーが発生しました。');
        };
    });

    const cancelButton = editForm.querySelector('#cancel-edit-unit-price-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });
}
