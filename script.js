document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let lastScannedCode = null;
    let lastScannedTime = 0;

    const request = indexedDB.open('inventoryDB', 3);

    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadCategories();
        loadSales();
        populateYearAndMonthSelect();  // 年と月のセレクトボックスを初期化
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('products')) {
            const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
            productStore.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('sales')) {
            db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        }
    };

    const manualAddSalesButton = document.getElementById('manualAddSalesButton');
    const addCategoryButton = document.getElementById('add-category');
    const categorySelect = document.getElementById('category-select');
    const addProductButton = document.getElementById('add-product');
    const detailModal = document.getElementById('detail-modal');
    const closeModal = document.querySelector('.close');

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
        detailModal.style.display = 'none';
    });

    manualAddSalesButton.addEventListener('click', () => {
        const salesCategoryContainer = document.getElementById('salesCategoryContainer');
        const salesProductContainer = document.getElementById('salesProductContainer');

        if (salesCategoryContainer) {
            salesCategoryContainer.innerHTML = '';
            salesCategoryContainer.style.display = 'flex';
            salesCategoryContainer.style.flexWrap = 'wrap';
            salesCategoryContainer.style.gap = '10px';

            for (const categoryName in categories) {
                const categoryButton = document.createElement('button');
                categoryButton.textContent = categoryName;
                categoryButton.className = 'inventory-category-button';
                categoryButton.addEventListener('click', () => {
                    displaySalesProducts(categoryName);
                });
                salesCategoryContainer.appendChild(categoryButton);
            }
        } else {
            console.error('salesCategoryContainer が見つかりませんでした。');
        }
    });

    function displaySalesProducts(categoryName) {
        const salesProductContainer = document.getElementById('salesProductContainer');
        if (salesProductContainer) {
            salesProductContainer.innerHTML = '';
            const transaction = db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('category');
            const request = index.getAll(categoryName);

            request.onsuccess = (event) => {
                const products = event.target.result;

                products.forEach(product => {
                    const productButton = document.createElement('button');
                    productButton.textContent = `${product.name} - ${product.price}円`;
                    productButton.addEventListener('click', () => {
                        const quantity = prompt('売上数量を入力してください:');
                        const saleDate = prompt('日付を入力してください (YYYY-MM-DD):');
                        if (quantity && saleDate) {
                            const sale = {
                                productName: product.name,
                                quantity: parseInt(quantity, 10),
                                totalPrice: product.price * quantity,
                                profit: (product.price - product.cost) * quantity,
                                date: saleDate
                            };
                            saveSaleToDB(sale);
                            displaySales();
                        }
                    });
                    salesProductContainer.appendChild(productButton);
                });
            };
        } else {
            console.error('salesProductContainer が見つかりませんでした。');
        }
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
            editButton.innerHTML = '✏️';
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
            deleteButton.innerHTML = '🗑️';
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
                editButton.innerHTML = '✏️';
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
                deleteButton.innerHTML = '🗑️';
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
                    <button class="edit-button">✏️</button>
                    <button class="delete-button">🗑️</button>
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
                editButton.innerHTML = '✏️';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    row.contentEditable = true;
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
                                    row.contentEditable = false;
                                    row.classList.remove('editable');
                                    if (cellIndex === 2) {
                                        sale.productName = newValue;
                                    } else if (cellIndex === 3) {
                                        sale.quantity = parseInt(newValue, 10);
                                        sale.totalPrice = sale.quantity * (sale.totalPrice / sale.quantity);
                                    } else if (cellIndex === 4) {
                                        sale.totalPrice = parseFloat(newValue);
                                    } else if (cellIndex === 5) {
                                        sale.profit = parseFloat(newValue);
                                    } else if (cellIndex === 1) {
                                        sale.date = newValue;
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
                deleteButton.innerHTML = '🗑️';
                deleteButton.className = 'product-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この売上を削除しますか？')) {
                        const transaction = db.transaction(['sales'], 'readwrite');
                        const store = transaction.objectStore('sales');
                        store.delete(sale.id);
                        const inventoryTransaction = db.transaction(['products'], 'readwrite');
                        const inventoryStore = inventoryTransaction.objectStore('products');
                        const productRequest = inventoryStore.get(sale.productId);

                        productRequest.onsuccess = (event) => {
                            const product = event.target.result;
                            product.quantity += sale.quantity;
                            inventoryStore.put(product);
                            displaySales();
                            displayInventoryProducts(product.category);
                        };
                    }
                });
                row.insertCell(7).appendChild(deleteButton);
            });
        };
    }

    // 年と月のセレクトボックスを初期化する関数
    function populateYearAndMonthSelect() {
        const yearSelect = document.getElementById('year-select');
        const monthSelect = document.getElementById('month-select');

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = ''; // 初期化
        monthSelect.innerHTML = ''; // 初期化

        // 過去5年分の年を追加
        for (let i = 0; i < 5; i++) {
            const yearOption = document.createElement('option');
            yearOption.value = currentYear - i;
            yearOption.textContent = currentYear - i;
            yearSelect.appendChild(yearOption);
        }

        // 1月から12月までの月を追加
        for (let i = 1; i <= 12; i++) {
            const monthOption = document.createElement('option');
            monthOption.value = i;
            monthOption.textContent = i;
            monthSelect.appendChild(monthOption);
        }
    }

    // バーコードスキャン機能
    const startScanButton = document.getElementById('start-scan');
    const scannerContainer = document.getElementById('scanner-container');

    startScanButton.addEventListener('click', () => {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerContainer,
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment"
                },
            },
            decoder: {
                readers: ["ean_reader"]
            },
            locate: true
        }, (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("Initialization finished. Ready to start");
            Quagga.start();
        });

        Quagga.onProcessed((result) => {
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, drawingCanvas.getAttribute("width"), drawingCanvas.getAttribute("height"));
                    result.boxes.filter(box => box !== result.box).forEach(box => {
                        Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                    });
                }

                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 2 });
                }

                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
                }
            }
        });

        Quagga.onDetected((data) => {
            const barcode = data.codeResult.code;
            const currentTime = new Date().getTime();

            if (barcode === lastScannedCode && (currentTime - lastScannedTime) < 1000) {
                if (confirm(`同じ商品（バーコード: ${barcode}）がスキャンされましたがよろしいですか？`)) {
                    processScannedCode(barcode);
                }
                return;
            }

            lastScannedCode = barcode;
            lastScannedTime = currentTime;

            console.log(`Barcode detected: ${barcode}`);
            processScannedCode(barcode);
        });
    });

    function processScannedCode(barcode) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.barcode === barcode) {
                    const product = cursor.value;
                    if (product.quantity > 0) {
                        product.quantity -= 1;
                        store.put(product);

                        const sale = {
                            productName: product.name,
                            quantity: 1,
                            totalPrice: product.price,
                            profit: product.price - product.cost,
                            date: new Date().toISOString().split('T')[0]
                        };
                        saveSaleToDB(sale);

                        alert(`商品名: ${product.name} の在庫が1減少しました。現在の在庫数: ${product.quantity}`);
                        displayInventoryProducts(product.category);
                    } else {
                        alert(`商品名: ${product.name} は在庫がありません。`);
                    }
                }
                cursor.continue();
            } else {
                console.log('No more entries!');
            }
        };

        request.onerror = (event) => {
            console.error('Cursor error:', event.target.error);
        };
    }
});
