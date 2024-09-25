document.addEventListener('DOMContentLoaded', () => {
    // グローバル変数の宣言
    let db;
    let currentTransaction = {
        salesLocation: null,
        products: []
    };
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
            productStore.createIndex('name', 'name', { unique: false });
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

        // UIの初期化
        initializeUI();
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
        alert('データベースの初期化に失敗しました。アプリケーションを再読み込みしてください。');
    };

    // UIの初期化関数
    function initializeUI() {
        showSection('home');
        initializeTransactionUI();

        // 初期ロード処理
        updateCategorySelects();
        displayCategories();
        displaySales();
        displayUnitPrices();
        displayGlobalInventory();

        // エラーモーダルの閉じるボタンのイベントリスナー
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
    }

    // セクションの表示切替関数
    function showSection(section) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(sec => {
            sec.style.display = 'none';
        });
        document.getElementById(`${section}-section`).style.display = 'block';
    }

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

        // サブカテゴリ選択後に商品を表示
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
                                <span>サブカテゴリ: ${category.name} - 階層量: ${unitPrice.tier} - 単価: ${unitPrice.price}円</span>
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
                const newTier = prompt('新しい階層量を入力してください:', unitPrice.tier);
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

                        transaction.oncomplete = () => {
                            console.log(`Unit price ID ${unitPriceId} updated successfully.`);
                            displayUnitPrices();
                        };
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
                    row.insertCell(1).textContent = new Date(sale.date).toLocaleString();
                    row.insertCell(2).textContent = sale.salesLocation;
                    row.insertCell(3).textContent = sale.productName;
                    row.insertCell(4).textContent = sale.quantity;
                    row.insertCell(5).textContent = sale.unitPrice;
                    row.insertCell(6).textContent = sale.totalPrice;
                    row.insertCell(7).textContent = sale.profit;

                    const editButton = document.createElement('button');
                    editButton.textContent = '編集';
                    editButton.className = 'sale-button';
                    // 必要に応じて編集機能を実装
                    // editButton.addEventListener('click', () => {
                    //     showEditSaleForm(sale);
                    // });
                    row.insertCell(8).appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'sale-button';
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この売上を削除しますか？')) {
                            deleteSale(sale.id);
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

    // 売上データをDBに保存する関数
    function addSaleToDBWithPrice(product, quantity, unitPrice) {
        const sale = {
            date: new Date().toISOString(),
            salesLocation: currentTransaction.salesLocation,
            productName: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: quantity * unitPrice,
            profit: (unitPrice - product.cost) * quantity
        };

        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.add(sale);

        transaction.oncomplete = () => {
            console.log(`Sale for "${sale.productName}" recorded successfully.`);
            displaySales();
        };

        transaction.onerror = (event) => {
            console.error('Error saving sale:', event.target.error);
            showErrorModal('売上の保存中にエラーが発生しました。');
        };
    }

    // 全体在庫を更新する関数
    function updateGlobalInventoryOnSale(subcategoryId, quantity, unitAmount) {
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        const request = store.get(subcategoryId);

        request.onsuccess = (event) => {
            let inventory = event.target.result;
            if (inventory) {
                inventory.quantity += quantity * unitAmount;
            } else {
                inventory = {
                    subcategoryId: subcategoryId,
                    quantity: quantity * unitAmount
                };
            }
            store.put(inventory);
        };

        request.onerror = (event) => {
            console.error('Error updating global inventory:', event.target.error);
            showErrorModal('全体在庫の更新中にエラーが発生しました。');
        };
    }

    // トランザクションを処理する関数
    async function processTransaction() {
        const { salesLocation, products } = currentTransaction;
        if (!salesLocation || products.length === 0) {
            throw new Error('販売場所または商品が選択されていません。');
        }

        // トランザクション全体でのサブカテゴリごとの合計数量を計算
        const subcategoryTotals = {};
        products.forEach(item => {
            const subId = item.product.subcategoryId;
            if (!subcategoryTotals[subId]) {
                subcategoryTotals[subId] = 0;
            }
            subcategoryTotals[subId] += item.quantity;
        });

        // トランザクション内の全サブカテゴリに対して処理を実行
        const transactionPromises = Object.keys(subcategoryTotals).map(async (subId) => {
            const totalQuantity = subcategoryTotals[subId];
            const unitPrice = await getUnitPrice(subId, totalQuantity);
            const productEntries = products.filter(item => item.product.subcategoryId === parseInt(subId, 10));

            // 各商品に対して在庫と売上を更新
            const productPromises = productEntries.map(async (item) => {
                const { product, quantity } = item;

                // 在庫を更新
                const newQuantity = product.quantity - quantity;
                if (newQuantity < 0) {
                    throw new Error(`在庫不足: ${product.name}`);
                }
                product.quantity = newQuantity;
                await saveProductToDB(product);

                // 全体在庫を更新
                await updateGlobalInventoryOnSale(product.subcategoryId, quantity, product.unitAmount);

                // 売上を記録
                await addSaleToDBWithPrice(product, quantity, unitPrice);
            });

            await Promise.all(productPromises);
        });

        try {
            await Promise.all(transactionPromises);
            alert('取引が正常に完了しました。');
            displaySales();
            displayGlobalInventory();
            resetTransaction();
        } catch (error) {
            console.error('Error processing transaction:', error);
            showErrorModal(error.message);
        }
    }

    // 単価を取得する関数（単価の階層を適用）
    function getUnitPrice(subcategoryId, totalQuantity) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['unitPrices'], 'readonly');
            const store = transaction.objectStore('unitPrices');
            const index = store.index('subcategoryId');
            const request = index.getAll(Number(subcategoryId));

            request.onsuccess = (event) => {
                const unitPrices = event.target.result;
                if (unitPrices && unitPrices.length > 0) {
                    // 単価階層を量でソート（昇順）
                    unitPrices.sort((a, b) => a.tier - b.tier);
                    let applicablePrice = unitPrices[0].price; // デフォルト価格
                    unitPrices.forEach(priceTier => {
                        if (totalQuantity >= priceTier.tier) {
                            applicablePrice = priceTier.price;
                        }
                    });
                    resolve(applicablePrice);
                } else {
                    // 単価設定がない場合はエラーを投げる
                    reject(new Error(`サブカテゴリID ${subcategoryId} の単価が設定されていません。`));
                }
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // エラーモーダルの表示関数
    function showErrorModal(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorModal = document.getElementById('errorModal');
        const closeErrorModalButton = document.getElementById('closeErrorModal');

        if (errorMessage && errorModal && closeErrorModalButton) {
            errorMessage.textContent = message;
            errorModal.style.display = 'block';

            closeErrorModalButton.onclick = () => {
                errorModal.style.display = 'none';
                isScanning = false; // スキャン状態をリセット
            };
        } else {
            alert(message);
            isScanning = false; // スキャン状態をリセット
        }
    }

    // バーコードスキャンの初期化と処理
    function initializeQuagga() {
        if (isScanning) return;

        isScanning = true;

        // 販売場所の選択ダイアログを表示
        selectSalesLocation().then(location => {
            if (location) {
                currentTransaction.salesLocation = location;
                // Quagga の初期化
                Quagga.init({
                    inputStream: {
                        type: "LiveStream",
                        target: document.getElementById('scanner-container'),
                        constraints: {
                            facingMode: "environment"
                        }
                    },
                    decoder: {
                        readers: ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader", "code_93_reader"]
                    }
                }, (err) => {
                    if (err) {
                        console.error(err);
                        isScanning = false; // エラー時にスキャン状態をリセット
                        showErrorModal('バーコードスキャンの初期化に失敗しました。');
                        return;
                    }
                    Quagga.start();

                    // 既存の onDetected リスナーを解除
                    if (onDetected) {
                        Quagga.offDetected(onDetected);
                    }

                    // onDetected リスナーを定義
                    onDetected = (result) => {
                        if (result && result.codeResult && result.codeResult.code) {
                            const barcode = result.codeResult.code;
                            Quagga.stop();
                            Quagga.offDetected(onDetected); // リスナーを解除
                            isScanning = false; // スキャン状態をリセット
                            handleBarcodeScanned(barcode);
                        } else {
                            console.warn('バーコードが検出されませんでした。');
                        }
                    };

                    // onDetected リスナーを登録
                    Quagga.onDetected(onDetected);
                });
            } else {
                isScanning = false; // キャンセルされた場合
            }
        }).catch(err => {
            console.error('Error selecting sales location:', err);
            isScanning = false;
            showErrorModal('販売場所の選択中にエラーが発生しました。');
        });
    }

    // 販売場所を選択するダイアログ（仮実装）
    function selectSalesLocation() {
        return new Promise((resolve) => {
            const location = prompt('販売場所を入力してください:');
            resolve(location);
        });
    }

    // バーコードスキャン後の処理
    async function handleBarcodeScanned(barcode) {
        try {
            const product = await findProductByBarcode(barcode);
            if (product) {
                addProductToTransaction(product);
            } else {
                showErrorModal('該当する商品が見つかりませんでした。');
            }
        } catch (error) {
            console.error('Error handling scanned barcode:', error);
            showErrorModal('商品情報の取得中にエラーが発生しました。');
        }
    }

    // 商品をバーコードで検索する関数
    function findProductByBarcode(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('barcode');
            const request = index.get(barcode);

            request.onsuccess = (event) => {
                const product = event.target.result;
                resolve(product);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // トランザクション完了後にUIをリセットする関数
    function resetTransaction() {
        currentTransaction = {
            salesLocation: null,
            products: []
        };
        updateTransactionUI();
        toggleCompleteButton();
    }

    // トランザクションUIの更新関数
    function updateTransactionUI() {
        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.innerHTML = '';
            currentTransaction.products.forEach((item, index) => {
                const listItem = document.createElement('div');
                listItem.className = 'transaction-item';
                listItem.innerHTML = `
                    <span>${item.product.name} - 数量: ${item.quantity}</span>
                    <button class="remove-item-button" data-index="${index}">削除</button>
                `;
                transactionList.appendChild(listItem);
            });

            // 削除ボタンのイベントリスナーを追加
            const removeButtons = transactionList.querySelectorAll('.remove-item-button');
            removeButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const idx = Number(e.target.getAttribute('data-index'));
                    if (!isNaN(idx)) {
                        currentTransaction.products.splice(idx, 1);
                        updateTransactionUI();
                        toggleCompleteButton();
                    }
                });
            });
        }

        toggleCompleteButton();
    }

    // トランザクションの状態に応じて完了ボタンを有効化/無効化する関数
    function toggleCompleteButton() {
        const completeTransactionButton = document.getElementById('complete-transaction');
        if (completeTransactionButton) {
            completeTransactionButton.disabled = currentTransaction.products.length === 0;
        }
    }

    // トランザクション関連のUIを初期化する関数
    function initializeTransactionUI() {
        const transactionList = document.getElementById('transaction-list');
        if (transactionList) {
            transactionList.innerHTML = '';
        }
        toggleCompleteButton();
    }

    // 手動で売上を追加するボタンのイベントリスナー
    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', () => {
            const productName = prompt('商品名を入力してください:');
            const quantityStr = prompt('数量を入力してください:');
            if (productName && quantityStr) {
                const quantity = Number(quantityStr);
                if (!isNaN(quantity) && quantity > 0) {
                    // 商品を名前で検索
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

    // 商品を名前で検索する関数
    function findProductByName(name) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('name');
            const request = index.get(name);

            request.onsuccess = (event) => {
                const product = event.target.result;
                resolve(product);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
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

    // 単価の追加ボタンのイベントリスナー
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

    // 売上を削除する関数
    function deleteSale(saleId) {
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.delete(saleId);

        transaction.oncomplete = () => {
            console.log(`Sale ID ${saleId} deleted successfully.`);
            displaySales();
        };

        transaction.onerror = (event) => {
            console.error('Error deleting sale:', event.target.error);
            showErrorModal('売上の削除中にエラーが発生しました。');
        };
    }

    // 全体在庫を表示する関数
    function displayGlobalInventory() {
        const transaction = db.transaction(['globalInventory', 'categories'], 'readonly');
        const inventoryStore = transaction.objectStore('globalInventory');
        const categoryStore = transaction.objectStore('categories');

        const request = inventoryStore.getAll();

        request.onsuccess = (event) => {
            const inventories = event.target.result;
            const inventoryList = document.getElementById('global-inventory-list');
            if (inventoryList) {
                inventoryList.innerHTML = '';

                inventories.forEach(inventory => {
                    const categoryRequest = categoryStore.get(inventory.subcategoryId);
                    categoryRequest.onsuccess = (catEvent) => {
                        const category = catEvent.target.result;
                        if (category) {
                            const listItem = document.createElement('div');
                            listItem.className = 'global-inventory-item';
                            listItem.innerHTML = `
                                <span>サブカテゴリ: ${category.name} - 在庫量: ${inventory.quantity}</span>
                            `;
                            inventoryList.appendChild(listItem);
                        }
                    };
                    categoryRequest.onerror = (catError) => {
                        console.error('Error fetching category for global inventory:', catError);
                        showErrorModal('カテゴリの取得中にエラーが発生しました。');
                    };
                });
            } else {
                console.error("global-inventory-list が見つかりません。");
                showErrorModal('全体在庫一覧の表示エリアが見つかりません。');
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching global inventories:', event.target.error);
            showErrorModal('全体在庫の取得中にエラーが発生しました。');
        };
    }

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

    // ナビゲーションリンクのイベントリスナー
    linkHome.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('home');
    });

    linkCategory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('category');
        displayCategories();
    });

    linkProduct.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('product');
        updateCategorySelects();
    });

    linkInventory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('inventory');
        displayGlobalInventory();
    });

    linkBarcode.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('barcode');
    });

    linkSales.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('sales');
        displaySales();
    });

    linkGlobalInventory.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('global-inventory');
        displayGlobalInventory();
    });

    linkUnitPrice.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('unit-price');
        displayUnitPrices();
    });

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

    // その他の初期化関数やイベントリスナー
    updateProductCategorySelects();
    updateGlobalSubcategorySelect();
    updateUnitPriceSubcategorySelect();
    initializeTransactionUI();
});
