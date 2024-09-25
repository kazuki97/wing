// eventListeners.js
import { showSection } from './ui.js';
import { updateCategorySelects, saveCategoryToDB } from './categories.js';
import { saveProductToDB, displayProducts } from './products.js';
import { processTransaction, currentTransaction } from './transactions.js';
import { initializeQuagga } from './barcodeScanner.js';
import { findProductByName } from './productSearch.js';
import { showErrorModal } from './errorHandling.js';
import { saveUnitPriceToDB } from './inventory.js';

/**
 * イベントリスナーを初期化する関数
 */
export function initializeEventListeners() {
    // ナビゲーションリンク
    const linkHome = document.getElementById('link-home');
    const linkCategory = document.getElementById('link-category');
    const linkProduct = document.getElementById('link-product');
    const linkInventory = document.getElementById('link-inventory');
    const linkBarcode = document.getElementById('link-barcode');
    const linkSales = document.getElementById('link-sales');
    const linkGlobalInventory = document.getElementById('link-global-inventory');
    const linkUnitPrice = document.getElementById('link-unit-price');

    // ボタン
    const completeTransactionButton = document.getElementById('complete-transaction');
    const startScanButton = document.getElementById('start-scan');
    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    const addParentCategoryButton = document.getElementById('add-parent-category');
    const addSubcategoryButton = document.getElementById('add-subcategory');
    const addProductButton = document.getElementById('add-product');
    const addUnitPriceButton = document.getElementById('add-unit-price');

    // エラーモーダルの閉じるボタン
    const closeErrorModalButton = document.getElementById('closeErrorModal');
    const errorModal = document.getElementById('errorModal');
    if (closeErrorModalButton && errorModal) {
        closeErrorModalButton.addEventListener('click', () => {
            errorModal.style.display = 'none';
        });
    }

    // クリックでモーダルを閉じる
    window.addEventListener('click', (event) => {
        if (event.target === errorModal) {
            errorModal.style.display = 'none';
        }
    });

    // ナビゲーションリンクのイベントリスナー
    if (linkHome) {
        linkHome.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('home');
        });
    }

    if (linkCategory) {
        linkCategory.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('category');
            displayCategories();
        });
    }

    if (linkProduct) {
        linkProduct.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('product');
            updateCategorySelects();
        });
    }

    if (linkInventory) {
        linkInventory.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('inventory');
            // displayInventory(); // 実装が必要な場合
        });
    }

    if (linkBarcode) {
        linkBarcode.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('barcode');
        });
    }

    if (linkSales) {
        linkSales.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('sales');
            // displaySales(); // 実装が必要な場合
        });
    }

    if (linkGlobalInventory) {
        linkGlobalInventory.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('global-inventory');
            // displayGlobalInventory(); // 実装が必要な場合
        });
    }

    if (linkUnitPrice) {
        linkUnitPrice.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('unit-price');
            // displayUnitPrices(); // 実装が必要な場合
        });
    }

    // トランザクション完了ボタンのイベントリスナー
    if (completeTransactionButton) {
        completeTransactionButton.addEventListener('click', async () => {
            try {
                await processTransaction();
            } catch (error) {
                console.error('Transaction processing failed:', error);
                showErrorModal(error.message);
            }
        });
    }

    // バーコードスキャン開始ボタンのイベントリスナー
    if (startScanButton) {
        startScanButton.addEventListener('click', () => {
            initializeQuagga();
        });
    }

    // 手動で売上を追加するボタンのイベントリスナー
    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', () => {
            const productName = prompt('商品名を入力してください:');
            const quantityStr = prompt('数量を入力してください:');
            if (productName && quantityStr) {
                const quantity = Number(quantityStr);
                if (!isNaN(quantity) && quantity > 0) {
                    findProductByName(productName).then(product => {
                        if (product) {
                            currentTransaction.products.push({ product, quantity });
                            updateTransactionUI();
                            toggleCompleteButton();
                        } else {
                            showErrorModal('該当する商品が見つかりませんでした。');
                        }
                    }).catch(error => {
                        console.error('Error finding product by name:', error);
                        showErrorModal('商品情報の取得中にエラーが発生しました。');
                    });
                } else {
                    alert('有効な数量を入力してください。');
                }
            } else {
                alert('商品名と数量を入力してください。');
            }
        });
    }

    // カテゴリ追加ボタンのイベントリスナー
    if (addParentCategoryButton) {
        addParentCategoryButton.addEventListener('click', () => {
            const categoryName = document.getElementById('parent-category-name').value.trim();
            if (categoryName) {
                const category = {
                    name: categoryName,
                    parentId: null
                };
                saveCategoryToDB(category);
                document.getElementById('parent-category-name').value = '';
            } else {
                alert('カテゴリ名を入力してください。');
            }
        });
    }

    if (addSubcategoryButton) {
        addSubcategoryButton.addEventListener('click', () => {
            const subcategoryName = document.getElementById('subcategory-name').value.trim();
            const parentCategoryId = Number(document.getElementById('parent-category-select').value);
            if (subcategoryName && parentCategoryId) {
                const subcategory = {
                    name: subcategoryName,
                    parentId: parentCategoryId
                };
                saveCategoryToDB(subcategory);
                document.getElementById('subcategory-name').value = '';
            } else {
                alert('サブカテゴリ名と親カテゴリを入力してください。');
            }
        });
    }

    // 商品登録ボタンのイベントリスナー
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            const name = document.getElementById('product-name').value.trim();
            const quantity = Number(document.getElementById('product-quantity').value.trim());
            const price = Number(document.getElementById('product-price').value.trim());
            const cost = Number(document.getElementById('product-cost').value.trim());
            const barcode = document.getElementById('product-barcode').value.trim();
            const unitAmount = Number(document.getElementById('product-unit-amount').value.trim());
            const subcategoryId = Number(document.getElementById('product-subcategory-select').value);

            if (name && !isNaN(quantity) && !isNaN(price) && !isNaN(cost) && barcode && !isNaN(unitAmount) && subcategoryId) {
                const product = {
                    name,
                    quantity,
                    price,
                    cost,
                    barcode,
                    unitAmount,
                    subcategoryId
                };

                saveProductToDB(product);

                document.getElementById('product-name').value = '';
                document.getElementById('product-quantity').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-cost').value = '';
                document.getElementById('product-barcode').value = '';
                document.getElementById('product-unit-amount').value = '';
            } else {
                alert('すべての項目を正しく入力してください。');
            }
        });
    }

    // 単価の追加ボタンのイベントリスナー
    if (addUnitPriceButton) {
        addUnitPriceButton.addEventListener('click', () => {
            const parentCategoryId = Number(document.getElementById('unit-price-parent-category-select').value);
            const subcategoryId = Number(document.getElementById('unit-price-subcategory-select').value);
            const tier = Number(document.getElementById('unit-price-tier').value.trim());
            const price = Number(document.getElementById('unit-price-price').value.trim());

            if (!isNaN(parentCategoryId) && !isNaN(subcategoryId) && !isNaN(tier) && !isNaN(price)) {
                const unitPrice = {
                    subcategoryId,
                    tier,
                    price
                };

                saveUnitPriceToDB(unitPrice);

                document.getElementById('unit-price-tier').value = '';
                document.getElementById('unit-price-price').value = '';
            } else {
                alert('すべての項目を正しく入力してください。');
            }
        });
    }
}
