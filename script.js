document.addEventListener('DOMContentLoaded', () => {
    const addCategoryButton = document.getElementById('add-category');
    const addProductButton = document.getElementById('add-product');
    const searchButton = document.getElementById('search-product');
    const startScanButton = document.getElementById('start-scan');

    let db;

    // IndexedDBの初期化
    const request = indexedDB.open('inventoryDB', 1);

    request.onerror = function(event) {
        console.log('Database error: ' + event.target.errorCode);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database opened successfully');
        displayCategories();
        updateChart();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const categoryStore = db.createObjectStore('categories', { keyPath: 'name' });
        categoryStore.createIndex('name', 'name', { unique: true });

        const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        productStore.createIndex('name', 'name', { unique: false });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('barcode', 'barcode', { unique: false });

        console.log('Object stores created');
    };

    addCategoryButton.addEventListener('click', () => {
        const categoryInput = document.getElementById('category-input');
        const category = categoryInput.value;

        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.add({ name: category });

        request.onsuccess = function(event) {
            console.log('Category added to the database');
            displayCategories();
        };

        request.onerror = function(event) {
            console.log('Error adding category: ' + event.target.errorCode);
        };
    });

    addProductButton.addEventListener('click', () => {
        const categorySelect = document.getElementById('category-select');
        const productNameInput = document.getElementById('product-name-input');
        const productQuantityInput = document.getElementById('product-quantity-input');

        const category = categorySelect.value;
        const productName = productNameInput.value;
        const quantity = parseInt(productQuantityInput.value);

        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.add({
            category: category,
            name: productName,
            quantity: quantity,
            barcode: null,
            history: []
        });

        request.onsuccess = function(event) {
            console.log('Product added to the database');
            displayCategories();
        };

        request.onerror = function(event) {
            console.log('Error adding product: ' + event.target.errorCode);
        };
    });

    searchButton.addEventListener('click', () => {
        const categoryInput = document.getElementById('search-category-input');
        const category = categoryInput.value;

        displayCategories(category);
    });

    startScanButton.addEventListener('click', () => {
        const codeReader = new ZXing.BrowserBarcodeReader();
        codeReader.decodeFromVideoDevice(null, 'barcode-video', (result, err) => {
            if (result) {
                alert('Barcode detected: ' + result.text);
                const product = findProductByBarcode(result.text);
                if (product) {
                    const newQuantity = parseInt(product.quantity, 10) - 1;
                    if (newQuantity >= 0) {
                        const timestamp = new Date().toLocaleString();
                        product.quantity = newQuantity;
                        product.history.push(`${timestamp}: バーコードスキャンにより在庫を1減らしました`);
                        updateProduct(product);
                        displayCategories();
                        updateChart();
                    } else {
                        alert('在庫が不足しています');
                    }
                } else {
                    alert('該当する商品が見つかりません');
                }
                barcodeVideo.style.display = 'none';
                codeReader.reset();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
            }
        });
        document.getElementById('barcode-video').style.display = 'block';
    });

    function displayCategories(searchCategory = null) {
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';

        const transaction = db.transaction(['categories', 'products']);
        const categoryStore = transaction.objectStore('categories');
        const productStore = transaction.objectStore('products');

        categoryStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const category = cursor.value.name;

                if (!searchCategory || searchCategory === category) {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.classList.add('category');

                    const categoryTitle = document.createElement('h3');
                    categoryTitle.textContent = category;
                    categoryDiv.appendChild(categoryTitle);

                    const productTable = document.createElement('table');
                    const tableHeader = document.createElement('tr');
                    ['商品名', '数量', '編集', '詳細'].forEach(text => {
                        const th = document.createElement('th');
                        th.textContent = text;
                        tableHeader.appendChild(th);
                    });
                    productTable.appendChild(tableHeader);

                    productStore.index('category').openCursor(IDBKeyRange.only(category)).onsuccess = function(event) {
                        const productCursor = event.target.result;
                        if (productCursor) {
                            const product = productCursor.value;

                            const productRow = document.createElement('tr');
                            ['name', 'quantity'].forEach(key => {
                                const td = document.createElement('td');
                                td.textContent = product[key];
                                productRow.appendChild(td);
                            });

                            const editButton = document.createElement('button');
                            editButton.textContent = '編集';
                            editButton.addEventListener('click', () => {
                                const newQuantity = prompt('新しい在庫数を入力してください', product.quantity);
                                if (newQuantity !== null) {
                                    product.quantity = parseInt(newQuantity, 10);
                                    updateProduct(product);
                                    displayCategories();
                                    updateChart();
                                }
                            });

                            const editCell = document.createElement('td');
                            editCell.appendChild(editButton);
                            productRow.appendChild(editCell);

                            const detailButton = document.createElement('button');
                            detailButton.textContent = '詳細';
                            detailButton.addEventListener('click', () => {
                                const detailModal = document.getElementById('detail-modal');
                                const detailTitle = document.getElementById('detail-title');
                                const detailBody = document.getElementById('detail-body');

                                detailTitle.textContent = `${product.name}の詳細`;
                                detailBody.innerHTML = product.history.map(entry => `<p>${entry}</p>`).join('');
                                detailModal.style.display = 'block';
                            });

                            const detailCell = document.createElement('td');
                            detailCell.appendChild(detailButton);
                            productRow.appendChild(detailCell);

                            productTable.appendChild(productRow);
                            productCursor.continue();
                        }
                    };

                    categoryDiv.appendChild(productTable);
                    categoryList.appendChild(categoryDiv);
                }
                cursor.continue();
            }
        };
    }

    function updateProduct(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.put(product);

        request.onsuccess = function(event) {
            console.log('Product updated successfully');
        };

        request.onerror = function(event) {
            console.log('Error updating product: ' + event.target.errorCode);
        };
    }

    function updateChart() {
        const chartElement = document.getElementById('inventory-chart');
        const ctx = chartElement.getContext('2d');

        const transaction = db.transaction(['products']);
        const store = transaction.objectStore('products');

        const inventoryData = [];
        store.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                inventoryData.push(cursor.value);
                cursor.continue();
            } else {
                const labels = inventoryData.map(item => item.name);
                const data = inventoryData.map(item => item.quantity);

                if (window.inventoryChart) {
                    inventoryChart.data.labels = labels;
                    inventoryChart.data.datasets[0].data = data;
                    inventoryChart.update();
                } else {
                    window.inventoryChart = new Chart(ctx, {
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
            }
        };
    }

    function findProductByBarcode(barcode) {
        const transaction = db.transaction(['products']);
        const store = transaction.objectStore('products');
        const index = store.index('barcode');
        const request = index.get(barcode);

        request.onsuccess = function(event) {
            if (request.result) {
                return request.result;
            } else {
                console.log('Product not found');
                return null;
            }
        };
    }
});
