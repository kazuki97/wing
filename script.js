// パート1: データベースの初期化と基本設定

// グローバル変数の宣言
let db;

// DOM要素の取得とイベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // セクション
    const homeSection = document.getElementById('home-section');
    const categorySection = document.getElementById('category-section');
    const productSection = document.getElementById('product-section');
    const inventorySection = document.getElementById('inventory-section');
    const barcodeSection = document.getElementById('barcode-section');
    const salesSection = document.getElementById('sales-section');
    const globalInventorySection = document.getElementById('global-inventory-section');
    const unitPriceSection = document.getElementById('unit-price-section');

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
    const scannerContainer = document.getElementById('scanner-container');

    // トランザクション関連の変数
    let currentTransaction = {
        salesLocation: null,
        products: []
    };

    // スキャン状態の管理
    let isScanning = false;
    let onDetected = null;

    // IndexedDBの初期化
    const request = indexedDB.open('inventoryDB', 13);

    request.onupgradeneeded = function(event) {
        db = event.target.result;

        if (!db.objectStoreNames.contains('categories')) {
            const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            categoryStore.createIndex('parentId', 'parentId', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
            productStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: true });
        }

        if (!db.objectStoreNames.contains('sales')) {
            const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
            salesStore.createIndex('productName', 'productName', { unique: false });
        }

        if (!db.objectStoreNames.contains('globalInventory')) {
            const globalInventoryStore = db.createObjectStore('globalInventory', { keyPath: 'subcategoryId' });
        }

        if (!db.objectStoreNames.contains('unitPrices')) {
            const unitPriceStore = db.createObjectStore('unitPrices', { keyPath: 'id', autoIncrement: true });
            unitPriceStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully.');

        // 初期ロード処理
        updateCategorySelects();
        loadCategories();
        loadSales();
        displayUnitPrices();
        displayGlobalInventory();
        displayInventoryCategories();

        // UIの初期化
        initializeUI();
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
        alert('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
    };

    // セクションの表示切替関数
    function showSection(section) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(sec => {
            sec.style.display = 'none';
        });
        document.getElementById(`${section}-section`).style.display = 'block';
    }

    // ナビゲーションリンクのイベントリスナー
    linkHome.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('home');
    });

    linkCategory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('category');
        loadCategories();
    });

    linkProduct.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('product');
        loadCategories(); // 必要な場合
        loadProducts();
    });

    linkInventory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('inventory');
        loadGlobalInventory();
    });

    linkBarcode.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('barcode');
    });

    linkSales.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('sales');
        loadSales();
    });

    linkGlobalInventory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('global-inventory');
        loadGlobalInventory();
    });

    linkUnitPrice.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('unit-price');
        loadUnitPrices();
    });

    // トランザクション完了ボタンのイベントリスナー（パート2で実装）
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

    // バーコードスキャン開始ボタンのイベントリスナー（パート2で実装）
    if (startScanButton) {
        startScanButton.addEventListener('click', () => {
            initializeQuagga();
        });
    }

    // その他の初期化関数やイベントリスナーはパート2で定義します
});

// パート2: 主な機能の実装

// カテゴリ選択を更新する関数
function updateCategorySelects() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;

        // 上位カテゴリの選択肢を更新
        const parentCategorySelects = [
            document.getElementById('parent-category-select'),
            document.getElementById('product-parent-category-select'),
            document.getElementById('global-parent-category-select'),
            document.getElementById('unit-price-parent-category-select')
        ];

        parentCategorySelects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">親カテゴリを選択</option>'; // リストをクリア

                categories.filter(cat => cat.parentId === null).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    select.appendChild(option);
                });
            }
        });

        // サブカテゴリ選択の更新
        updateProductCategorySelects();
        updateGlobalSubcategorySelect();
        updateUnitPriceSubcategorySelect();

        // カテゴリ一覧を表示
        displayCategories();
    };

    request.onerror = (event) => {
        console.error('Error fetching categories:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

// サブカテゴリ選択を更新する関数（商品管理用）
function updateProductCategorySelects() {
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
                    productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        productSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('Error fetching subcategories for products:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                productSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

// サブカテゴリ選択を更新する関数（全体在庫管理用）
function updateGlobalSubcategorySelect() {
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
                    globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        globalSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('Error fetching subcategories for global inventory:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                globalSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

// サブカテゴリ選択を更新する関数（単価管理用）
function updateUnitPriceSubcategorySelect() {
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
                    unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';

                    subcategories.forEach(subcategory => {
                        const option = document.createElement('option');
                        option.value = subcategory.id;
                        option.text = subcategory.name;
                        unitPriceSubcategorySelect.appendChild(option);
                    });
                };

                request.onerror = (event) => {
                    console.error('Error fetching subcategories for unit prices:', event.target.error);
                    showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
                };
            } else {
                unitPriceSubcategorySelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
            }
        });
    }
}

// カテゴリ一覧を表示する関数
function loadCategories() {
    displayCategories();
}

// カテゴリ一覧を表示する関数
function displayCategories() {
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const categoryList = document.getElementById('category-list');
        if (categoryList) {
            categoryList.innerHTML = '';

            categories.filter(cat => cat.parentId === null).forEach(parentCategory => {
                const parentDiv = document.createElement('div');
                parentDiv.className = 'parent-category';
                parentDiv.textContent = parentCategory.name;

                const editParentButton = document.createElement('button');
                editParentButton.textContent = '編集';
                editParentButton.className = 'category-button';
                editParentButton.addEventListener('click', () => {
                    const newName = prompt('新しいカテゴリ名を入力してください:', parentCategory.name);
                    if (newName) {
                        parentCategory.name = newName;
                        const transaction = db.transaction(['categories'], 'readwrite');
                        const store = transaction.objectStore('categories');
                        store.put(parentCategory);

                        transaction.oncomplete = () => {
                            console.log(`Category "${newName}" updated successfully.`);
                            displayCategories();
                            updateCategorySelects();
                        };

                        transaction.onerror = (event) => {
                            console.error('Error updating category:', event.target.error);
                            showErrorModal('カテゴリの更新中にエラーが発生しました。');
                        };
                    }
                });
                parentDiv.appendChild(editParentButton);

                const deleteParentButton = document.createElement('button');
                deleteParentButton.textContent = '削除';
                deleteParentButton.className = 'category-button';
                deleteParentButton.addEventListener('click', () => {
                    if (confirm('このカテゴリとそのサブカテゴリを削除しますか？')) {
                        deleteCategoryAndSubcategories(parentCategory.id);
                    }
                });
                parentDiv.appendChild(deleteParentButton);

                const subcategories = categories.filter(cat => cat.parentId === parentCategory.id);
                subcategories.forEach(subcategory => {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subcategory';
                    subDiv.textContent = ` - ${subcategory.name}`;

                    const editSubButton = document.createElement('button');
                    editSubButton.textContent = '編集';
                    editSubButton.className = 'category-button';
                    editSubButton.addEventListener('click', () => {
                        const newName = prompt('新しいサブカテゴリ名を入力してください:', subcategory.name);
                        if (newName) {
                            subcategory.name = newName;
                            const transaction = db.transaction(['categories'], 'readwrite');
                            const store = transaction.objectStore('categories');
                            store.put(subcategory);

                            transaction.oncomplete = () => {
                                console.log(`Subcategory "${newName}" updated successfully.`);
                                displayCategories();
                                updateCategorySelects();
                            };

                            transaction.onerror = (event) => {
                                console.error('Error updating subcategory:', event.target.error);
                                showErrorModal('サブカテゴリの更新中にエラーが発生しました。');
                            };
                        }
                    });
                    subDiv.appendChild(editSubButton);

                    const deleteSubButton = document.createElement('button');
                    deleteSubButton.textContent = '削除';
                    deleteSubButton.className = 'category-button';
                    deleteSubButton.addEventListener('click', () => {
                        if (confirm('このサブカテゴリを削除しますか？')) {
                            deleteCategory(subcategory.id);
                        }
                    });
                    subDiv.appendChild(deleteSubButton);

                    parentDiv.appendChild(subDiv);
                });

                categoryList.appendChild(parentDiv);
            });
        } else {
            console.error("category-list が見つかりません。");
            showErrorModal('カテゴリ一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching categories for display:', event.target.error);
        showErrorModal('カテゴリの取得中にエラーが発生しました。');
    };
}

// カテゴリとそのサブカテゴリを削除する関数
function deleteCategoryAndSubcategories(categoryId) {
    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const index = store.index('parentId');

    // 親カテゴリを削除
    store.delete(categoryId);

    // サブカテゴリを取得して削除
    const subRequest = index.getAll(categoryId);
    subRequest.onsuccess = (event) => {
        const subcategories = event.target.result;
        subcategories.forEach(subcategory => {
            store.delete(subcategory.id);
        });
    };

    subRequest.onerror = (event) => {
        console.error('Error fetching subcategories for deletion:', event.target.error);
        showErrorModal('サブカテゴリの取得中にエラーが発生しました。');
    };

    transaction.oncomplete = () => {
        console.log(`Category ID ${categoryId} and its subcategories deleted successfully.`);
        displayCategories();
        updateCategorySelects();
    };

    transaction.onerror = (event) => {
        console.error('Error deleting category and subcategories:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

// カテゴリを削除する関数
function deleteCategory(categoryId) {
    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    store.delete(categoryId);

    transaction.oncomplete = () => {
        console.log(`Category with ID ${categoryId} deleted successfully.`);
        displayCategories();
        updateCategorySelects();
    };

    transaction.onerror = (event) => {
        console.error('Error deleting category:', event.target.error);
        showErrorModal('カテゴリの削除中にエラーが発生しました。');
    };
}

// 商品をDBに保存する関数
function saveProductToDB(product) {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    store.put(product);

    transaction.oncomplete = () => {
        console.log(`Product "${product.name}" saved successfully.`);
        displayProducts(product.subcategoryId);
    };

    transaction.onerror = (event) => {
        console.error('Error saving product:', event.target.error);
        showErrorModal('商品の保存中にエラーが発生しました。');
    };
}

// 商品を表示する関数
function displayProducts(subcategoryId) {
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
        const productTableBody = document.getElementById('product-table').getElementsByTagName('tbody')[0];
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

// 商品編集フォームを表示する関数
function showEditProductForm(product, subcategoryId) {
    // 編集フォームの要素を作成
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

    // 編集フォームを表示
    document.body.appendChild(editForm);

    // モーダルのスタイルを適用
    const modal = editForm.querySelector('.modal');
    const closeButton = editForm.querySelector('.close-button');

    modal.style.display = 'block';

    // 閉じるボタンのイベントリスナー
    closeButton.addEventListener('click', () => {
        document.body.removeChild(editForm);
    });

    // 保存ボタンのイベントリスナー
    const saveButton = editForm.querySelector('#save-edit-button');
    saveButton.addEventListener('click', () => {
        // 入力された値を取得
        const editedName = editForm.querySelector('#edit-product-name').value.trim();
        const editedQuantity = Number(editForm.querySelector('#edit-product-quantity').value.trim());
        const editedPrice = Number(editForm.querySelector('#edit-product-price').value.trim());
        const editedCost = Number(editForm.querySelector('#edit-product-cost').value.trim());
        const editedBarcode = editForm.querySelector('#edit-product-barcode').value.trim();
        const editedUnitAmount = Number(editForm.querySelector('#edit-product-unit-amount').value.trim());

        // 入力チェック
        if (editedName && !isNaN(editedQuantity) && !isNaN(editedPrice) && !isNaN(editedCost) && editedBarcode && !isNaN(editedUnitAmount)) {
            // データベースを更新
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

            store.put(updatedProduct);

            transaction.oncomplete = () => {
                console.log(`Product "${updatedProduct.name}" updated successfully.`);
                // 編集フォームを削除
                document.body.removeChild(editForm);
                // 商品一覧を更新
                displayProducts(subcategoryId);
            };

            transaction.onerror = (event) => {
                console.error('Error updating product:', event.target.error);
                showErrorModal('商品の更新中にエラーが発生しました。');
            };
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    });

    // キャンセルボタンのイベントリスナー
    const cancelButton = editForm.querySelector('#cancel-edit-button');
    cancelButton.addEventListener('click', () => {
        // 編集フォームを削除
        document.body.removeChild(editForm);
    });
}

// 単価をDBに保存する関数
function saveUnitPriceToDB(unitPrice) {
    const transaction = db.transaction(['unitPrices'], 'readwrite');
    const store = transaction.objectStore('unitPrices');
    store.put(unitPrice);

    transaction.oncomplete = () => {
        console.log(`Unit price for subcategoryId ${unitPrice.subcategoryId} saved successfully.`);
        displayUnitPrices();
    };

    transaction.onerror = (event) => {
        console.error('Error saving unit price:', event.target.error);
        showErrorModal('単価の保存中にエラーが発生しました。');
    };
}

// 単価を表示・管理する関数
function displayUnitPrices() {
    const transaction = db.transaction(['unitPrices', 'categories'], 'readonly');
    const unitPriceStore = transaction.objectStore('unitPrices');
    const categoryStore = transaction.objectStore('categories');
    const request = unitPriceStore.getAll();

    request.onsuccess = (event) => {
        const unitPrices = event.target.result;
        const unitPriceList = document.getElementById('unit-price-list');
        if (unitPriceList) {
            unitPriceList.innerHTML = '';

            unitPrices.forEach(unitPrice => {
                const categoryRequest = categoryStore.get(unitPrice.subcategoryId);
                categoryRequest.onsuccess = (catEvent) => {
                    const category = catEvent.target.result;
                    if (category) {
                        const listItem = document.createElement('div');
                        listItem.className = 'unit-price-item';
                        listItem.innerHTML = `
                            <span>サブカテゴリ: ${category.name} - タイヤ量: ${unitPrice.tier}g - 単価: ${unitPrice.price}円</span>
                            <button class="edit-unit-price-button" data-id="${unitPrice.id}">編集</button>
                            <button class="delete-unit-price-button" data-id="${unitPrice.id}">削除</button>
                        `;
                        unitPriceList.appendChild(listItem);
                    }
                };
                categoryRequest.onerror = (catError) => {
                    console.error('Error fetching category for unit price:', catError);
                    showErrorModal('カテゴリの取得中にエラーが発生しました。');
                };
            });

            // 編集・削除ボタンのイベントリスナーを追加
            setTimeout(() => { // データが表示された後にイベントをバインド
                const editButtons = unitPriceList.querySelectorAll('.edit-unit-price-button');
                editButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const unitPriceId = Number(e.target.getAttribute('data-id'));
                        editUnitPrice(unitPriceId);
                    });
                });

                const deleteButtons = unitPriceList.querySelectorAll('.delete-unit-price-button');
                deleteButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const unitPriceId = Number(e.target.getAttribute('data-id'));
                        deleteUnitPrice(unitPriceId);
                    });
                });
            }, 100); // 少し遅延を入れることで要素が確実に追加されてからイベントをバインド
        } else {
            console.error("unit-price-list が見つかりません。");
            showErrorModal('単価一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching unit prices:', event.target.error);
        showErrorModal('単価の取得中にエラーが発生しました。');
    };
}

// 単価を編集する関数
function editUnitPrice(unitPriceId) {
    const transaction = db.transaction(['unitPrices'], 'readwrite');
    const store = transaction.objectStore('unitPrices');
    const request = store.get(unitPriceId);

    request.onsuccess = (event) => {
        const unitPrice = event.target.result;
        if (unitPrice) {
            const newTier = prompt('新しいタイヤ量を入力してください（g）:', unitPrice.tier);
            const newPrice = prompt('新しい単価を入力してください（円）:', unitPrice.price);
            if (newTier !== null && newPrice !== null) { // null チェック
                const parsedTier = Number(newTier);
                const parsedPrice = Number(newPrice);
                if (!isNaN(parsedTier) && !isNaN(parsedPrice)) {
                    const updatedUnitPrice = {
                        ...unitPrice,
                        tier: parsedTier,
                        price: parsedPrice
                    };
                    store.put(updatedUnitPrice);
                } else {
                    alert('有効な数値を入力してください。');
                }
            }
        } else {
            alert('単価情報が見つかりませんでした。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching unit price for editing:', event.target.error);
        showErrorModal('単価の編集中にエラーが発生しました。');
    };
}

// 単価を削除する関数
function deleteUnitPrice(unitPriceId) {
    if (confirm('この単価情報を削除しますか？')) {
        const transaction = db.transaction(['unitPrices'], 'readwrite');
        const store = transaction.objectStore('unitPrices');
        store.delete(unitPriceId);

        transaction.oncomplete = () => {
            console.log(`Unit price ID ${unitPriceId} deleted successfully.`);
            displayUnitPrices();
        };

        transaction.onerror = (event) => {
            console.error('Error deleting unit price:', event.target.error);
            showErrorModal('単価の削除中にエラーが発生しました。');
        };
    }
}

// 商品登録ボタンのイベントリスナー
const addProductButton = document.getElementById('add-product');
if (addProductButton) {
    addProductButton.addEventListener('click', () => {
        const name = document.getElementById('product-name').value.trim();
        const quantity = Number(document.getElementById('product-quantity').value.trim());
        const price = Number(document.getElementById('product-price').value.trim());
        const cost = Number(document.getElementById('product-cost').value.trim());
        const barcode = document.getElementById('product-barcode').value.trim();
        const unitAmount = Number(document.getElementById('product-unit-amount').value.trim());
        const parentCategoryId = Number(document.getElementById('product-parent-category-select').value);
        const subcategoryId = Number(document.getElementById('product-subcategory-select').value);

        // 入力チェック
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
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    });
}

// ユニット価格追加ボタンのイベントリスナー
const addUnitPriceButton = document.getElementById('add-unit-price');
if (addUnitPriceButton) {
    addUnitPriceButton.addEventListener('click', () => {
        const parentCategoryId = Number(document.getElementById('unit-price-parent-category-select').value);
        const subcategoryId = Number(document.getElementById('unit-price-subcategory-select').value);
        const tier = Number(document.getElementById('unit-price-tier').value.trim());
        const price = Number(document.getElementById('unit-price-value').value.trim());

        // 入力チェック
        if (parentCategoryId && subcategoryId && !isNaN(tier) && !isNaN(price)) {
            const unitPrice = {
                subcategoryId,
                tier,
                price
            };

            saveUnitPriceToDB(unitPrice);
        } else {
            alert('すべての項目を正しく入力してください。');
        }
    });
}

// パート3: 販売処理と補助機能の実装

// 全体在庫を表示する関数
function displayGlobalInventory() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['globalInventory', 'categories'], 'readonly');
    const globalStore = transaction.objectStore('globalInventory');
    const categoryStore = transaction.objectStore('categories');
    const request = globalStore.getAll();

    request.onsuccess = (event) => {
        const globalInventories = event.target.result;
        const globalInventoryList = document.getElementById('global-inventory-list');
        if (globalInventoryList) {
            globalInventoryList.innerHTML = '';

            globalInventories.forEach(inventory => {
                if (inventory && inventory.subcategoryId !== undefined && inventory.subcategoryId !== null && !isNaN(inventory.subcategoryId)) {
                    const categoryRequest = categoryStore.get(inventory.subcategoryId);
                    categoryRequest.onsuccess = (catEvent) => {
                        const subcategory = catEvent.target.result;
                        if (subcategory) {
                            let quantity = Number(inventory.quantity);
                            if (isNaN(quantity)) {
                                quantity = 0;
                                console.warn(`Invalid quantity for subcategoryId ${inventory.subcategoryId}, defaulting to 0.`);
                            }
                            const listItem = document.createElement('div');
                            listItem.textContent = `${subcategory.name}: ${quantity} `;

                            const editButton = document.createElement('button');
                            editButton.textContent = '編集';
                            editButton.className = 'inventory-button';
                            editButton.addEventListener('click', () => {
                                const newQuantity = prompt(`現在の在庫量: ${quantity}\n新しい在庫量を入力してください:`, quantity);
                                if (newQuantity !== null) {
                                    const parsedQuantity = Number(newQuantity);
                                    if (!isNaN(parsedQuantity) && parsedQuantity >= 0) {
                                        const updateTransaction = db.transaction(['globalInventory'], 'readwrite');
                                        const store = updateTransaction.objectStore('globalInventory');
                                        const updatedInventory = {
                                            subcategoryId: inventory.subcategoryId,
                                            quantity: parsedQuantity
                                        };
                                        store.put(updatedInventory);

                                        updateTransaction.oncomplete = () => {
                                            console.log(`Global inventory for subcategoryId ${inventory.subcategoryId} updated to ${parsedQuantity}.`);
                                            displayGlobalInventory();
                                        };

                                        updateTransaction.onerror = (event) => {
                                            console.error('Error updating global inventory:', event.target.error);
                                            showErrorModal('全体在庫の更新中にエラーが発生しました。');
                                        };
                                    } else {
                                        alert('有効な在庫量を入力してください。');
                                    }
                                }
                            });
                            listItem.appendChild(editButton);

                            const deleteButton = document.createElement('button');
                            deleteButton.textContent = '削除';
                            deleteButton.className = 'inventory-button';
                            deleteButton.addEventListener('click', () => {
                                if (confirm('この全体在庫を削除しますか？')) {
                                    const deleteTransaction = db.transaction(['globalInventory'], 'readwrite');
                                    const store = deleteTransaction.objectStore('globalInventory');
                                    store.delete(inventory.subcategoryId);

                                    deleteTransaction.oncomplete = () => {
                                        console.log(`Global inventory for subcategoryId ${inventory.subcategoryId} deleted successfully.`);
                                        displayGlobalInventory();
                                    };

                                    deleteTransaction.onerror = (event) => {
                                        console.error('Error deleting global inventory:', event.target.error);
                                        showErrorModal('全体在庫の削除中にエラーが発生しました。');
                                    };
                                }
                            });
                            listItem.appendChild(deleteButton);

                            globalInventoryList.appendChild(listItem);
                        }
                    };
                    categoryRequest.onerror = (catError) => {
                        console.error('Error fetching category:', catError);
                        showErrorModal('カテゴリの取得中にエラーが発生しました。');
                    };
                } else {
                    console.warn('Invalid inventory entry:', inventory);
                }
            });
        } else {
            console.error("global-inventory-list が見つかりません。");
            showErrorModal('全体在庫一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching global inventory:', event.target.error);
        showErrorModal('全体在庫の取得中にエラーが発生しました。');
    };
}

// 在庫管理用のカテゴリ一覧を表示する関数
function displayInventoryCategories() {
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const categories = event.target.result;
        const inventoryCategoryList = document.getElementById('inventory-category-list');
        if (inventoryCategoryList) {
            inventoryCategoryList.innerHTML = '';

            categories.filter(cat => cat.parentId !== null).forEach(subcategory => {
                const button = document.createElement('button');
                button.textContent = subcategory.name;
                button.className = 'inventory-category-button';
                button.addEventListener('click', () => {
                    displayInventoryProducts(subcategory.id);
                });

                inventoryCategoryList.appendChild(button);
            });
        } else {
            console.error("inventory-category-list が見つかりません。");
            showErrorModal('在庫カテゴリ一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching categories for inventory display:', event.target.error);
        showErrorModal('在庫カテゴリの取得中にエラーが発生しました。');
    };
}

// 在庫管理用の商品一覧を表示する関数
function displayInventoryProducts(subcategoryId) {
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
        const inventoryProductList = document.getElementById('inventory-product-list');
        if (inventoryProductList) {
            inventoryProductList.innerHTML = '';

            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'inventory-item';
                productDiv.innerHTML = `
                    <p>商品名: ${product.name}</p>
                    <p>数量: ${product.quantity}</p>
                    <p>価格: ${product.price}</p>
                    <p>原価: ${product.cost}</p>
                    <p>バーコード: ${product.barcode}</p>
                    <p>サイズ（量）: ${product.unitAmount}</p>
                    <button class="edit-button">編集</button>
                    <button class="delete-button">削除</button>
                `;
                inventoryProductList.appendChild(productDiv);

                const editButton = productDiv.querySelector('.edit-button');
                editButton.addEventListener('click', () => {
                    // 編集フォームを表示
                    showEditProductForm(product, subcategoryId);
                });

                const deleteButton = productDiv.querySelector('.delete-button');
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        const deleteTransaction = db.transaction(['products'], 'readwrite');
                        const store = deleteTransaction.objectStore('products');
                        store.delete(product.id);

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
            });
        } else {
            console.error("inventory-product-list が見つかりません。");
            showErrorModal('在庫商品一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching products for inventory display:', event.target.error);
        showErrorModal('在庫商品の取得中にエラーが発生しました。');
    };
}

// 売上データを読み込む関数
function loadSales() {
    displaySales();
}

// 売上を表示する関数
function displaySales() {
    if (!db) {
        console.error('Database is not initialized.');
        return;
    }

    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const sales = event.target.result;
        const salesTableBody = document.getElementById('sales-table').getElementsByTagName('tbody')[0];
        if (salesTableBody) {
            salesTableBody.innerHTML = '';

            sales.forEach((sale, index) => {
                const row = salesTableBody.insertRow();
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).textContent = sale.date;
                row.insertCell(2).textContent = sale.salesLocation === 'store' ? '店舗' : 'EC';
                row.insertCell(3).textContent = sale.productName;
                row.insertCell(4).textContent = sale.quantity;
                row.insertCell(5).textContent = sale.unitPrice;
                row.insertCell(6).textContent = sale.totalPrice;
                row.insertCell(7).textContent = sale.profit;

                // 編集ボタンの作成
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'sale-button';
                editButton.addEventListener('click', () => {
                    // 編集機能の実装（必要に応じて）
                    alert('編集機能は未実装です。');
                });
                row.insertCell(8).appendChild(editButton);

                // 削除ボタンの作成
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'sale-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この売上を削除しますか？')) {
                        const deleteTransaction = db.transaction(['sales'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('sales');
                        deleteStore.delete(sale.id);

                        deleteTransaction.oncomplete = () => {
                            console.log(`Sale "${sale.productName}" deleted successfully.`);
                            displaySales();
                        };

                        deleteTransaction.onerror = (event) => {
                            console.error('Error deleting sale:', event.target.error);
                            showErrorModal('売上の削除中にエラーが発生しました。');
                        };
                    }
                });
                row.insertCell(9).appendChild(deleteButton);
            });
        } else {
            console.error("sales-tableのtbodyが見つかりません。");
            showErrorModal('売上一覧の表示エリアが見つかりません。');
        }
    };

    request.onerror = (event) => {
        console.error('Error fetching sales:', event.target.error);
        showErrorModal('売上の取得中にエラーが発生しました。');
    };
}
