// eventListeners.js
import { showSection } from './ui.js';
import { saveCategoryToDB, updateCategorySelects, displayCategories } from './categories.js';
import { saveProductToDB, updateProductCategorySelects, displayProducts } from './products.js';
import { showErrorModal } from './errorHandling.js';
import { initializeInventorySection, displayInventory } from './inventory.js';
import { initializeSalesSection, completeTransaction, addManualSale } from './transactions.js';
import { initializeGlobalInventorySection, displayGlobalInventory } from './globalInventory.js';
import { initializeUnitPriceSection, saveUnitPriceToDB, displayUnitPrices } from './unitPrice.js';
import { initializeBarcodeScanner } from './barcodeScanner.js';

/**
 * イベントリスナーの初期化を行う関数
 */
export function initializeEventListeners() {
    // ナビゲーションメニューのイベントリスナー設定
    setupNavigation();

    // カテゴリ管理のイベントリスナー設定
    setupCategoryManagement();

    // 商品管理のイベントリスナー設定
    setupProductManagement();

    // 在庫管理のイベントリスナー設定
    setupInventoryManagement();

    // バーコードスキャンのイベントリスナー設定
    setupBarcodeScanning();

    // 売上管理のイベントリスナー設定
    setupSalesManagement();

    // 全体在庫管理のイベントリスナー設定
    setupGlobalInventoryManagement();

    // 単価管理のイベントリスナー設定
    setupUnitPriceManagement();

    // エラーモーダルのイベントリスナー設定
    setupErrorModal();
}

/**
 * ナビゲーションメニューのイベントリスナーを設定する関数
 */
function setupNavigation() {
    const navLinks = [
        { id: 'link-home', section: 'home' },
        { id: 'link-category', section: 'category' },
        { id: 'link-product', section: 'product' },
        { id: 'link-inventory', section: 'inventory' },
        { id: 'link-barcode', section: 'barcode' },
        { id: 'link-sales', section: 'sales' },
        { id: 'link-global-inventory', section: 'global-inventory' },
        { id: 'link-unit-price', section: 'unit-price' }
    ];

    navLinks.forEach(link => {
        const navElement = document.getElementById(link.id);
        if (navElement) {
            navElement.addEventListener('click', (e) => {
                e.preventDefault();
                showSection(link.section);
            });
        } else {
            console.warn(`Navigation link with ID "${link.id}" not found.`);
        }
    });
}

/**
 * カテゴリ管理のイベントリスナーを設定する関数
 */
function setupCategoryManagement() {
    // 親カテゴリの追加
    const addParentCategoryButton = document.getElementById('add-parent-category');
    if (addParentCategoryButton) {
        addParentCategoryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const parentCategoryNameInput = document.getElementById('parent-category-name');
            const name = parentCategoryNameInput.value.trim();

            if (name === '') {
                alert('親カテゴリ名を入力してください。');
                return;
            }

            const category = { name: name, parentId: null };
            saveCategoryToDB(category);
            parentCategoryNameInput.value = '';
        });
    } else {
        console.warn('Add Parent Category button not found.');
    }

    // サブカテゴリの追加
    const addSubcategoryButton = document.getElementById('add-subcategory');
    if (addSubcategoryButton) {
        addSubcategoryButton.addEventListener('click', (e) => {
            e.preventDefault();
            const parentCategorySelect = document.getElementById('parent-category-select');
            const subcategoryNameInput = document.getElementById('subcategory-name');
            const parentId = parentCategorySelect.value;
            const name = subcategoryNameInput.value.trim();

            if (parentId === '') {
                alert('親カテゴリを選択してください。');
                return;
            }

            if (name === '') {
                alert('サブカテゴリ名を入力してください。');
                return;
            }

            const subcategory = { name: name, parentId: Number(parentId) };
            saveCategoryToDB(subcategory); // サブカテゴリも saveCategoryToDB を使用
            subcategoryNameInput.value = '';
        });
    } else {
        console.warn('Add Subcategory button not found.');
    }

    // カテゴリ一覧の表示を更新
    updateCategorySelects();
    displayCategories();
}

/**
 * 商品管理のイベントリスナーを設定する関数
 */
function setupProductManagement() {
    const addProductButton = document.getElementById('add-product');
    if (addProductButton) {
        addProductButton.addEventListener('click', (e) => {
            e.preventDefault();
            const parentCategorySelect = document.getElementById('product-parent-category-select');
            const subcategorySelect = document.getElementById('product-subcategory-select');
            const productNameInput = document.getElementById('product-name');
            const productQuantityInput = document.getElementById('product-quantity');
            const productPriceInput = document.getElementById('product-price');
            const productCostInput = document.getElementById('product-cost');
            const productBarcodeInput = document.getElementById('product-barcode');
            const productUnitAmountInput = document.getElementById('product-unit-amount');

            const parentId = parentCategorySelect.value;
            const subcategoryId = subcategorySelect.value;
            const name = productNameInput.value.trim();
            const quantity = Number(productQuantityInput.value.trim());
            const price = Number(productPriceInput.value.trim());
            const cost = Number(productCostInput.value.trim());
            const barcode = productBarcodeInput.value.trim();
            const unitAmount = Number(productUnitAmountInput.value.trim());

            if (parentId === '') {
                alert('親カテゴリを選択してください。');
                return;
            }

            if (subcategoryId === '') {
                alert('サブカテゴリを選択してください。');
                return;
            }

            if (name === '' || isNaN(quantity) || isNaN(price) || isNaN(cost) || barcode === '' || isNaN(unitAmount)) {
                alert('すべての項目を正しく入力してください。');
                return;
            }

            const product = {
                name: name,
                subcategoryId: Number(subcategoryId),
                quantity: quantity,
                price: price,
                cost: cost,
                barcode: barcode,
                unitAmount: unitAmount
            };

            saveProductToDB(product);

            // 入力フィールドをクリア
            productNameInput.value = '';
            productQuantityInput.value = '';
            productPriceInput.value = '';
            productCostInput.value = '';
            productBarcodeInput.value = '';
            productUnitAmountInput.value = '';
        });
    } else {
        console.warn('Add Product button not found.');
    }

    // 商品一覧の表示を更新
    updateProductCategorySelects();
    displayProducts();
}

/**
 * 在庫管理のイベントリスナーを設定する関数
 */
function setupInventoryManagement() {
    const inventoryParentCategorySelect = document.getElementById('inventory-parent-category-select');
    const inventorySubcategorySelect = document.getElementById('inventory-subcategory-select');

    if (inventoryParentCategorySelect) {
        inventoryParentCategorySelect.addEventListener('change', (e) => {
            const parentId = e.target.value;
            if (parentId !== '') {
                fetchSubcategories(parentId, inventorySubcategorySelect);
            } else {
                inventorySubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
                displayInventory(null, null);
            }
        });
    } else {
        console.warn('Inventory Parent Category select not found.');
    }

    if (inventorySubcategorySelect) {
        inventorySubcategorySelect.addEventListener('change', (e) => {
            const subcategoryId = e.target.value;
            if (subcategoryId !== '') {
                displayInventory(null, Number(subcategoryId));
            } else {
                const parentId = inventoryParentCategorySelect.value;
                displayInventory(Number(parentId), null);
            }
        });
    } else {
        console.warn('Inventory Subcategory select not found.');
    }

    // 初期表示
    displayInventory(null, null);
}

/**
 * バーコードスキャンのイベントリスナーを設定する関数
 */
function setupBarcodeScanning() {
    const startScanButton = document.getElementById('start-scan');
    if (startScanButton) {
        startScanButton.addEventListener('click', (e) => {
            e.preventDefault();
            initializeBarcodeScanner();
        });
    } else {
        console.warn('Start Scan button not found.');
    }
}

/**
 * 売上管理のイベントリスナーを設定する関数
 */
function setupSalesManagement() {
    const completeTransactionButton = document.getElementById('complete-transaction');
    const manualAddSalesButton = document.getElementById('manualAddSalesButton');

    if (completeTransactionButton) {
        completeTransactionButton.addEventListener('click', (e) => {
            e.preventDefault();
            completeTransaction();
        });
    } else {
        console.warn('Complete Transaction button not found.');
    }

    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            addManualSale();
        });
    } else {
        console.warn('Manual Add Sales button not found.');
    }

    // 売上一覧の表示を更新
    initializeSalesSection();
}

/**
 * 全体在庫管理のイベントリスナーを設定する関数
 */
function setupGlobalInventoryManagement() {
    const globalSubcategorySelect = document.getElementById('global-subcategory-select');

    if (globalSubcategorySelect) {
        globalSubcategorySelect.addEventListener('change', (e) => {
            const subcategoryId = e.target.value;
            if (subcategoryId !== '') {
                displayGlobalInventory(Number(subcategoryId));
            } else {
                displayGlobalInventory(null);
            }
        });
    } else {
        console.warn('Global Subcategory select not found.');
    }

    // 初期表示
    displayGlobalInventory(null);
}

/**
 * 単価管理のイベントリスナーを設定する関数
 */
function setupUnitPriceManagement() {
    const addUnitPriceButton = document.getElementById('add-unit-price');
    const unitPriceParentCategorySelect = document.getElementById('unit-price-parent-category-select');
    const unitPriceSubcategorySelect = document.getElementById('unit-price-subcategory-select');

    if (addUnitPriceButton) {
        addUnitPriceButton.addEventListener('click', (e) => {
            e.preventDefault();
            const parentId = unitPriceParentCategorySelect.value;
            const subcategoryId = unitPriceSubcategorySelect.value;
            const tierInput = document.getElementById('unit-price-tier');
            const priceInput = document.getElementById('unit-price-price');

            const tier = Number(tierInput.value.trim());
            const price = Number(priceInput.value.trim());

            if (parentId === '') {
                alert('親カテゴリを選択してください。');
                return;
            }

            if (subcategoryId === '') {
                alert('サブカテゴリを選択してください。');
                return;
            }

            if (isNaN(tier) || isNaN(price) || tier < 0 || price < 0) {
                alert('階層と価格は有効な数値を入力してください。');
                return;
            }

            const unitPrice = {
                subcategoryId: Number(subcategoryId),
                tier: tier,
                price: price
            };

            saveUnitPriceToDB(unitPrice);
            tierInput.value = '';
            priceInput.value = '';
        });
    } else {
        console.warn('Add Unit Price button not found.');
    }

    // 親カテゴリの変更に応じてサブカテゴリを更新
    if (unitPriceParentCategorySelect) {
        unitPriceParentCategorySelect.addEventListener('change', (e) => {
            const parentId = e.target.value;
            if (parentId !== '') {
                fetchSubcategories(parentId, unitPriceSubcategorySelect);
            } else {
                unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    } else {
        console.warn('Unit Price Parent Category select not found.');
    }

    // 単価一覧の表示を更新
    displayUnitPrices();
}

/**
 * エラーモーダルのイベントリスナーを設定する関数
 */
function setupErrorModal() {
    const closeErrorModalButton = document.getElementById('closeErrorModal');
    if (closeErrorModalButton) {
        closeErrorModalButton.addEventListener('click', () => {
            const errorModal = document.getElementById('errorModal');
            if (errorModal) {
                errorModal.style.display = 'none';
            }
        });
    } else {
        console.warn('Close Error Modal button not found.');
    }

    // モーダル外をクリックしたら閉じる
    window.addEventListener('click', (e) => {
        const errorModal = document.getElementById('errorModal');
        if (e.target === errorModal) {
            errorModal.style.display = 'none';
        }
    });
}

/**
 * 指定された親カテゴリIDに基づいてサブカテゴリを取得し、セレクトボックスに追加する関数
 * @param {string} parentId - 親カテゴリのID
 * @param {HTMLElement} selectElement - サブカテゴリを追加するセレクトボックス
 */
function fetchSubcategories(parentId, selectElement) {
    // カテゴリデータベースからサブカテゴリを取得
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');
    const request = index.getAll(Number(parentId));

    request.onsuccess = (event) => {
        const subcategories = event.target.result;
        selectElement.innerHTML = '<option value="">サブカテゴリを選択</option>';
        subcategories.forEach(subcategory => {
            const option = document.createElement('option');
            option.value = subcategory.id;
            option.textContent = subcategory.name;
            selectElement.appendChild(option);
        });
    };

    request.onerror = (event) => {
        console.error('サブカテゴリの取得中にエラーが発生しました:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };
}
