document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let isScanning = false;

    // データベースを開く（バージョンを9に上げました）
    const request = indexedDB.open('inventoryDB', 9);

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
            updateProductSelectForGlobalInventory(); // 商品選択リストを更新
            displayInventoryCategories(); // インベントリカテゴリを表示
        } catch (error) {
            console.error('Error in onsuccess:', error);
        }
    };

    // データベースのアップグレード
    request.onupgradeneeded = (event) => {
        db = event.target.result;

        // 既存のオブジェクトストアを確認・作成

        // カテゴリ
        if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'name' });
        }

        // 商品
        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
            productStore.createIndex('category', 'category', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: true });
        } else {
            const productStore = event.currentTarget.transaction.objectStore('products');
            if (!productStore.indexNames.contains('barcode')) {
                productStore.createIndex('barcode', 'barcode', { unique: true });
            }
        }

        // 売上
        if (!db.objectStoreNames.contains('sales')) {
            db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        }

        // 全体在庫
        if (!db.objectStoreNames.contains('globalInventory')) {
            db.createObjectStore('globalInventory', { keyPath: 'category' });
        }

        // relatedProducts オブジェクトストアの作成を確認・修正
        if (!db.objectStoreNames.contains('relatedProducts')) {
            const relatedProductsStore = db.createObjectStore('relatedProducts', { keyPath: 'id', autoIncrement: true });
            relatedProductsStore.createIndex('globalCategory', 'globalCategory', { unique: false });
            relatedProductsStore.createIndex('productId', 'productId', { unique: false });
        }
    };

    // 必要なボタンや要素の取得
    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    const addCategoryButton = document.getElementById('add-category');
    const categorySelect = document.getElementById('category-select');
    const addProductButton = document.getElementById('add-product');
    const addGlobalInventoryButton = document.getElementById('add-global-inventory');
    const addStockButton = document.getElementById('add-stock-button');
    const scannerContainer = document.getElementById('scanner-container');
    const startScanButton = document.getElementById('start-scan');
    const globalInventoryProductSelect = document.getElementById('global-inventory-product-select');

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

    // manualAddSalesButtonにイベントリスナーを追加して、カテゴリ一覧を表示させる
    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', () => {
            showSection('sales'); // 売上セクションを表示
            displayCategorySelectionForSales();
        });
    }

    // セクションを切り替える関数
    function showSection(section) {
        Object.keys(sections).forEach(key => {
            sections[key].style.display = 'none';
        });
        sections[section].style.display = 'block';
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

    // 全体在庫に関連する商品を選択するためのプルダウンメニューを更新する関数
    function updateProductSelectForGlobalInventory() {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const products = event.target.result;
            if (globalInventoryProductSelect) {
                globalInventoryProductSelect.innerHTML = ''; // リストをクリア

                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.text = product.name;
                    globalInventoryProductSelect.appendChild(option);
                });
            } else {
                console.error("globalInventoryProductSelect が見つかりません。");
            }
        };
    }

    // カテゴリ選択を更新する関数
    function updateCategorySelect() {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const categories = event.target.result;

            if (categorySelect) {
                categorySelect.innerHTML = ''; // リストをクリア

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.text = category.name;
                    categorySelect.appendChild(option);
                });
            } else {
                console.error("categorySelect が見つかりません。");
            }
        };
    }

    // カテゴリ追加の処理
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', () => {
            const categoryNameElement = document.getElementById('category-name');
            if (categoryNameElement) {
                const categoryName = categoryNameElement.value;

                if (categoryName) {
                    const category = { name: categoryName };

                    const transaction = db.transaction(['categories'], 'readwrite');
                    const store = transaction.objectStore('categories');
                    const request = store.add(category);

                    request.onsuccess = () => {
                        alert(`${categoryName} がカテゴリに追加されました。`);
                        updateCategorySelect(); // カテゴリ選択を更新
                        displayInventoryCategories(); // インベントリカテゴリを更新
                    };

                    request.onerror = () => {
                        alert('このカテゴリ名はすでに存在しています。');
                    };

                    categoryNameElement.value = ''; // 入力フィールドをクリア
                } else {
                    alert('カテゴリ名を入力してください。');
                }
            } else {
                alert('カテゴリ名入力フィールドが見つかりません。');
            }
        });
    }

    // 商品追加の処理
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            const category = categorySelect ? categorySelect.value : null;
            const productNameElement = document.getElementById('product-name');
            const quantityElement = document.getElementById('product-quantity');
            const unitPriceElement = document.getElementById('product-unit-price');
            const barcodeElement = document.getElementById('product-barcode');
            const sizeElement = document.getElementById('product-size');
            const costPerGramElement = document.getElementById('product-cost-per-gram'); // 新しく追加

            if (category && productNameElement && quantityElement && unitPriceElement && barcodeElement && sizeElement && costPerGramElement) {
                const productName = productNameElement.value;
                const quantity = quantityElement.value;
                const unitPrice = unitPriceElement.value;
                const barcode = barcodeElement.value;
                const size = sizeElement.value;
                const costPerGram = costPerGramElement.value;

                if (productName && quantity && unitPrice && barcode && size && costPerGram) {
                    const product = {
                        category,
                        name: productName,
                        quantity: parseInt(quantity, 10),
                        unitPrice: parseFloat(unitPrice),
                        price: parseFloat(unitPrice) * parseFloat(size),
                        barcode,
                        size: parseFloat(size),
                        costPerGram: parseFloat(costPerGram) // 商品ごとのグラムあたりの原価
                    };
                    saveProductToDB(product);
                    displayProducts(category);
                    productNameElement.value = '';
                    quantityElement.value = '';
                    unitPriceElement.value = '';
                    barcodeElement.value = '';
                    sizeElement.value = '';
                    costPerGramElement.value = '';
                    updateProductSelectForGlobalInventory(); // 商品リストの更新
                } else {
                    alert('すべてのフィールドを入力してください。');
                }
            } else {
                alert('商品情報の入力フィールドが見つかりません。');
            }
        });
    }

    // 全体在庫に関連する商品を保存する処理
    if (addGlobalInventoryButton) {
        addGlobalInventoryButton.addEventListener('click', () => {
            const globalCategoryElement = document.getElementById('global-category');
            const globalQuantityElement = document.getElementById('global-quantity');
            const relatedProductId = globalInventoryProductSelect ? globalInventoryProductSelect.value : null;

            if (globalCategoryElement && globalQuantityElement && relatedProductId) {
                const category = globalCategoryElement.value;
                const quantity = parseInt(globalQuantityElement.value, 10);

                if (category && quantity >= 0 && relatedProductId) {
                    saveGlobalInventoryToDB({ category, quantity });
                    saveRelatedProduct(category, relatedProductId); // 関連商品を保存
                    alert(`${category} の全体在庫が追加されました。`);
                    globalCategoryElement.value = '';
                    globalQuantityElement.value = '';
                } else {
                    alert('すべてのフィールドを正しく入力してください。');
                }
            } else {
                alert('全体在庫情報の入力フィールドが見つかりません。');
            }
        });
    }

    // 関連商品を保存する関数
    function saveRelatedProduct(globalCategory, productId) {
        const transaction = db.transaction(['relatedProducts'], 'readwrite');
        const store = transaction.objectStore('relatedProducts');
        const relatedProduct = { globalCategory, productId: Number(productId) };
        store.put(relatedProduct);
    }

    // 全体在庫から関連商品が購入された場合に自動で在庫を減らす処理
    function updateGlobalInventoryOnSale(productId, totalGramsSold) {
        const transaction = db.transaction(['relatedProducts'], 'readonly');
        const store = transaction.objectStore('relatedProducts');
        const index = store.index('productId');
        const request = index.getAll(Number(productId));

        request.onsuccess = (event) => {
            const relatedProducts = event.target.result;
            relatedProducts.forEach(relatedProduct => {
                const globalInventoryTransaction = db.transaction(['globalInventory'], 'readwrite');
                const globalStore = globalInventoryTransaction.objectStore('globalInventory');
                const globalRequest = globalStore.get(relatedProduct.globalCategory);

                globalRequest.onsuccess = (event) => {
                    const globalInventory = event.target.result;
                    if (globalInventory) {
                        globalInventory.quantity -= totalGramsSold;
                        globalStore.put(globalInventory);
                    }
                };
            });
        };
    }

    // 在庫の入荷機能（全体在庫に追加）
    if (addStockButton) {
        addStockButton.addEventListener('click', () => {
            const globalCategoryElement = document.getElementById('global-category');
            const stockQuantityElement = document.getElementById('stock-quantity');

            if (globalCategoryElement && stockQuantityElement) {
                const category = globalCategoryElement.value;
                const quantity = parseInt(stockQuantityElement.value, 10);

                if (category && quantity > 0) {
                    const transaction = db.transaction(['globalInventory'], 'readwrite');
                    const store = transaction.objectStore('globalInventory');
                    const request = store.get(category);

                    request.onsuccess = (event) => {
                        const globalInventory = event.target.result;
                        if (globalInventory) {
                            globalInventory.quantity += quantity;
                            store.put(globalInventory);
                            alert(`全体在庫に ${quantity} g が追加されました。`);
                            displayGlobalInventory();
                        }
                    };
                } else {
                    alert('カテゴリ名と在庫量を正しく入力してください。');
                }
            } else {
                alert('在庫の入荷情報の入力フィールドが見つかりません。');
            }
        });
    }

    // 商品の小分け在庫と全体在庫の更新処理
    function updateProductQuantity(product, quantity) {
        const transaction = db.transaction(['products'], 'readwrite');
        const productStore = transaction.objectStore('products');

        product.quantity -= parseInt(quantity, 10);
        productStore.put(product);

        const totalGramsSold = product.size * quantity;
        updateGlobalInventoryOnSale(product.id, totalGramsSold); // 全体在庫から減らす
    }

    // 全体在庫をDBに保存する関数
    function saveGlobalInventoryToDB(globalInventory) {
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        store.put(globalInventory);
        displayGlobalInventory();
    }

    // 全体在庫を表示する関数
    function displayGlobalInventory() {
        const transaction = db.transaction(['globalInventory'], 'readonly');
        const store = transaction.objectStore('globalInventory');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const globalInventories = event.target.result;
            const globalInventoryList = document.getElementById('global-inventory-list');
            if (globalInventoryList) {
                globalInventoryList.innerHTML = '';

                globalInventories.forEach(inventory => {
                    const listItem = document.createElement('div');
                    listItem.textContent = `${inventory.category}: ${inventory.quantity} g`;
                    globalInventoryList.appendChild(listItem);
                });
            } else {
                console.error("global-inventory-list が見つかりません。");
            }
        };
    }

    // カテゴリに関連する商品を表示する関数
    function displaySalesProducts(categoryName) {
        const salesProductContainer = document.getElementById('salesProductContainer');
        salesProductContainer.innerHTML = '';
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(categoryName);

        request.onsuccess = (event) => {
            const products = event.target.result;
            if (products.length === 0) {
                alert('該当する商品がありません。');
                return;
            }
            products.forEach(product => {
                const productButton = document.createElement('button');
                productButton.textContent = product.name;
                productButton.className = 'inventory-product-button';
                productButton.addEventListener('click', () => {
                    const quantity = prompt(`商品名: ${product.name}\n購入数量を入力してください:`);
                    if (quantity) {
                        updateProductQuantity(product, quantity);
                        addSaleToDB(product, quantity);
                    } else {
                        alert('数量を入力してください。');
                    }
                });
                salesProductContainer.appendChild(productButton);
            });
        };
    }

    // カテゴリ一覧を表示する関数を追加
    function displayCategorySelectionForSales() {
        const salesCategoryContainer = document.getElementById('salesCategoryContainer');
        salesCategoryContainer.innerHTML = ''; // 前回の内容をクリア

        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const categories = event.target.result;

            categories.forEach(category => {
                const categoryButton = document.createElement('button');
                categoryButton.textContent = category.name;
                categoryButton.className = 'category-button'; // スタイルを適用するためのクラス
                categoryButton.addEventListener('click', () => {
                    displaySalesProducts(category.name);
                });
                salesCategoryContainer.appendChild(categoryButton);
            });
        };
    }

    // バーコードをスキャンしたら在庫を減らし、売上に追加
    if (startScanButton) {
        startScanButton.addEventListener('click', () => {
            if (isScanning) return;
            isScanning = true;

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
                    return;
                }
                Quagga.start();
            });

            Quagga.onDetected((result) => {
                const barcode = result.codeResult.code;
                Quagga.stop();
                findProductByBarcode(barcode);
            });
        });
    }

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
                    updateProductQuantity(product, quantity);
                    addSaleToDB(product, quantity);
                    isScanning = false;
                } else {
                    showErrorModal('数量が無効です。');
                    isScanning = false;
                }
            } else {
                showErrorModal('該当する商品が見つかりませんでした。');
                document.getElementById('closeErrorModal').addEventListener('click', () => {
                    isScanning = false;
                });
            }
        };
    }

    function addSaleToDB(product, quantity) {
        const totalPrice = product.price * quantity;
        const totalCost = product.costPerGram * product.size * quantity;
        const profit = totalPrice - totalCost;

        const sale = {
            productName: product.name,
            quantity: parseInt(quantity, 10),
            totalPrice: totalPrice,
            profit: profit,
            date: new Date().toISOString().split('T')[0]
        };

        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.put(sale);
        displaySales();
    }

    function saveCategoryToDB(category) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        store.put(category);
    }

    function saveProductToDB(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        store.put(product);
    }

    function saveSaleToDB(sale) {
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.put(sale);
    }

    function loadCategories() {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const result = event.target.result;
            categories = {};
            result.forEach(category => {
                categories[category.name] = category.products;
            });
            displayCategories();
            updateCategorySelect(); // カテゴリ選択を更新
            displayInventoryCategories(); // インベントリカテゴリを表示
        };
    }

    function loadSales() {
        displaySales();
    }

    function displayCategories() {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';

        for (const categoryName in categories) {
            const div = document.createElement('div');
            div.className = 'category-item';

            const span = document.createElement('span');
            span.textContent = categoryName;

            const editButton = document.createElement('button');
            editButton.textContent = '編集';
            editButton.className = 'category-button';
            editButton.addEventListener('click', () => {
                const newCategoryName = prompt('新しいカテゴリ名を入力してください:', categoryName);
                if (newCategoryName && !categories[newCategoryName]) {
                    categories[newCategoryName] = categories[categoryName];
                    delete categories[categoryName];
                    saveCategoryToDB({
                        name: newCategoryName,
                        products: categories[newCategoryName]
                    });
                    displayCategories();
                } else {
                    alert('カテゴリ名が無効です。');
                }
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'category-button';
            deleteButton.addEventListener('click', () => {
                if (confirm('このカテゴリを削除しますか？')) {
                    delete categories[categoryName];
                    const transaction = db.transaction(['categories'], 'readwrite');
                    const store = transaction.objectStore('categories');
                    store.delete(categoryName);
                    displayCategories();
                    displayInventoryCategories(); // インベントリカテゴリを更新
                }
            });

            div.appendChild(span);
            div.appendChild(editButton);
            div.appendChild(deleteButton);

            categoryList.appendChild(div);
        }
    }

    function displayProducts(category) {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(category);

        request.onsuccess = (event) => {
            const products = event.target.result;
            const productTableBody = document.getElementById('product-table').getElementsByTagName('tbody')[0];
            productTableBody.innerHTML = '';

            products.forEach(product => {
                const row = productTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;
                row.insertCell(2).textContent = product.unitPrice;
                row.insertCell(3).textContent = product.size;
                row.insertCell(4).textContent = product.price;
                row.insertCell(5).textContent = product.costPerGram; // 原価を表示
                row.insertCell(6).textContent = product.barcode;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                    if (newQuantity !== null) {
                        product.quantity = parseInt(newQuantity, 10);
                        saveProductToDB(product);
                        displayProducts(category);
                    }
                });
                row.insertCell(7).appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'product-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        const transaction = db.transaction(['products'], 'readwrite');
                        const store = transaction.objectStore('products');
                        store.delete(product.id);
                        displayProducts(category);
                    }
                });
                row.insertCell(8).appendChild(deleteButton);
            });
        };
    }

    function displayInventoryCategories() {
        const inventoryCategoryList = document.getElementById('inventory-category-list');
        inventoryCategoryList.innerHTML = '';

        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const categories = event.target.result;
            categories.forEach(category => {
                const button = document.createElement('button');
                button.textContent = category.name;
                button.className = 'inventory-category-button';
                button.addEventListener('click', () => {
                    displayInventoryProducts(category.name);
                });

                inventoryCategoryList.appendChild(button);
            });
        };
    }

    function displayInventoryProducts(category) {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(category);

        request.onsuccess = (event) => {
            const products = event.target.result;
            const inventoryProductTableBody = document.getElementById('inventory-product-list');
            inventoryProductTableBody.innerHTML = '';

            products.forEach(product => {
                const row = document.createElement('div');
                row.className = 'inventory-item';
                row.innerHTML = `
                    <p>${product.name}</p>
                    <p>数量: ${product.quantity}</p>
                    <p>単価: ${product.unitPrice}</p>
                    <p>サイズ(g): ${product.size}</p>
                    <p>価格: ${product.price}</p>
                    <p>原価/グラム: ${product.costPerGram}</p>
                    <p>バーコード: ${product.barcode}</p>
                    <button class="edit-button">編集</button>
                    <button class="delete-button">削除</button>`;
                inventoryProductTableBody.appendChild(row);

                const editButton = row.querySelector('.edit-button');
                editButton.addEventListener('click', () => {
                    const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                    if (newQuantity !== null) {
                        product.quantity = parseInt(newQuantity, 10);
                        saveProductToDB(product);
                        displayInventoryProducts(category);
                    }
                });

                const deleteButton = row.querySelector('.delete-button');
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        const transaction = db.transaction(['products'], 'readwrite');
                        const store = transaction.objectStore('products');
                        store.delete(product.id);
                        displayInventoryProducts(category);
                    }
                });
            });
        };
    }

    function displaySales() {
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const sales = event.target.result;
            const salesTableBody = document.getElementById('sales-table').getElementsByTagName('tbody')[0];
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
                        displaySales();
                    }
                });
                row.insertCell(7).appendChild(deleteButton);
            });
        };
    }

    function showErrorModal(message) {
        const errorMessage = document.getElementById('errorMessage');
        const errorModal = document.getElementById('errorModal');
        const closeErrorModalButton = document.getElementById('closeErrorModal');

        if (errorMessage && errorModal && closeErrorModalButton) {
            errorMessage.textContent = message;
            errorModal.style.display = 'block';

            closeErrorModalButton.addEventListener('click', () => {
                errorModal.style.display = 'none';
            });
        } else {
            alert(message);
        }
    }
});
