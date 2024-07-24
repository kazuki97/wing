document.addEventListener('DOMContentLoaded', () => {
    const categoryListElement = document.getElementById('category-list');
    const inventoryChartElement = document.getElementById('inventory-chart');
    let db;

    function initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('inventoryDB', 1);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                productStore.createIndex('category', 'category', { unique: false });
                productStore.createIndex('barcode', 'barcode', { unique: true });
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error('Database error:', event.target.errorCode);
                reject(event);
            };
        });
    }

    function addProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.add(product);

            request.onsuccess = () => {
                loadCategories();
                resolve();
            };

            request.onerror = (event) => {
                console.error('Error adding product:', event);
                reject(event);
            };
        });
    }

    function loadCategories() {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const categories = {};

        index.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const product = cursor.value;
                if (!categories[product.category]) {
                    categories[product.category] = [];
                }
                categories[product.category].push(product);
                cursor.continue();
            } else {
                displayCategories(categories);
            }
        };
    }

    function displayCategories(categories) {
        categoryListElement.innerHTML = '';
        Object.keys(categories).forEach((category) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.innerHTML = `<h3>${category}</h3>`;
            categories[category].forEach((product) => {
                const productRow = document.createElement('div');
                productRow.innerHTML = `
                    <span>${product.name}</span>
                    <span>${product.quantity}</span>
                    <button onclick="editProduct(${product.id})">編集</button>
                    <button onclick="showDetails(${product.id})">詳細</button>
                `;
                categoryDiv.appendChild(productRow);
            });
            categoryListElement.appendChild(categoryDiv);
        });
    }

    function updateChart() {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const inventoryData = {};

        store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const product = cursor.value;
                if (!inventoryData[product.name]) {
                    inventoryData[product.name] = 0;
                }
                inventoryData[product.name] += product.quantity;
                cursor.continue();
            } else {
                const labels = Object.keys(inventoryData);
                const data = Object.values(inventoryData);
                const chartData = {
                    labels: labels,
                    datasets: [{
                        label: '在庫数',
                        data: data
                    }]
                };
                const ctx = inventoryChartElement.getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: chartData
                });
            }
        };
    }

    function findProductByBarcode(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('barcode');
            const request = index.get(barcode);

            request.onsuccess = function(event) {
                resolve(request.result ? request.result : null);
            };

            request.onerror = function(event) {
                console.log('Error finding product by barcode:', event);
                reject(null);
            };
        });
    }

    function updateProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.put(product);

            request.onsuccess = function(event) {
                loadCategories();
                resolve();
            };

            request.onerror = function(event) {
                console.log('Error updating product:', event);
                reject(event);
            };
        });
    }

    // バーコードスキャン機能の実装
    const codeReader = new ZXing.BrowserBarcodeReader();
    const startScanButton = document.getElementById('start-scan');
    const barcodeInput = document.getElementById('barcode-input');
    const barcodeVideo = document.getElementById('barcode-video');

    startScanButton.addEventListener('click', async () => {
        barcodeVideo.style.display = 'block';
        codeReader.decodeFromVideoDevice(null, 'barcode-video', async (result, err) => {
            if (result) {
                alert(`Barcode detected: ${result.text}`);
                try {
                    const product = await findProductByBarcode(result.text);
                    if (product) {
                        const newQuantity = parseInt(product.quantity, 10) - 1;
                        if (newQuantity >= 0) {
                            const timestamp = new Date().toLocaleString();
                            product.quantity = newQuantity;
                            product.history.push(`${timestamp}: バーコードスキャンで数量が減少しました`);
                            await updateProduct(product);
                        } else {
                            alert('在庫が不足しています');
                        }
                    } else {
                        alert('該当する商品が見つかりません');
                    }
                } catch (error) {
                    console.error('Error handling barcode scan:', error);
                }
                barcodeVideo.style.display = 'none';
                codeReader.reset();
            }
        });
    });

    // データベースの初期化とカテゴリの読み込み
    initDatabase().then(() => {
        loadCategories();
        updateChart();
    }).catch((error) => {
        console.error('Error initializing database:', error);
    });
});
