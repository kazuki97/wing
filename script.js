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

    // 手動で売り上げを追加するボタンの処理
    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', () => {
            const productSelect = document.getElementById('product-select');
            const selectedProductId = productSelect.value;
            const quantity = parseInt(document.getElementById('sale-quantity').value, 10);

            if (selectedProductId && quantity > 0) {
                const transaction = db.transaction(['products', 'sales'], 'readwrite');
                const productStore = transaction.objectStore('products');
                const saleStore = transaction.objectStore('sales');

                const productRequest = productStore.get(parseInt(selectedProductId, 10));
                productRequest.onsuccess = (event) => {
                    const product = event.target.result;

                    if (product) {
                        // 在庫数を減らす
                        if (product.quantity >= quantity) {
                            product.quantity -= quantity;
                            productStore.put(product);

                            // 売上を追加
                            const sale = {
                                productName: product.name,
                                quantity: quantity,
                                totalPrice: product.price * quantity,
                                profit: (product.price - product.cost) * quantity,
                                date: new Date().toISOString().split('T')[0]
                            };
                            saleStore.put(sale);
                            alert('売上が追加されました。');
                        } else {
                            alert('在庫が不足しています。');
                        }
                    }
                };

                productRequest.onerror = () => {
                    alert('選択された商品が見つかりませんでした。');
                };
            } else {
                alert('商品と数量を正しく選択してください。');
            }
        });
    }

    // その他の関数はそのまま
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

    function saveGlobalInventoryToDB(globalInventory) {
        const transaction = db.transaction(['globalInventory'], 'readwrite');
        const store = transaction.objectStore('globalInventory');
        store.put(globalInventory);
        displayGlobalInventory();
    }

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

    // 他の関数も続けて省略なしに記載
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
