document.addEventListener('DOMContentLoaded', () => {
    function displayCategories(searchCategory = null) {
        const categoryDiv = document.getElementById('category-list');
        categoryDiv.innerHTML = '';
        for (const category in categories) {
            const categoryRow = document.createElement('div');
            categoryRow.innerHTML = `<h3>${category}</h3>`;
            const productTable = document.createElement('table');
            const tableHead = document.createElement('thead');
            tableHead.innerHTML = `
                <tr>
                    <th>商品名</th>
                    <th>数量</th>
                    <th>編集</th>
                    <th>詳細</th>
                </tr>`;
            const tableBody = document.createElement('tbody');
            categories[category].forEach(product => {
                const productRow = document.createElement('tr');
                productRow.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td><button onclick="editProduct('${category}', '${product.name}')">編集</button></td>
                    <td><button onclick="showProductDetails('${category}', '${product.name}')">詳細</button></td>
                `;
                tableBody.appendChild(productRow);
            });
            productTable.appendChild(tableHead);
            productTable.appendChild(tableBody);
            categoryRow.appendChild(productTable);
            categoryDiv.appendChild(categoryRow);
        }
    }

    function updateChart() {
        const labels = inventoryData.map(item => item.name);
        const data = inventoryData.map(item => item.quantity);
        inventoryChart.data.labels = labels;
        inventoryChart.data.datasets[0].data = data;
        inventoryChart.update();
    }

    // IndexedDBの初期化
    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
    } else {
        const request = window.indexedDB.open("inventoryDatabase", 1);
        request.onerror = function(event) {
            console.log("Error:", event.target.errorCode);
        };
        request.onsuccess = function(event) {
            db = event.target.result;
            loadFromIndexedDB();
        };
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            const objectStore = db.createObjectStore("categories", { keyPath: "name" });
            objectStore.createIndex("name", "name", { unique: true });
        };
    }

    function saveToIndexedDB() {
        const transaction = db.transaction(["categories"], "readwrite");
        const objectStore = transaction.objectStore("categories");
        for (const category in categories) {
            const request = objectStore.put({ name: category, products: categories[category] });
            request.onerror = function(event) {
                console.log("Error:", event.target.errorCode);
            };
            request.onsuccess = function(event) {
                console.log("Category saved:", category);
            };
        }
    }

    function loadFromIndexedDB() {
        const transaction = db.transaction(["categories"]);
        const objectStore = transaction.objectStore("categories");
        objectStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                categories[cursor.key] = cursor.value.products;
                cursor.continue();
            } else {
                displayCategories();
                updateChart();
            }
        };
    }

    const categories = {};
    const inventoryData = [];
    let db;

    document.getElementById('add-category').addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value;
        if (categoryName && !categories[categoryName]) {
            categories[categoryName] = [];
            document.getElementById('category-select').innerHTML += `<option value="${categoryName}">${categoryName}</option>`;
            saveToIndexedDB();
        }
    });

    document.getElementById('add-product').addEventListener('click', () => {
        const category = document.getElementById('category-select').value;
        const productName = document.getElementById('product-name').value;
        const productQuantity = parseInt(document.getElementById('product-quantity').value);
        if (category && productName && productQuantity) {
            const product = { name: productName, quantity: productQuantity, history: [] };
            categories[category].push(product);
            saveToIndexedDB();
        }
    });

    document.getElementById('search-category-button').addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value;
        displayCategories(searchCategory);
    });

    // グラフの初期化
    const ctx = document.getElementById('inventory-chart').getContext('2d');
    const inventoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '在庫数',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
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

    // バーコードスキャン機能
    const codeReader = new ZXing.BrowserBarcodeReader();
    const startScanButton = document.getElementById('start-scan');
    const barcodeInput = document.getElementById('barcode-input');
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
                        product.history.push(`${timestamp}: バーコードスキャンで減少`);
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
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
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
});
