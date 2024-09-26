// eventListeners.js
import { showSection } from './ui.js';
import { saveCategoryToDB, updateCategorySelects, displayCategories } from './categories.js';
import { saveProductToDB, displayProducts } from './products.js';
import { showErrorModal } from './errorHandling.js';
import { initializeInventorySection } from './inventory.js';
import { updateProductCategorySelects } from './products.js';

/**
 * イベントリスナーの初期化を行う関数
 */
export function initializeEventListeners() {
    // ナビゲーションボタンのイベントリスナー設定
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            showSection(section);
        });
    });

    // カテゴリ追加ボタンのイベントリスナー設定
    const addCategoryButton = document.getElementById('add-category-button');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', openAddCategoryModal);
    }

    // 商品追加ボタンのイベントリスナー設定
    const addProductButton = document.getElementById('add-product-button');
    if (addProductButton) {
        addProductButton.addEventListener('click', openAddProductModal);
    }

    // カテゴリ追加フォームの保存ボタンイベントリスナー設定
    const saveNewCategoryButton = document.getElementById('save-new-category-button');
    if (saveNewCategoryButton) {
        saveNewCategoryButton.addEventListener('click', handleSaveNewCategory);
    }

    // カテゴリ追加フォームのキャンセルボタンイベントリスナー設定
    const cancelNewCategoryButton = document.getElementById('cancel-new-category-button');
    if (cancelNewCategoryButton) {
        cancelNewCategoryButton.addEventListener('click', closeAddCategoryModal);
    }

    // 商品追加フォームの保存ボタンイベントリスナー設定
    const saveNewProductButton = document.getElementById('save-new-product-button');
    if (saveNewProductButton) {
        saveNewProductButton.addEventListener('click', handleSaveNewProduct);
    }

    // 商品追加フォームのキャンセルボタンイベントリスナー設定
    const cancelNewProductButton = document.getElementById('cancel-new-product-button');
    if (cancelNewProductButton) {
        cancelNewProductButton.addEventListener('click', closeAddProductModal);
    }

    // その他のイベントリスナーの初期化
    initializeInventoryEventListeners();
}

/**
 * カテゴリ追加モーダルを開く関数
 */
function openAddCategoryModal() {
    const addCategoryModal = document.getElementById('add-category-form');
    if (addCategoryModal) {
        addCategoryModal.style.display = 'block';
        populateParentCategorySelect('new-category-parent');
    } else {
        console.error('add-category-form が見つかりません。');
        showErrorModal('カテゴリ追加フォームが見つかりません。');
    }
}

/**
 * カテゴリ追加モーダルを閉じる関数
 */
function closeAddCategoryModal() {
    const addCategoryModal = document.getElementById('add-category-form');
    if (addCategoryModal) {
        addCategoryModal.style.display = 'none';
        resetAddCategoryForm();
    }
}

/**
 * 商品追加モーダルを開く関数
 */
function openAddProductModal() {
    const addProductModal = document.getElementById('add-product-form');
    if (addProductModal) {
        addProductModal.style.display = 'block';
        populateParentCategorySelect('new-product-parent-category');
    } else {
        console.error('add-product-form が見つかりません。');
        showErrorModal('商品追加フォームが見つかりません。');
    }
}

/**
 * 商品追加モーダルを閉じる関数
 */
function closeAddProductModal() {
    const addProductModal = document.getElementById('add-product-form');
    if (addProductModal) {
        addProductModal.style.display = 'none';
        resetAddProductForm();
    }
}

/**
 * 指定されたセレクトボックスに親カテゴリをポピュレートする関数
 * @param {string} selectId - セレクトボックスのID
 */
function populateParentCategorySelect(selectId) {
    const parentSelect = document.getElementById(selectId);
    if (parentSelect) {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const index = store.index('parentId');
        const request = index.getAll(null); // 親カテゴリのみ取得

        request.onsuccess = (event) => {
            const parentCategories = event.target.result;
            parentSelect.innerHTML = ''; // 既存のオプションをクリア

            // デフォルトのオプションを追加
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.text = selectId.startsWith('new-product') ? '親カテゴリを選択' : '親カテゴリなし';
            parentSelect.appendChild(defaultOption);

            // 親カテゴリのオプションを追加
            parentCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.text = category.name;
                parentSelect.appendChild(option);
            });

            // 親カテゴリセレクトに変更イベントリスナーを追加
            parentSelect.removeEventListener('change', handleParentCategoryChange);
            parentSelect.addEventListener('change', () => handleParentCategoryChange(selectId));
        };

        request.onerror = (event) => {
            console.error('親カテゴリの取得中にエラーが発生しました:', event.target.error);
            showErrorModal('親カテゴリの取得中にエラーが発生しました。');
        };
    }
}

/**
 * カテゴリ追加フォームをリセットする関数
 */
function resetAddCategoryForm() {
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.querySelector('#new-category-name').value = '';
        addCategoryForm.querySelector('#new-category-parent').value = '';
    }
}

/**
 * 商品追加フォームをリセットする関数
 */
function resetAddProductForm() {
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.querySelector('#new-product-name').value = '';
        addProductForm.querySelector('#new-product-parent-category').value = '';
        addProductForm.querySelector('#new-product-subcategory').innerHTML = '<option value="">サブカテゴリを選択</option>';
        addProductForm.querySelector('#new-product-quantity').value = '';
        addProductForm.querySelector('#new-product-price').value = '';
        addProductForm.querySelector('#new-product-cost').value = '';
        addProductForm.querySelector('#new-product-barcode').value = '';
        addProductForm.querySelector('#new-product-unit-amount').value = '';
    }
}

/**
 * 新規カテゴリ保存ボタンのハンドラー
 * @param {Event} event 
 */
function handleSaveNewCategory(event) {
    event.preventDefault(); // デフォルトのフォーム送信を防止

    const nameInput = document.getElementById('new-category-name');
    const parentSelect = document.getElementById('new-category-parent');

    if (nameInput && parentSelect) {
        const name = nameInput.value.trim();
        const parentId = parentSelect.value;

        if (name === '') {
            alert('カテゴリ名を入力してください。');
            return;
        }

        const category = {
            name: name,
            parentId: parentId === '' ? null : Number(parentId)
        };

        // カテゴリをデータベースに保存
        saveCategoryToDB(category);

        // モーダルを閉じてフォームをリセット
        closeAddCategoryModal();
    } else {
        console.error('カテゴリ追加フォームの要素が見つかりません。');
        showErrorModal('カテゴリ追加フォームの要素が見つかりません。');
    }
}

/**
 * 新規商品保存ボタンのハンドラー
 * @param {Event} event 
 */
function handleSaveNewProduct(event) {
    event.preventDefault(); // デフォルトのフォーム送信を防止

    const nameInput = document.getElementById('new-product-name');
    const parentSelect = document.getElementById('new-product-parent-category');
    const subcategorySelect = document.getElementById('new-product-subcategory');
    const quantityInput = document.getElementById('new-product-quantity');
    const priceInput = document.getElementById('new-product-price');
    const costInput = document.getElementById('new-product-cost');
    const barcodeInput = document.getElementById('new-product-barcode');
    const unitAmountInput = document.getElementById('new-product-unit-amount');

    if (nameInput && parentSelect && subcategorySelect && quantityInput && priceInput && costInput && barcodeInput && unitAmountInput) {
        const name = nameInput.value.trim();
        const parentId = parentSelect.value;
        const subcategoryId = subcategorySelect.value;
        const quantity = Number(quantityInput.value.trim());
        const price = Number(priceInput.value.trim());
        const cost = Number(costInput.value.trim());
        const barcode = barcodeInput.value.trim();
        const unitAmount = Number(unitAmountInput.value.trim());

        // バリデーション
        if (name === '' || isNaN(quantity) || isNaN(price) || isNaN(cost) || barcode === '' || isNaN(unitAmount)) {
            alert('すべての項目を正しく入力してください。');
            return;
        }

        const product = {
            name: name,
            subcategoryId: subcategoryId ? Number(subcategoryId) : null,
            quantity: quantity,
            price: price,
            cost: cost,
            barcode: barcode,
            unitAmount: unitAmount
        };

        // 商品をデータベースに保存
        saveProductToDB(product);

        // モーダルを閉じてフォームをリセット
        closeAddProductModal();
    } else {
        console.error('商品追加フォームの要素が見つかりません。');
        showErrorModal('商品追加フォームの要素が見つかりません。');
    }
}

/**
 * 親カテゴリセレクトボックスの変更イベントハンドラー
 * @param {string} selectId - 親カテゴリセレクトボックスのID
 */
function handleParentCategoryChange(selectId) {
    const parentSelect = document.getElementById(selectId);
    const isProductForm = selectId.startsWith('new-product');
    const subcategorySelectId = isProductForm ? 'new-product-subcategory' : null;
    const subcategorySelect = subcategorySelectId ? document.getElementById(subcategorySelectId) : null;

    if (parentSelect && subcategorySelect) {
        const parentId = Number(parentSelect.value);
        if (parentId) {
            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const index = store.index('parentId');
            const request = index.getAll(parentId);

            request.onsuccess = (event) => {
                const subcategories = event.target.result;
                subcategorySelect.innerHTML = ''; // 既存のオプションをクリア

                // デフォルトのオプションを追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = 'サブカテゴリを選択';
                subcategorySelect.appendChild(defaultOption);

                // サブカテゴリのオプションを追加
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
            // 親カテゴリが選択されていない場合はサブカテゴリセレクトをリセット
            if (subcategorySelect) {
                subcategorySelect.innerHTML = '';

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = 'サブカテゴリを選択';
                subcategorySelect.appendChild(defaultOption);
            }
        }
    }
}

/**
 * 在庫管理関連のイベントリスナーを初期化する関数
 */
function initializeInventoryEventListeners() {
    // 例: 単価編集フォームのイベントリスナー
    const editUnitPriceButtons = document.querySelectorAll('.edit-unit-price-button');
    editUnitPriceButtons.forEach(button => {
        button.addEventListener('click', () => {
            const subcategoryId = button.getAttribute('data-subcategory-id');
            openEditUnitPriceModal(subcategoryId);
        });
    });

    // 他の在庫管理関連のイベントリスナーをここに追加
}

/**
 * 単価編集モーダルを開く関数
 * @param {number} subcategoryId - 編集対象のサブカテゴリID
 */
function openEditUnitPriceModal(subcategoryId) {
    const editUnitPriceModal = document.getElementById('edit-unit-price-form');
    if (editUnitPriceModal) {
        editUnitPriceModal.style.display = 'block';
        populateUnitPriceForm(subcategoryId);
    } else {
        console.error('edit-unit-price-form が見つかりません。');
        showErrorModal('単価編集フォームが見つかりません。');
    }
}

/**
 * 単価編集フォームをポピュレートする関数
 * @param {number} subcategoryId - 編集対象のサブカテゴリID
 */
function populateUnitPriceForm(subcategoryId) {
    const unitPriceInput = document.getElementById('edit-unit-price-input');
    const saveUnitPriceButton = document.getElementById('save-unit-price-button');
    const cancelUnitPriceButton = document.getElementById('cancel-unit-price-button');

    if (unitPriceInput && saveUnitPriceButton && cancelUnitPriceButton) {
        // 現在の単価を取得してフォームに設定
        const transaction = db.transaction(['unitPrices'], 'readonly');
        const store = transaction.objectStore('unitPrices');
        const request = store.get(subcategoryId);

        request.onsuccess = (event) => {
            const unitPriceData = event.target.result;
            unitPriceInput.value = unitPriceData ? unitPriceData.price : '';
        };

        request.onerror = (event) => {
            console.error('単価の取得中にエラーが発生しました:', event.target.error);
            showErrorModal('単価の取得中にエラーが発生しました。');
        };

        // 保存ボタンのイベントリスナー設定
        saveUnitPriceButton.onclick = () => {
            const newPrice = Number(unitPriceInput.value.trim());
            if (!isNaN(newPrice) && newPrice >= 0) {
                const transaction = db.transaction(['unitPrices'], 'readwrite');
                const store = transaction.objectStore('unitPrices');
                const updateRequest = store.put({ subcategoryId: subcategoryId, price: newPrice });

                updateRequest.onsuccess = () => {
                    console.log(`単価が更新されました。サブカテゴリID: ${subcategoryId}, 新単価: ${newPrice}`);
                    editUnitPriceModal.style.display = 'none';
                    initializeInventorySection(); // 在庫管理セクションを再初期化
                };

                updateRequest.onerror = (event) => {
                    console.error('単価の更新中にエラーが発生しました:', event.target.error);
                    showErrorModal('単価の更新中にエラーが発生しました。');
                };
            } else {
                alert('有効な単価を入力してください。');
            }
        };

        // キャンセルボタンのイベントリスナー設定
        cancelUnitPriceButton.onclick = () => {
            const editUnitPriceModal = document.getElementById('edit-unit-price-form');
            if (editUnitPriceModal) {
                editUnitPriceModal.style.display = 'none';
            }
        };
    }
}
