document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;
    let lastScannedCode = null;
    let lastScannedTime = 0;

    const request = indexedDB.open('inventoryDB', 2);

    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadCategories();
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
    };

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

    const linkHome = document.getElementById('link-home');
    const linkCategory = document.getElementById('link-category');
    const linkProduct = document.getElementById('link-product');
    const linkInventory = document.getElementById('link-inventory');
    const linkBarcode = document.getElementById('link-barcode');

    function showSection(section) {
        homeSection.style.display = 'none';
        categorySection.style.display = 'none';
        productSection.style.display = 'none';
        inventorySection.style.display = 'none';
        barcodeSection.style.display = 'none';
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
        const barcode = document.getElementById('product-barcode').value;

        if (category && productName && quantity && barcode) {
            const product = { category, name: productName, quantity: parseInt(quantity, 10), barcode };
            saveProductToDB(product);
            displayProducts(category);
            document.getElementById('product-name').value = '';
            document.getElementById('product-quantity').value = '';
            document.getElementById('product-barcode').value = '';
        } else {
            alert('すべてのフィールドを入力してください。');
        }
    });

    closeModal.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

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
                row.insertCell(2).textContent = product.barcode;

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
                row.insertCell(3).appendChild(editButton);

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
                row.insertCell(4).appendChild(deleteButton);

                const detailButton = document.createElement('button');
                detailButton.textContent = '詳細';
                detailButton.className = 'product-button';
                detailButton.addEventListener('click', () => {
                    document.getElementById('detail-title').textContent = product.name;
                    document.getElementById('detail-body').textContent = `カテゴリ: ${product.category}\n数量: ${product.quantity}\nバーコード: ${product.barcode}`;
                    detailModal.style.display = 'block';
                });
                row.insertCell(5).appendChild(detailButton);
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
            const inventoryProductTableBody = document.getElementById('inventory-product-table').getElementsByTagName('tbody')[0];
            inventoryProductTableBody.innerHTML = '';

            products.forEach(product => {
                const row = inventoryProductTableBody.insertRow();
                row.insertCell(0).textContent = product.name;
                row.insertCell(1).textContent = product.quantity;
                row.insertCell(2).textContent = product.barcode;

                const editButton = document.createElement('button');
                editButton.textContent = '編集';
                editButton.className = 'product-button';
                editButton.addEventListener('click', () => {
                    const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                    if (newQuantity !== null) {
                        product.quantity = parseInt(newQuantity, 10);
                        saveProductToDB(product);
                        displayInventoryProducts(category);
                    }
                });
                row.insertCell(3).appendChild(editButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '削除';
                deleteButton.className = 'product-button';
                deleteButton.addEventListener('click', () => {
                    if (confirm('この商品を削除しますか？')) {
                        const transaction = db.transaction(['products'], 'readwrite');
                        const store = transaction.objectStore('products');
                        store.delete(product.id);
                        displayInventoryProducts(category);
                    }
                });
                row.insertCell(4).appendChild(deleteButton);
            });
        };
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
                readers: ["ean_reader"] // EANバーコードリーダーを使用
            },
            locate: true // バーコードの位置を特定
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

    // 警告メッセージをフィルタリングするスクリプトを追加
    (function() {
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;

        console.warn = function(...args) {
            if (args.length > 0 && typeof args[0] === 'string') {
                if (args[0].includes('link preload but not used within a few seconds') ||
                    args[0].includes('request credentials mode does not match') ||
                    args[0].includes('404 (Not Found)')) {
                    // 特定の警告メッセージを無視する
                    return;
                }
            }
            // 他の警告メッセージは通常通り表示する
            originalConsoleWarn.apply(console, args);
        };

        console.error = function(...args) {
            if (args.length > 0 && typeof args[0] === 'string') {
                if (args[0].includes('link preload but not used within a few seconds') ||
                    args[0].includes('request credentials mode does not match') ||
                    args[0].includes('404 (Not Found)')) {
                    // 特定のエラーメッセージを無視する
                    return;
                }
            }
            // 他のエラーメッセージは通常通り表示する
            originalConsoleError.apply(console, args);
        };
    })();
});
