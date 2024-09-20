document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let isScanning = false;
    let currentTransactionType = ''; // 追加: EC か 店舗かを保持

    const request = indexedDB.open('inventoryDB', 4);

    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadCategories();
        loadSales();
    };

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
        if (!db.objectStoreNames.contains('inventory')) {
            db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true }); // 全体在庫
        }
    };

    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    const addCategoryButton = document.getElementById('add-category');
    const categorySelect = document.getElementById('category-select');
    const addProductButton = document.getElementById('add-product');
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.getElementById('closeErrorModal');
    const searchButton = document.getElementById('searchButton');
    const rangeSearchButton = document.getElementById('rangeSearchButton');
    const monthFilter = document.getElementById('month-filter');
    const scannerContainer = document.getElementById('scanner-container');
    const startScanButton = document.getElementById('start-scan');

    const homeSection = document.getElementById('home-section');
    const categorySection = document.getElementById('category-section');
    const productSection = document.getElementById('product-section');
    const inventorySection = document.getElementById('inventory-section');
    const barcodeSection = document.getElementById('barcode-section');
    const salesSection = document.getElementById('sales-section');

    const linkHome = document.getElementById('link-home');
    const linkCategory = document.getElementById('link-category');
    const linkProduct = document.getElementById('link-product');
    const linkInventory = document.getElementById('link-inventory');
    const linkBarcode = document.getElementById('link-barcode');
    const linkSales = document.getElementById('link-sales');

    function showSection(section) {
        homeSection.style.display = 'none';
        categorySection.style.display = 'none';
        productSection.style.display = 'none';
        inventorySection.style.display = 'none';
        barcodeSection.style.display = 'none';
        salesSection.style.display = 'none';
        section.style.display = 'block';
    }

    linkHome.addEventListener('click', () => {
        showSection(homeSection);
    });

    linkCategory.addEventListener('click', () => {
        showSection(categorySection);
    });

    linkProduct.addEventListener('click', () => {
        showSection(productSection);
        updateCategorySelect();
    });

    linkInventory.addEventListener('click', () => {
        showSection(inventorySection);
        displayInventoryCategories();
    });

    linkBarcode.addEventListener('click', () => {
        showSection(barcodeSection);
    });

    linkSales.addEventListener('click', () => {
        showSection(salesSection);
        displaySales();
    });

    addCategoryButton.addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value;
        if (categoryName && !categories[categoryName]) {
            categories[categoryName] = [];
            saveCategoryToDB({
                name: categoryName,
                products: categories[categoryName]
            });
            updateCategorySelect();
            displayCategories();
            document.getElementById('category-name').value = '';
        } else {
            alert('カテゴリ名を入力してください。またはカテゴリが既に存在しています。');
        }
    });

    addProductButton.addEventListener('click', () => {
        const category = categorySelect.value;
        const productName = document.getElementById('product-name').value;
        const quantity = document.getElementById('product-quantity').value;
        const price = document.getElementById('product-price').value;
        const cost = document.getElementById('product-cost').value;
        const barcode = document.getElementById('product-barcode').value;

        if (category && productName && quantity && price && cost && barcode) {
            const product = { category, name: productName, quantity: parseInt(quantity, 10), price: parseFloat(price), cost: parseFloat(cost), barcode };
            saveProductToDB(product);
            displayProducts(category);
            document.getElementById('product-name').value = '';
            document.getElementById('product-quantity').value = '';
            document.getElementById('product-price').value = '';
            document.getElementById('product-cost').value = '';
            document.getElementById('product-barcode').value = '';
        } else {
            alert('すべてのフィールドを入力してください。');
        }
    });

    closeModal.addEventListener('click', () => {
        const errorModal = document.getElementById('errorModal');
        errorModal.style.display = 'none';
    });

    // ECか店舗販売かの選択
    startScanButton.addEventListener('click', () => {
        currentTransactionType = prompt('ECか店舗かを選択してください。ECの場合は「EC」、店舗販売の場合は「店舗」と入力してください。');
        if (currentTransactionType !== 'EC' && currentTransactionType !== '店舗') {
            alert('無効な選択です。もう一度選択してください。');
            return;
        }
        startBarcodeScan();
    });

    // バーコードをスキャン
    function startBarcodeScan() {
        if (isScanning) return;
        isScanning = true;

        Quagga.init({
            inputStream: {
                type: "LiveStream",
                target: scannerContainer
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
                    updateTotalInventory(product, quantity);  // 全体在庫を減らす処理を追加
                    if (currentTransactionType === 'EC') {
                        addShippingCostToDB();
                    }
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

    // 全体在庫の減算処理
    function updateTotalInventory(product, quantity) {
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');
        const request = store.get(product.category); // 全体在庫のカテゴリーで減らす

        request.onsuccess = (event) => {
            const inventory = event.target.result;
            if (inventory) {
                inventory.quantity -= parseInt(quantity, 10) * (product.name.includes('5ml') ? 5 : 10); // 5mlなら5、10mlなら10減らす
                store.put(inventory);
            }
        };
    }

    // 送料を売上に追加
    function addShippingCostToDB() {
        const sale = {
            productName: '送料',
            quantity: 1,
            totalPrice: 300,
            profit: 0,
            date: new Date().toISOString().split('T')[0]
        };

        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        store.put(sale);
        displaySales();
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
                row.innerHTML = `
                    <p>${product.name}</p>
                    <p>${product.quantity}</p>
                    <p>${product.price}</p>
                    <p>${product.barcode}</p>
                    <button class="edit-button">編集</button>
                    <button class="delete-button">削除</button>
                `;
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
