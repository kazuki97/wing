document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let isScanning = false;
    let onDetected; // onDetected ハンドラー

    // データベースを開く（バージョンを12に上げました）
    const request = indexedDB.open('inventoryDB', 12);

    // データベースエラー
    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };

    // データベース成功時
    request.onsuccess = (event) => {
        db = event.target.result;
        try {
            loadCategories();
            loadSales();
            displayGlobalInventory(); // 全体在庫を表示
            updateCategorySelects(); // カテゴリ選択を更新
            displayInventoryCategories(); // インベントリカテゴリを表示
            updateBarcodeScannerAvailability(); // バーコードスキャナの利用可能性を更新
            registerEventListeners(); // イベントリスナーを登録
        } catch (error) {
            console.error('Error in onsuccess:', error);
        }
    };

    // データベースのアップグレード
    request.onupgradeneeded = (event) => {
        db = event.target.result;

        // カテゴリストアの作成
        if (!db.objectStoreNames.contains('categories')) {
            const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            categoryStore.createIndex('name', 'name', { unique: false });
            categoryStore.createIndex('parentId', 'parentId', { unique: false });
        }

        // 商品ストアの作成
        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
            productStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: true });
        } else {
            const productStore = event.currentTarget.transaction.objectStore('products');
            if (!productStore.indexNames.contains('barcode')) {
                productStore.createIndex('barcode', 'barcode', { unique: true });
            }
        }

        // 売上ストアの作成
        if (!db.objectStoreNames.contains('sales')) {
            db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        }

        // 全体在庫ストアの作成
        if (!db.objectStoreNames.contains('globalInventory')) {
            db.createObjectStore('globalInventory', { keyPath: 'subcategoryId' });
        }
    };

    // 必要なボタンや要素の取得
    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    const addParentCategoryButton = document.getElementById('add-parent-category');
    const addSubcategoryButton = document.getElementById('add-subcategory');
    const parentCategorySelect = document.getElementById('parent-category-select');
    const productParentCategorySelect = document.getElementById('product-parent-category-select');
    const productSubcategorySelect = document.getElementById('product-subcategory-select');
    const addProductButton = document.getElementById('add-product');
    const addGlobalInventoryButton = document.getElementById('add-global-inventory');
    const globalParentCategorySelect = document.getElementById('global-parent-category-select');
    const globalSubcategorySelect = document.getElementById('global-subcategory-select');
    const scannerContainer = document.getElementById('scanner-container');
    const startScanButton = document.getElementById('start-scan');

    // ナビゲーションの要素取得
    const linkHome = document.getElementById('link-home');
    const linkCategory = document.getElementById('link-category');
    const linkProduct = document.getElementById('link-product');
    const linkInventory = document.getElementById('link-inventory');
    const linkBarcode = document.getElementById('link-barcode');
    const linkSales = document.getElementById('link-sales');
    const linkGlobalInventory = document.getElementById('link-global-inventory');

    const sections = {
        home: document.getElementById('home-section'),
        category: document.getElementById('category-section'),
        product: document.getElementById('product-section'),
        inventory: document.getElementById('inventory-section'),
        barcode: document.getElementById('barcode-section'),
        sales: document.getElementById('sales-section'),
        globalInventory: document.getElementById('global-inventory-section')
    };

    // イベントリスナーを登録する関数
    function registerEventListeners() {
        // manualAddSalesButtonにイベントリスナーを追加して、売上セクションを表示
        if (manualAddSalesButton) {
            manualAddSalesButton.addEventListener('click', () => {
                showSection('sales'); // 売上セクションを表示
                displayCategorySelectionForSales();
            });
        }

        // ナビゲーションボタンのイベントリスナー設定
        linkHome.addEventListener('click', () => showSection('home'));
        linkCategory.addEventListener('click', () => showSection('category'));
        linkProduct.addEventListener('click', () => showSection('product'));
        linkInventory.addEventListener('click', () => showSection('inventory'));
        linkBarcode.addEventListener('click', () => showSection('barcode'));
        linkSales.addEventListener('click', () => {
            showSection('sales');
            displaySales(); // 売上一覧を表示
        });
        linkGlobalInventory.addEventListener('click', () => showSection('globalInventory'));

        // 上位カテゴリを追加する処理
        if (addParentCategoryButton) {
            addParentCategoryButton.addEventListener('click', () => {
                const parentCategoryNameElement = document.getElementById('parent-category-name');
                if (parentCategoryNameElement) {
                    const categoryName = parentCategoryNameElement.value.trim();

                    if (categoryName !== '') {
                        const category = { name: categoryName, parentId: null };

                        const transaction = db.transaction(['categories'], 'readwrite');
                        const store = transaction.objectStore('categories');
                        const request = store.add(category);

                        request.onsuccess = (event) => {
                            // 生成されたIDを取得してカテゴリに設定
                            category.id = event.target.result;
                            alert(`${categoryName} が上位カテゴリに追加されました。`);
                            updateCategorySelects(); // カテゴリ選択を更新
                            parentCategoryNameElement.value = ''; // 入力フィールドをクリア
                        };

                        request.onerror = () => {
                            alert('このカテゴリ名はすでに存在しています。');
                        };
                    } else {
                        alert('カテゴリ名を入力してください。');
                    }
                } else {
                    alert('カテゴリ名入力フィールドが見つかりません。');
                }
            });
        }

        // サブカテゴリを追加する処理
        if (addSubcategoryButton) {
            addSubcategoryButton.addEventListener('click', () => {
                const subcategoryNameElement = document.getElementById('subcategory-name');
                if (subcategoryNameElement && parentCategorySelect) {
                    const subcategoryName = subcategoryNameElement.value.trim();
                    const parentCategoryValue = parentCategorySelect.value;

                    if (subcategoryName !== '' && parentCategoryValue !== '') {
                        const parentCategoryId = parseInt(parentCategoryValue, 10);

                        if (!isNaN(parentCategoryId)) {
                            const category = { name: subcategoryName, parentId: parentCategoryId };

                            const transaction = db.transaction(['categories'], 'readwrite');
                            const store = transaction.objectStore('categories');
                            const request = store.add(category);

                            request.onsuccess = (event) => {
                                // 生成されたIDを取得してカテゴリに設定
                                category.id = event.target.result;
                                alert(`${subcategoryName} がサブカテゴリに追加されました。`);
                                updateCategorySelects(); // カテゴリ選択を更新
                                subcategoryNameElement.value = ''; // 入力フィールドをクリア
                            };

                            request.onerror = () => {
                                alert('このサブカテゴリ名はすでに存在しています。');
                            };
                        } else {
                            alert('親カテゴリの選択が正しくありません。');
                        }
                    } else {
                        alert('サブカテゴリ名を入力し、親カテゴリを選択してください。');
                    }
                } else {
                    alert('サブカテゴリ名入力フィールドまたは親カテゴリが見つかりません。');
                }
            });
        }

        // 上位カテゴリ選択時にサブカテゴリ選択肢を更新
        if (productParentCategorySelect) {
            productParentCategorySelect.addEventListener('change', updateProductCategorySelects);
        }

        if (globalParentCategorySelect) {
            globalParentCategorySelect.addEventListener('change', updateGlobalSubcategorySelect);
        }

        // 商品追加の処理
        if (addProductButton) {
            addProductButton.addEventListener('click', () => {
                const subcategoryId = productSubcategorySelect && productSubcategorySelect.value !== '' ? parseInt(productSubcategorySelect.value, 10) : null;
                const productNameElement = document.getElementById('product-name');
                const quantityElement = document.getElementById('product-quantity');
                const priceElement = document.getElementById('product-price');
                const costElement = document.getElementById('product-cost');
                const barcodeElement = document.getElementById('product-barcode');
                const unitAmountElement = document.getElementById('product-unit-amount');

                if (subcategoryId !== null && !isNaN(subcategoryId) && productNameElement && quantityElement && priceElement && costElement && barcodeElement && unitAmountElement) {
                    const productName = productNameElement.value.trim();
                    const quantity = Number(quantityElement.value.trim());
                    const price = Number(priceElement.value.trim());
                    const cost = Number(costElement.value.trim());
                    const barcode = barcodeElement.value.trim();
                    const unitAmount = Number(unitAmountElement.value.trim());

                    if (productName !== '' && !isNaN(quantity) && !isNaN(price) && !isNaN(cost) && barcode !== '' && !isNaN(unitAmount)) {
                        const product = {
                            subcategoryId,
                            name: productName,
                            quantity,
                            price,
                            cost,
                            barcode,
                            unitAmount
                        };
                        saveProductToDB(product);
                        displayProducts(subcategoryId);
                        productNameElement.value = '';
                        quantityElement.value = '';
                        priceElement.value = '';
                        costElement.value = '';
                        barcodeElement.value = '';
                        unitAmountElement.value = '';
                    } else {
                        alert('すべてのフィールドを正しく入力してください。');
                    }
                } else {
                    alert('商品情報の入力フィールドが見つからないか、サブカテゴリが選択されていません。');
                }
            });
        }

        // 全体在庫に追加する処理
        if (addGlobalInventoryButton) {
            addGlobalInventoryButton.addEventListener('click', () => {
                const subcategoryId = globalSubcategorySelect && globalSubcategorySelect.value !== '' ? parseInt(globalSubcategorySelect.value, 10) : null;
                const quantityElement = document.getElementById('global-quantity');

                if (subcategoryId !== null && !isNaN(subcategoryId) && quantityElement) {
                    const quantity = Number(quantityElement.value.trim());

                    if (!isNaN(quantity) && quantity >= 0) {
                        saveGlobalInventoryToDB({ subcategoryId, quantity });
                        alert(`全体在庫に追加されました。`);
                        quantityElement.value = '';
                        displayGlobalInventory();
                    } else {
                        alert('在庫量を正しく入力してください。');
                    }
                } else {
                    alert('全体在庫情報の入力フィールドが見つからないか、サブカテゴリが選択されていません。');
                }
            });
        }

        // バーコードスキャンの処理
        if (startScanButton) {
            startScanButton.addEventListener('click', () => {
                if (isScanning) return;
                isScanning = true;

                // Quagga の初期化
                Quagga.init({
                    inputStream: {
                        type: "LiveStream",
                        target: scannerContainer,
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
                            findProductByBarcode(barcode);
                        } else {
                            console.warn('バーコードが検出されませんでした。');
                        }
                    };

                    // onDetected リスナーを登録
                    Quagga.onDetected(onDetected);
                });
            });
        }
    }

    // セクションを切り替える関数
    function showSection(section) {
        Object.keys(sections).forEach(key => {
            sections[key].style.display = 'none';
        });
        sections[section].style.display = 'block';
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
            if (parentCategorySelect) {
                parentCategorySelect.innerHTML = ''; // リストをクリア

                // デフォルトの選択肢を追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = '親カテゴリを選択';
                parentCategorySelect.appendChild(defaultOption);

                categories.filter(cat => cat.parentId === null).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    parentCategorySelect.appendChild(option);
                });
            }

            // 商品登録用の上位カテゴリ選択肢を更新
            if (productParentCategorySelect) {
                productParentCategorySelect.innerHTML = '';

                // デフォルトの選択肢を追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = '親カテゴリを選択';
                productParentCategorySelect.appendChild(defaultOption);

                categories.filter(cat => cat.parentId === null).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    productParentCategorySelect.appendChild(option);
                });
                // サブカテゴリを更新
                updateProductCategorySelects();
            }

            // 全体在庫用の上位カテゴリ選択肢を更新
            if (globalParentCategorySelect) {
                globalParentCategorySelect.innerHTML = '';

                // デフォルトの選択肢を追加
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = '親カテゴリを選択';
                globalParentCategorySelect.appendChild(defaultOption);

                categories.filter(cat => cat.parentId === null).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.text = category.name;
                    globalParentCategorySelect.appendChild(option);
                });
                // サブカテゴリを更新
                updateGlobalSubcategorySelect();
            }

            // カテゴリ一覧を表示
            displayCategories();
        };

        request.onerror = (event) => {
            console.error('Error fetching categories:', event.target.error);
        };
    }

    // 商品登録用のサブカテゴリ選択肢を更新する関数
    function updateProductCategorySelects() {
        const parentCategoryId = productParentCategorySelect && productParentCategorySelect.value !== '' ? parseInt(productParentCategorySelect.value, 10) : null;
        if (parentCategoryId !== null && !isNaN(parentCategoryId)) {
            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const index = store.index('parentId');
            const request = index.getAll(parentCategoryId);

            request.onsuccess = (event) => {
                const subcategories = event.target.result;
                if (productSubcategorySelect) {
                    productSubcategorySelect.innerHTML = '';

                    // デフォルトの選択肢を追加
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.text = 'サブカテゴリを選択';
                    productSubcategorySelect.appendChild(defaultOption);

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
            };
        } else {
            if (productSubcategorySelect) {
                productSubcategorySelect.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = 'サブカテゴリを選択';
                productSubcategorySelect.appendChild(defaultOption);
            }
        }
    }

    // 全体在庫用のサブカテゴリ選択肢を更新する関数
    function updateGlobalSubcategorySelect() {
        const parentCategoryId = globalParentCategorySelect && globalParentCategorySelect.value !== '' ? parseInt(globalParentCategorySelect.value, 10) : null;
        if (parentCategoryId !== null && !isNaN(parentCategoryId)) {
            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const index = store.index('parentId');
            const request = index.getAll(parentCategoryId);

            request.onsuccess = (event) => {
                const subcategories = event.target.result;
                if (globalSubcategorySelect) {
                    globalSubcategorySelect.innerHTML = '';

                    // デフォルトの選択肢を追加
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.text = 'サブカテゴリを選択';
                    globalSubcategorySelect.appendChild(defaultOption);

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
            };
        } else {
            if (globalSubcategorySelect) {
                globalSubcategorySelect.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.text = 'サブカテゴリを選択';
                globalSubcategorySelect.appendChild(defaultOption);
            }
        }
    }

    // 商品をDBに保存する関数
    function saveProductToDB(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        store.put(product);

        transaction.oncomplete = () => {
            console.log(`Product "${product.name}" saved successfully.`);
        };

        transaction.onerror = (event) => {
            console.error('Error saving product:', event.target.error);
        };
    }

    // 商品を表示する関数
    function displayProducts(subcategoryId) {
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
                        // 編集フォームを表示
                        showEditProductForm(product, subcategoryId);
                    });
                    row.insertCell(6).appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'product-button';
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この商品を削除しますか？')) {
                            const transaction = db.transaction(['products'], 'readwrite');
                            const store = transaction.objectStore('products');
                            store.delete(product.id);

                            transaction.oncomplete = () => {
                                console.log(`Product "${product.name}" deleted successfully.`);
                                displayProducts(subcategoryId);
                            };

                            transaction.onerror = (event) => {
                                console.error('Error deleting product:', event.target.error);
                            };
                        }
                    });
                    row.insertCell(7).appendChild(deleteButton);
                });
            } else {
                console.error("product-tableのtbodyが見つかりません。");
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching products:', event.target.error);
        };
    }

    // 商品編集フォームを表示する関数
    function showEditProductForm(product, subcategoryId) {
        // 編集フォームの要素を作成
        const editForm = document.createElement('div');
        editForm.className = 'edit-form';

        editForm.innerHTML = `
            <h3>商品を編集</h3>
            <label>商品名: <input type="text" id="edit-product-name" value="${product.name}"></label><br>
            <label>数量: <input type="number" id="edit-product-quantity" value="${product.quantity}"></label><br>
            <label>価格: <input type="number" id="edit-product-price" value="${product.price}"></label><br>
            <label>原価: <input type="number" id="edit-product-cost" value="${product.cost}"></label><br>
            <label>バーコード: <input type="text" id="edit-product-barcode" value="${product.barcode}"></label><br>
            <label>サイズ（量）: <input type="number" id="edit-product-unit-amount" value="${product.unitAmount}"></label><br>
            <button id="save-edit-button">保存</button>
            <button id="cancel-edit-button">キャンセル</button>
        `;

        // 編集フォームを表示
        document.body.appendChild(editForm);

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
                const transaction = db.transaction(['products'], 'readwrite');
                const store = transaction.objectStore('products');

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

                store.put(updatedProduct);

                transaction.oncomplete = () => {
                    console.log(`Product "${updatedProduct.name}" updated successfully.`);
                    // 編集フォームを削除
                    document.body.removeChild(editForm);
                    // 商品一覧を更新
                    displayProducts(subcategoryId);
                    displayInventoryProducts(subcategoryId);
                };

                transaction.onerror = (event) => {
                    console.error('Error updating product:', event.target.error);
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

    // 全体在庫をDBに保存する関数
    function saveGlobalInventoryToDB(globalInventory) {
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        store.put(globalInventory);

        transaction.oncomplete = () => {
            console.log(`Global inventory for subcategoryId ${globalInventory.subcategoryId} saved successfully.`);
        };

        transaction.onerror = (event) => {
            console.error('Error saving global inventory:', event.target.error);
        };
    }

    // 全体在庫を表示する関数
    function displayGlobalInventory() {
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
                                listItem.textContent = `${subcategory.name}: ${quantity}`;
                                globalInventoryList.appendChild(listItem);
                            }
                        };
                        categoryRequest.onerror = (catError) => {
                            console.error('Error fetching category:', catError);
                        };
                    } else {
                        console.warn('Invalid inventory entry:', inventory);
                    }
                });
            } else {
                console.error("global-inventory-list が見つかりません。");
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching global inventory:', event.target.error);
        };
    }

    // カテゴリ一覧を表示する関数
    function loadCategories() {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const categoriesResult = event.target.result;
            categories = categoriesResult.reduce((acc, category) => {
                acc[category.id] = category;
                return acc;
            }, {});
            displayCategories();
        };

        request.onerror = (event) => {
            console.error('Error fetching categories:', event.target.error);
        };
    }

    // 売上データを読み込む関数
    function loadSales() {
        displaySales();
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
                            };
                        }
                    });
                    parentDiv.appendChild(editParentButton);

                    const deleteParentButton = document.createElement('button');
                    deleteParentButton.textContent = '削除';
                    deleteParentButton.addEventListener('click', () => {
                        if (confirm('このカテゴリとそのサブカテゴリを削除しますか？')) {
                            deleteCategoryAndSubcategories(parentCategory.id);

                            transaction.oncomplete = () => {
                                console.log(`Category "${parentCategory.name}" and its subcategories deleted successfully.`);
                                displayCategories();
                                updateCategorySelects();
                            };

                            transaction.onerror = (event) => {
                                console.error('Error deleting category and subcategories:', event.target.error);
                            };
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
                                };
                            }
                        });
                        subDiv.appendChild(editSubButton);

                        const deleteSubButton = document.createElement('button');
                        deleteSubButton.textContent = '削除';
                        deleteSubButton.addEventListener('click', () => {
                            if (confirm('このサブカテゴリを削除しますか？')) {
                                deleteCategory(subcategory.id);

                                transaction.oncomplete = () => {
                                    console.log(`Subcategory "${subcategory.name}" deleted successfully.`);
                                    displayCategories();
                                    updateCategorySelects();
                                };

                                transaction.onerror = (event) => {
                                    console.error('Error deleting subcategory:', event.target.error);
                                };
                            }
                        });
                        subDiv.appendChild(deleteSubButton);

                        parentDiv.appendChild(subDiv);
                    });

                    categoryList.appendChild(parentDiv);
                });
            } else {
                console.error("category-list が見つかりません。");
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching categories for display:', event.target.error);
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
        };
    }

    // カテゴリを削除する関数
    function deleteCategory(categoryId) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        store.delete(categoryId);

        transaction.oncomplete = () => {
            console.log(`Category with ID ${categoryId} deleted successfully.`);
        };

        transaction.onerror = (event) => {
            console.error('Error deleting category:', event.target.error);
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
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching categories for inventory display:', event.target.error);
        };
    }

    // 在庫管理用の商品一覧を表示する関数
    function displayInventoryProducts(subcategoryId) {
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
                        <button class="delete-button">削除</button>`;
                    inventoryProductList.appendChild(productDiv);

                    const editButton = productDiv.querySelector('.edit-button');
                    editButton.addEventListener('click', () => {
                        // 編集フォームを表示
                        showEditProductForm(product, subcategoryId);
                    });

                    const deleteButton = productDiv.querySelector('.delete-button');
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この商品を削除しますか？')) {
                            const transaction = db.transaction(['products'], 'readwrite');
                            const store = transaction.objectStore('products');
                            store.delete(product.id);

                            transaction.oncomplete = () => {
                                console.log(`Product "${product.name}" deleted successfully.`);
                                displayInventoryProducts(subcategoryId);
                            };

                            transaction.onerror = (event) => {
                                console.error('Error deleting product:', event.target.error);
                            };
                        }
                    });
                });
            } else {
                console.error("inventory-product-list が見つかりません。");
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching products for inventory display:', event.target.error);
        };
    }

    // 商品販売時の在庫更新処理
    function updateProductQuantity(product, quantity) {
        const transaction = db.transaction(['products'], 'readwrite');
        const productStore = transaction.objectStore('products');

        const updatedQuantity = product.quantity - Number(quantity);
        if (isNaN(updatedQuantity)) {
            console.warn(`Invalid calculation for product "${product.name}". Setting quantity to 0.`);
            product.quantity = 0;
        } else {
            product.quantity = updatedQuantity;
        }
        productStore.put(product);

        transaction.oncomplete = () => {
            console.log(`Product "${product.name}" quantity updated to ${product.quantity}.`);
            // 商品のサイズを渡す
            updateGlobalInventoryOnSale(product.subcategoryId, Number(quantity), product.unitAmount);
        };

        transaction.onerror = (event) => {
            console.error('Error updating product quantity:', event.target.error);
        };
    }

    // 全体在庫から減らす処理
    function updateGlobalInventoryOnSale(subcategoryId, quantity, unitAmount) {
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        const request = store.get(subcategoryId);

        request.onsuccess = (event) => {
            const globalInventory = event.target.result;
            if (globalInventory) {
                const q = Number(quantity);
                const ua = Number(unitAmount);
                if (isNaN(q) || isNaN(ua)) {
                    console.warn(`Invalid quantity (${quantity}) or unitAmount (${unitAmount}) for subcategoryId ${subcategoryId}`);
                    return;
                }
                const totalAmountToReduce = q * ua;
                let currentQuantity = Number(globalInventory.quantity);
                if (isNaN(currentQuantity)) {
                    currentQuantity = 0;
                    console.warn(`Invalid current quantity for subcategoryId ${subcategoryId}, defaulting to 0.`);
                }
                const newQuantity = currentQuantity - totalAmountToReduce;
                if (isNaN(newQuantity)) {
                    globalInventory.quantity = 0;
                    console.warn(`Resulting quantity is NaN for subcategoryId ${subcategoryId}, defaulting to 0.`);
                } else {
                    globalInventory.quantity = newQuantity;
                }
                store.put(globalInventory);

                transaction.oncomplete = () => {
                    console.log(`Global inventory for subcategoryId ${subcategoryId} updated to ${globalInventory.quantity}.`);
                    displayGlobalInventory();
                };

                transaction.onerror = (event) => {
                    console.error('Error updating global inventory:', event.target.error);
                };
            } else {
                console.warn(`Global inventory for subcategoryId ${subcategoryId} not found. Creating new entry.`);
                // 新規作成
                const newGlobalInventory = {
                    subcategoryId,
                    quantity: 0
                };
                store.put(newGlobalInventory);

                transaction.oncomplete = () => {
                    console.log(`Global inventory for subcategoryId ${subcategoryId} created with quantity 0.`);
                    displayGlobalInventory();
                };

                transaction.onerror = (event) => {
                    console.error('Error creating global inventory:', event.target.error);
                };
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching global inventory:', event.target.error);
        };
    }

    // 商品販売時の売上データ保存
    function addSaleToDB(product, quantity) {
        const q = Number(quantity);
        if (isNaN(q) || q <= 0) {
            alert('有効な数量を入力してください。');
            return;
        }

        const totalPrice = product.price * q;
        const totalCost = product.cost * q;
        const profit = totalPrice - totalCost;

        const sale = {
            productName: product.name,
            quantity: q,
            totalPrice: totalPrice,
            profit: profit,
            date: new Date().toISOString().split('T')[0]
        };

        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.put(sale);

        transaction.oncomplete = () => {
            console.log(`Sale for product "${product.name}" recorded successfully.`);
            displaySales();
        };

        transaction.onerror = (event) => {
            console.error('Error recording sale:', event.target.error);
        };
    }

    // 売上を表示する関数
    function displaySales() {
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
                    row.insertCell(2).textContent = sale.productName;
                    row.insertCell(3).textContent = sale.quantity;
                    row.insertCell(4).textContent = sale.totalPrice;
                    row.insertCell(5).textContent = sale.profit;

                    const editButton = document.createElement('button');
                    editButton.textContent = '編集';
                    editButton.className = 'product-button';
                    editButton.addEventListener('click', () => {
                        // 編集機能の実装（必要に応じて）
                        alert('編集機能は未実装です。');
                    });
                    row.insertCell(6).appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'product-button';
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この売上を削除しますか？')) {
                            const transaction = db.transaction(['sales'], 'readwrite');
                            const store = transaction.objectStore('sales');
                            store.delete(sale.id);

                            transaction.oncomplete = () => {
                                console.log(`Sale "${sale.productName}" deleted successfully.`);
                                displaySales();
                            };

                            transaction.onerror = (event) => {
                                console.error('Error deleting sale:', event.target.error);
                            };
                        }
                    });
                    row.insertCell(7).appendChild(deleteButton);
                });
            } else {
                console.error("sales-tableのtbodyが見つかりません。");
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching sales:', event.target.error);
        };
    }

    // カテゴリ選択を表示する関数（売上用）
    function displayCategorySelectionForSales() {
        const salesCategoryContainer = document.getElementById('salesCategoryContainer');
        if (salesCategoryContainer) {
            salesCategoryContainer.innerHTML = '';

            const transaction = db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const categories = event.target.result;

                categories.filter(cat => cat.parentId !== null).forEach(subcategory => {
                    const button = document.createElement('button');
                    button.textContent = subcategory.name;
                    button.className = 'category-button';
                    button.addEventListener('click', () => {
                        displaySalesProducts(subcategory.id);
                    });
                    salesCategoryContainer.appendChild(button);
                });
            };

            request.onerror = (event) => {
                console.error('Error fetching categories for sales selection:', event.target.error);
            };
        } else {
            console.error("salesCategoryContainer が見つかりません。");
        }
    }

    // 商品選択を表示する関数（売上用）
    function displaySalesProducts(subcategoryId) {
        const salesProductContainer = document.getElementById('salesProductContainer');
        if (salesProductContainer) {
            salesProductContainer.innerHTML = '';

            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('subcategoryId');
            const request = index.getAll(subcategoryId);

            request.onsuccess = (event) => {
                const products = event.target.result;

                products.forEach(product => {
                    const button = document.createElement('button');
                    button.textContent = product.name;
                    button.className = 'inventory-product-button';
                    button.addEventListener('click', () => {
                        const quantity = prompt(`商品名: ${product.name}\n購入数量を入力してください:`);
                        if (quantity) {
                            const q = Number(quantity);
                            if (!isNaN(q) && q > 0) {
                                updateProductQuantity(product, q);
                                addSaleToDB(product, q);
                            } else {
                                alert('有効な数量を入力してください。');
                            }
                        } else {
                            alert('数量を入力してください。');
                        }
                    });
                    salesProductContainer.appendChild(button);
                });
            };

            request.onerror = (event) => {
                console.error('Error fetching products for sales:', event.target.error);
            };
        } else {
            console.error("salesProductContainer が見つかりません。");
        }
    }

    // バーコードから商品を検索する関数
    function findProductByBarcode(barcode) {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('barcode');
        const request = index.get(barcode);

        request.onsuccess = (event) => {
            const product = event.target.result;
            if (product) {
                const quantity = prompt(`バーコード: ${barcode}\n商品名: ${product.name}\n購入数量を入力してください:`);
                if (quantity) {
                    const q = Number(quantity);
                    if (!isNaN(q) && q > 0) {
                        updateProductQuantity(product, q);
                        addSaleToDB(product, q);
                    } else {
                        showErrorModal('有効な数量を入力してください。');
                    }
                } else {
                    showErrorModal('数量が入力されませんでした。');
                }
            } else {
                showErrorModal('該当する商品が見つかりませんでした。');
            }
        };

        request.onerror = (event) => {
            console.error('Error fetching product by barcode:', event.target.error);
            showErrorModal('商品情報の取得中にエラーが発生しました。');
        };
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

    // ブラウザがバーコードスキャンに対応しているか確認
    function updateBarcodeScannerAvailability() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (startScanButton) {
                startScanButton.disabled = true;
                startScanButton.textContent = 'バーコードスキャンはサポートされていません';
            }
        }
    }
});
