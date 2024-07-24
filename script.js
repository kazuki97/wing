document.addEventListener('DOMContentLoaded', () => {
    const categories = {};
    const inventoryData = [];
    let db;

    // IndexedDBの初期化
    function initDB() {
        const request = indexedDB.open('InventoryDB', 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('categories')) {
                const categoryStore = db.createObjectStore('categories', { keyPath: 'name' });
                categoryStore.createIndex('name', 'name', { unique: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            loadCategoriesFromDB();
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
        };
    }

    function loadCategoriesFromDB() {
        const transaction = db.transaction(['categories'], 'readonly');
        const categoryStore = transaction.objectStore('categories');
        const request = categoryStore.getAll();

        request.onsuccess = (event) => {
            const storedCategories = event.target.result;
            storedCategories.forEach(category => {
                categories[category.name] = category.products;
            });
            displayCategories();
            updateChart();
        };

        request.onerror = (event) => {
            console.error('Failed to load categories:', event.target.errorCode);
        };
    }

    function saveCategoryToDB(categoryName, products) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const categoryStore = transaction.objectStore('categories');
        const category = { name: categoryName, products: products };
        categoryStore.put(category);
    }

    // カテゴリの追加
    document.getElementById('add-category').addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value;
        if (categoryName && !categories[categoryName]) {
            categories[categoryName] = [];
            saveCategoryToDB(categoryName, []);
            displayCategories();
            updateCategorySelect();
        }
    });

    function displayCategories() {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';
        for (const category in categories) {
            const li = document.createElement('li');
            li.textContent = category;
            categoryList.appendChild(li);
        }
    }

    function updateCategorySelect() {
        const categorySelect = document.getElementById('category-select');
        categorySelect.innerHTML = '';
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        }
    }

    // 商品の追加
    document.getElementById('add-product').addEventListener('click', () => {
        const categorySelect = document.getElementById('category-select');
        const categoryName = categorySelect.value;
        const productName = document.getElementById('product-name').value;
        const productQuantity = document.getElementById('product-quantity').value;

        if (categoryName && productName && productQuantity) {
            const product = { name: productName, quantity: parseInt(productQuantity, 10), history: [] };
            categories[categoryName].push(product);
            saveCategoryToDB(categoryName, categories[categoryName]);
            displayProducts(categoryName);
        }
    });

    function displayProducts(categoryName) {
        const productList = document.getElementById('product-list');
        productList.innerHTML = '';
        if (categories[categoryName]) {
            categories[categoryName].forEach(product => {
                const li = document.createElement('li');
                li.textContent = `${product.name} - ${product.quantity}`;
                productList.appendChild(li);
            });
        }
    }

    // 在庫管理
    document.getElementById('search-inventory').addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value;
        displayInventory(searchCategory);
    });

    function displayInventory(categoryName) {
        const inventoryTable = document.getElementById('inventory-table').getElementsByTagName('tbody')[0];
        inventoryTable.innerHTML = '';
        if (categories[categoryName]) {
            categories[categoryName].forEach(product => {
                const row = inventoryTable.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;
                const editCell = row.insertCell(2);
                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.addEventListener('click', () => {
                    // 編集機能を実装
                });
                editCell.appendChild(editButton);
                const detailCell = row.insertCell(3);
                const detailButton = document.createElement('button');
                detailButton.textContent = '詳細';
                detailButton.addEventListener('click', () => {
                    // 詳細表示機能を実装
                });
                detailCell.appendChild(detailButton);
            });
        }
    }

    // バーコードスキャン
    const codeReader = new ZXing.BrowserBarcodeReader();
    const startScanButton = document.getElementById('start-scan');
    const barcodeVideo = document.getElementById('barcode-video');

    startScanButton.addEventListener('click', () => {
        barcodeVideo.style.display = 'block';
        codeReader.decodeFromVideoDevice(null, 'barcode-video', (result, err) => {
            if (result) {
                alert(`Barcode detected: ${result.text}`);
                const product = findProductByBarcode(result.text);
                if (product) {
                    const newQuantity = parseInt(product.quantity, 10) - 1;
                    if (newQuantity >= 0) {
                        const timestamp = new Date().toLocaleString();
                        product.quantity = newQuantity;
                        product.history.push({ timestamp, action: 'Barcode scan', quantity: newQuantity });
                        saveCategoryToDB(categoryName, categories[categoryName]);
                        updateChart();
                    } else {
                        alert('在庫が不足しています。');
                    }
                } else {
                    alert('該当する商品が見つかりません。');
                }
                barcodeVideo.style.display = 'none';
                codeReader.reset();
            }
        });
    });

    function findProductByBarcode(barcode) {
        for (const category in categories) {
            const product = categories[category].find(product => product.name === barcode);
            if (product) {
                return product;
            }
        }
        return null;
    }

    // グラフの更新
    function updateChart() {
        const ctx = document.getElementById('inventory-chart').getContext('2d');
        const labels = [];
        const data = [];
        for (const category in categories) {
            categories[category].forEach(product => {
                labels.push(product.name);
                data.push(product.quantity);
            });
        }
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '在庫数',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initDB();
    displayCategories();
    updateCategorySelect();
});
