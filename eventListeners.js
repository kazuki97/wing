// eventListeners.js
import { updateCategorySelects, saveCategoryToDB } from './categories.js';
import { showErrorModal } from './errorHandling.js';

/**
 * イベントリスナーの初期化を行う関数
 */
export function initializeEventListeners() {
    // カテゴリ追加ボタンのイベントリスナー
    const addCategoryButton = document.getElementById('add-category-button');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', showAddCategoryForm);
    }

    // 商品追加ボタンのイベントリスナー（必要に応じて）
    const addProductButton = document.getElementById('add-product-button');
    if (addProductButton) {
        addProductButton.addEventListener('click', showAddProductForm);
    }

    // 他のイベントリスナーもここに追加
}

/**
 * カテゴリ追加フォームを表示する関数
 */
function showAddCategoryForm() {
    const addForm = document.createElement('div');
    addForm.className = 'add-form';

    addForm.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>カテゴリを追加</h3>
                <label>カテゴリ名: <input type="text" id="new-category-name"></label><br>
                <label>親カテゴリ:
                    <select id="new-category-parent">
                        <option value="">親カテゴリなし</option>
                        <!-- 親カテゴリのオプションはJavaScriptで動的に追加 -->
                    </select>
                </label><br>
                <button id="save-new-category-button">保存</button>
                <button id="cancel-new-category-button">キャンセル</button>
            </div>
        </div>
    `;

    document.body.appendChild(addForm);

    const modal = addForm.querySelector('.modal');
    const closeButton = addForm.querySelector('.close-button');
    const saveButton = addForm.querySelector('#save-new-category-button');
    const cancelButton = addForm.querySelector('#cancel-new-category-button');
    const parentSelect = addForm.querySelector('#new-category-parent');

    // 親カテゴリセレクトを更新
    updateCategorySelectsForAddition(parentSelect);

    modal.style.display = 'block';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(addForm);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(addForm);
    });

    saveButton.addEventListener('click', () => {
        const name = addForm.querySelector('#new-category-name').value.trim();
        const parentId = parentSelect.value;

        if (name) {
            const newCategory = {
                name: name,
                parentId: parentId === '' ? null : Number(parentId)
            };
            saveCategoryToDB(newCategory);
            document.body.removeChild(addForm);
        } else {
            alert('カテゴリ名を入力してください。');
        }
    });
}

/**
 * カテゴリ追加フォームの親カテゴリセレクトを更新する関数
 * @param {HTMLElement} selectElement - 親カテゴリセレクト要素
 */
function updateCategorySelectsForAddition(selectElement) {
    if (!window.db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = window.db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');
    const request = index.getAll(null); // 親カテゴリのみ取得

    request.onsuccess = (event) => {
        const parentCategories = event.target.result;

        // オプションをクリア
        while (selectElement.firstChild) {
            selectElement.removeChild(selectElement.firstChild);
        }

        // デフォルトのオプションを追加
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = '親カテゴリなし';
        selectElement.appendChild(defaultOption);

        // 親カテゴリのオプションを追加
        parentCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.text = category.name;
            selectElement.appendChild(option);
        });
    };

    request.onerror = (event) => {
        console.error('親カテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('親カテゴリの取得中にエラーが発生しました。');
    };
}

/**
 * 商品追加フォームを表示する関数（サンプル）
 */
function showAddProductForm() {
    // ここに商品追加フォームの実装を追加
    alert('商品追加フォームの実装が必要です。');
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('eventListeners.js が正しく読み込まれました。');
