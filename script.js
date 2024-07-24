document.addEventListener('DOMContentLoaded', () => {
    const categories = {};
    const dbName = "inventoryDB";
    const storeName = "categories";

    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        return;
    }

    function initDB() {
        const request = indexedDB.open(dbName, 1);

        request.onerror = function(event) {
            console.error("Database error: " + event.target.errorCode);
        };

        request.onsuccess = function(event) {
            console.log("Database opened successfully");
            const db = event.target.result;
            loadCategoriesFromDB(db);
        };

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "name" });
            }
        };
    }

    function saveCategoryToDB(categoryName, categoryData) {
        const request = indexedDB.open(dbName, 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            objectStore.put({ name: categoryName, products: categoryData });
        };
    }

    function loadCategoriesFromDB(db) {
        const transaction = db.transaction([storeName]);
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            const data = event.target.result;
            data.forEach(category => {
                categories[category.name] = category.products;
            });
            displayCategories();
            updateCategorySelect();
        };
    }

    function displayCategories(searchCategory = null) {
        const categoryDiv = document.getElementById('category-list');
        categoryDiv.innerHTML = '';

        for (const category in categories) {
            if (!searchCategory || category.includes(searchCategory)) {
                const categoryElem = document.createElement('div');
                categoryElem.classList.add('category');
                categoryElem.textContent = category;
                categoryDiv.appendChild(categoryElem);

                const productTable = document.createElement('table');
                const headerRow = productTable.insertRow();
                headerRow.innerHTML = '<th>商品名</th><th>数量</th><th>編集</th><th>詳細</th>';

                categories[category].forEach(product => {
                    const row = productTable.insertRow();
                    row.innerHTML = `<td>${product.name}</td><td>${product.quantity}</td><td><button>編集</button></td><td><button>詳細</button></td>`;
                });

                categoryDiv.appendChild(productTable);
            }
        }
    }

    function updateCategorySelect() {
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '';
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        }
    }

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

    function findProductByBarcode(barcode) {
        for (const category in categories) {
            const product = categories[category].find(product => product.name === barcode);
            if (product) {
                return product;
            }
        }
        return null;
    }

    const codeReader = new ZXing.BrowserBarcodeReader();
    const startScanButton = document.getElementById('start-scan');
    const barcodeInput = document.getElementById('barcode-input');
    const barcodeVideo = document.getElementById('barcode-video');

    startScanButton.addEventListener('click', () => {
        barcodeVideo.style.display = 'block';
        codeReader.decodeFromVideoDevice(null, 'barcode-video', (result, err) => {
            if (result) {
                alert('Barcode detected: ' + result.text);
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

    document.getElementById('add-category-button').addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value.trim();
        if (categoryName && !categories[categoryName]) {
            categories[categoryName] = [];
            saveCategoryToDB(categoryName, categories[categoryName]);
            displayCategories();
            updateCategorySelect();
        }
    });

    document.getElementById('add-product-button').addEventListener('click', () => {
        const categorySelect = document.getElementById('product-category');
        const categoryName = categorySelect.value;
        const productName = document.getElementById('product-name').value.trim();
        const productQuantity = parseInt(document.getElementById('product-quantity').value, 10);

        if (categoryName && productName && !isNaN(productQuantity)) {
            const product = { name: productName, quantity: productQuantity, history: [] };
            categories[categoryName].push(product);
            saveCategoryToDB(categoryName, categories[categoryName]);
            displayCategories();
            updateCategorySelect();
        }
    });

    document.getElementById('search-category-button').addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value.trim();
        displayCategories(searchCategory);
    });

    initDB();
    displayCategories();
    updateCategorySelect();
});
