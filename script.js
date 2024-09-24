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
            console.log('Database opened successfully:', db);
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
        console.log('Upgrading database...');

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

    // カテゴリ選択を更新する関数
    function updateCategorySelect() {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const categories = event.target.result;
            console.log('Categories loaded:', categories);
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

    // 商品を表示する関数
    function displayProducts(category) {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(category);

        request.onsuccess = (event) => {
            const products = event.target.result;
            console.log('Products loaded for category:', category, products);
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

    // 売上を手動で追加
    if (manualAddSalesButton) {
        manualAddSalesButton.addEventListener('click', () => {
            const productName = prompt("商品名を入力してください");
            const quantity = parseInt(prompt("数量を入力してください"), 10);
            const price = parseFloat(prompt("価格を入力してください"));

            if (productName && !isNaN(quantity) && !isNaN(price)) {
                const sale = {
                    productName,
                    quantity,
                    totalPrice: price * quantity,
                    profit: price * quantity * 0.2, // 仮の利益計算（20%の利益）
                    date: new Date().toISOString().split('T')[0]
                };
                saveSaleToDB(sale);
            } else {
                alert("正しい値を入力してください");
            }
        });
    }

    // 全体在庫の表示と管理
    function displayGlobalInventory() {
        const transaction = db.transaction(['globalInventory'], 'readonly');
        const store = transaction.objectStore('globalInventory');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const globalInventories = event.target.result;
            console.log('Global inventory loaded:', globalInventories);
            const globalInventoryList = document.getElementById('global-inventory-list');
            if (globalInventoryList) {
                globalInventoryList.innerHTML = ''; // リストをクリア

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

    // 商品と在庫を保存する関数
    function saveProductToDB(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        store.put(product);
        console.log('Product saved:', product);
    }

    // 売上をデータベースに保存する関数
    function saveSaleToDB(sale) {
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.put(sale);
        console.log('Sale saved:', sale);
        displaySales();
    }

    // 売上の表示
    function displaySales() {
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const sales = event.target.result;
            console.log('Sales loaded:', sales);
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
                    const newQuantity = prompt('新しい数量を入力してください:', sale.quantity);
                    if (newQuantity !== null) {
                        sale.quantity = parseInt(newQuantity, 10);
                        sale.totalPrice = sale.quantity * (sale.totalPrice / sale.quantity);
                        saveSaleToDB(sale);
                    }
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
});
