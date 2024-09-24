document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let isScanning = false;

    // データベースを開く
    const request = indexedDB.open('inventoryDB', 5); // バージョンを5に設定

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
            updateCategorySelect(); // カテゴリ選択を更新
        } catch (error) {
            console.error('Error in onsuccess:', error);
        }
    };

    // データベースのアップグレード
    request.onupgradeneeded = (event) => {
        db = event.target.result;

        if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'name' });
        }

        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
            productStore.createIndex('category', 'category', { unique: false });
            productStore.createIndex('barcode', 'barcode', { unique: true });
        } else {
            const productStore = event.target.transaction.objectStore('products');
            if (!productStore.indexNames.contains('barcode')) {
                productStore.createIndex('barcode', 'barcode', { unique: true });
            }
        }

        if (!db.objectStoreNames.contains('sales')) {
            db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('globalInventory')) {
            db.createObjectStore('globalInventory', { keyPath: 'category' });
        }

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
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('closeErrorModal');
    const searchButton = document.getElementById('searchButton');
    const rangeSearchButton = document.getElementById('rangeSearchButton');
    const monthFilter = document.getElementById('month-filter');
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
    linkSales.addEventListener('click', () => showSection('sales'));
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

    // カテゴリ追加の不具合修正
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', () => {
            const categoryName = document.getElementById('category-name').value;

            if (categoryName) {
                const category = { name: categoryName };

                const transaction = db.transaction(['categories'], 'readwrite');
                const store = transaction.objectStore('categories');
                const request = store.add(category);

                request.onsuccess = () => {
                    alert(`${categoryName} がカテゴリに追加されました。`);
                    updateCategorySelect(); // カテゴリ選択を更新
                };

                request.onerror = () => {
                    alert('このカテゴリ名はすでに存在しています。');
                };

                document.getElementById('category-name').value = ''; // 入力フィールドをクリア
            } else {
                alert('カテゴリ名を入力してください。');
            }
        });
    }

    // 商品追加の処理
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            const category = categorySelect.value;
            const productName = document.getElementById('product-name').value;
            const quantity = document.getElementById('product-quantity').value;
            const price = document.getElementById('product-price').value;
            const cost = document.getElementById('product-cost').value;
            const barcode = document.getElementById('product-barcode').value;
            const size = document.getElementById('product-size').value;

            if (category && productName && quantity && price && cost && barcode && size) {
                const product = {
                    category,
                    name: productName,
                    quantity: parseInt(quantity, 10),
                    price: parseFloat(price),
                    cost: parseFloat(cost),
                    barcode,
                    size: parseFloat(size)
                };
                saveProductToDB(product);
                displayProducts(category);
                document.getElementById('product-name').value = '';
                document.getElementById('product-quantity').value = '';
                document.getElementById('product-price').value = '';
                document.getElementById('product-cost').value = '';
                document.getElementById('product-barcode').value = '';
                document.getElementById('product-size').value = '';
                updateProductSelectForGlobalInventory(); // 商品リストの更新
            } else {
                alert('すべてのフィールドを入力してください。');
            }
        });
    }

    // 全体在庫に関連する商品を保存する処理
    if (addGlobalInventoryButton) {
        addGlobalInventoryButton.addEventListener('click', () => {
            const category = document.getElementById('global-category').value;
            const quantity = parseInt(document.getElementById('global-quantity').value, 10);
            const relatedProductId = globalInventoryProductSelect.value; // 関連する商品のID

            if (category && quantity > 0 && relatedProductId) {
                saveGlobalInventoryToDB({ category, quantity });
                saveRelatedProduct(category, relatedProductId); // 関連商品を保存
                alert(`${category} の全体在庫が追加されました。`);
                document.getElementById('global-category').value = '';
                document.getElementById('global-quantity').value = '';
            } else {
                alert('すべてのフィールドを正しく入力してください。');
            }
        });
    }

    // 関連商品を保存する関数
    function saveRelatedProduct(globalCategory, productId) {
        const transaction = db.transaction(['relatedProducts'], 'readwrite');
        const store = transaction.objectStore('relatedProducts');
        const relatedProduct = { globalCategory, productId };
        store.put(relatedProduct);
    }

    // 全体在庫から関連商品が購入された場合に自動で在庫を減らす処理
    function updateGlobalInventoryOnSale(productId, quantity) {
        const transaction = db.transaction(['relatedProducts'], 'readonly');
        const store = transaction.objectStore('relatedProducts');
        const index = store.index('productId');
        const request = index.getAll(productId);

        request.onsuccess = (event) => {
            const relatedProducts = event.target.result;
            relatedProducts.forEach(relatedProduct => {
                const globalInventoryTransaction = db.transaction(['globalInventory'], 'readwrite');
                const globalStore = globalInventoryTransaction.objectStore('globalInventory');
                const globalRequest = globalStore.get(relatedProduct.globalCategory);

                globalRequest.onsuccess = (event) => {
                    const globalInventory = event.target.result;
                    if (globalInventory) {
                        globalInventory.quantity -= quantity;
                        globalStore.put(globalInventory);
                    }
                };
            });
        };
    }

    // 在庫の入荷機能（全体在庫に追加）
    if (addStockButton) {
        addStockButton.addEventListener('click', () => {
            const category = document.getElementById('global-category').value;
            const quantity = parseInt(document.getElementById('stock-quantity').value, 10);

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
        });
    }

    // 商品の小分け在庫と全体在庫の更新処理
    function updateProductQuantity(product, quantity) {
        const transaction = db.transaction(['products', 'globalInventory'], 'readwrite');
        const productStore = transaction.objectStore('products');
        const globalInventoryStore = transaction.objectStore('globalInventory');

        product.quantity -= parseInt(quantity, 10);
        productStore.put(product);

        const globalRequest = globalInventoryStore.get(product.category);
        globalRequest.onsuccess = (event) => {
            const globalInventory = event.target.result;
            if (globalInventory) {
                globalInventory.quantity -= product.size * quantity;
                globalInventoryStore.put(globalInventory);
            }
        };
        updateGlobalInventoryOnSale(product.id, product.size * quantity); // 全体在庫から減らす
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

    // 商品名からどの全体在庫カテゴリに対応するかを判断する関数
    function findGlobalCategoryKey(productName) {
        if (productName.includes('CRD')) {
            return 'CRD';
        } else if (productName.includes('CRDH')) {
            return 'CRDH';
        }
        return null;
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

    function updateProductQuantity(product, quantity) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        product.quantity -= parseInt(quantity, 10);
        store.put(product);
    }

    function addSaleToDB(product, quantity) {
        const sale = {
            productName: product.name,
            quantity: parseInt(quantity, 10),
            totalPrice: product.price * quantity,
            profit: (product.price - product.cost) * quantity,
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
        };
    }

    function loadSales() {
        displaySales();
    }

    function updateCategorySelect() {
        categorySelect.innerHTML = '';
        for (const categoryName in categories) {
            const option = document.createElement('option');
            option.value = categoryName;
            option.text = categoryName;
            categorySelect.add(option);
        }
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
                row.insertCell(2).textContent = product.price;
                row.insertCell(3).textContent = product.cost;
                row.insertCell(4).textContent = product.barcode;

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
                row.insertCell(5).appendChild(editButton);

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
                row.insertCell(6).appendChild(deleteButton);
            });
        };
    }

    function displayInventoryCategories() {
        const inventoryCategoryList = document.getElementById('inventory-category-list');
        inventoryCategoryList.innerHTML = '';

        for (const categoryName in categories) {
            const button = document.createElement('button');
            button.textContent = categoryName;
            button.className = 'inventory-category-button';
            button.addEventListener('click', () => {
                displayInventoryProducts(categoryName);
            });

            inventoryCategoryList.appendChild(button);
        }
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
                row.innerHTML = 
                    `<p>${product.name}</p>
                    <p>${product.quantity}</p>
                    <p>${product.price}</p>
                    <p>${product.barcode}</p>
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
                    row.classList.add('editable');
                    row.querySelectorAll('td').forEach((cell, cellIndex) => {
                        if (cellIndex !== 0 && cellIndex !== 6 && cellIndex !== 7) {
                            cell.addEventListener('click', () => {
                                const originalValue = cell.textContent;
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.value = originalValue;
                                cell.innerHTML = '';
                                cell.appendChild(input);
                                input.focus();
                                input.addEventListener('blur', () => {
                                    const newValue = input.value;
                                    cell.textContent = newValue;
                                    row.classList.remove('editable');
                                    if (cellIndex === 1) {
                                        sale.date = newValue;
                                    } else if (cellIndex === 2) {
                                        sale.productName = newValue;
                                    } else if (cellIndex === 3) {
                                        sale.quantity = parseInt(newValue, 10);
                                        sale.totalPrice = sale.quantity * (sale.totalPrice / sale.quantity);
                                    } else if (cellIndex === 4) {
                                        sale.totalPrice = parseFloat(newValue);
                                    } else if (cellIndex === 5) {
                                        sale.profit = parseFloat(newValue);
                                    }
                                    saveSaleToDB(sale);
                                    displaySales();
                                });
                            });
                        }
                    });
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
