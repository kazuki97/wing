document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;

    console.log('DOM fully loaded and parsed');  // DOMの読み込み完了

    const request = indexedDB.open('inventoryDB', 1);

    request.onerror = (event) => {
        console.error('Database error:', event.target.error);  // データベースエラー
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database initialized', db);  // データベースの初期化完了
        loadCategories();  // データベースが初期化された後に呼び出す
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'name' });
        }
        console.log('Database upgrade needed', db);  // データベースのアップグレード
    };

    function saveCategoryToDB(category) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        store.put(category);
    }

    function saveCategories() {
        for (const category in categories) {
            saveCategoryToDB({
                name: category,
                products: categories[category]
            });
        }
    }

    function loadCategories() {
        if (!db) {
            console.error('Database is not initialized');  // データベースが初期化されていない
            return;
        }

        console.log('Loading categories');  // カテゴリの読み込み開始

        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const results = event.target.result;
            categories = {};
            results.forEach(category => {
                categories[category.name] = category.products;
            });
            updateCategorySelect();
            displayCategories();
            console.log('Categories loaded', categories);  // カテゴリの読み込み完了
        };

        request.onerror = (event) => {
            console.error('Error loading categories:', event.target.error);  // カテゴリの読み込みエラー
        };
    }

    const addCategoryButton = document.getElementById('add-category');
    const addProductButton = document.getElementById('add-product');
    const searchProductButton = document.getElementById('search-product');
    const categorySelect = document.getElementById('category-select');
    const detailModal = document.getElementById('detail-modal');
    const detailTitle = document.getElementById('detail-title');
    const detailBody = document.getElementById('detail-body');
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

    const inventoryChart = new Chart(document.getElementById('inventoryChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '在庫数',
                data: [],
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
        updateChart();
    });

    linkCategory.addEventListener('click', () => {
        showSection(categorySection);
    });

    linkProduct.addEventListener('click', () => {
        showSection(productSection);
    });

    linkInventory.addEventListener('click', () => {
        showSection(inventorySection);
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
        const categoryName = categorySelect.value;
        const productName = document.getElementById('product-name').value;
        const productQuantity = document.getElementById('product-quantity').value;

        if (categoryName && productName && productQuantity) {
            if (categories[categoryName]) {
                const timestamp = new Date().toLocaleString();
                const product = { 
                    name: productName, 
                    quantity: productQuantity, 
                    history: [`${timestamp}: ${productQuantity}個追加`] 
                };
                categories[categoryName].push(product);
                saveCategoryToDB({
                    name: categoryName,
                    products: categories[categoryName]
                });
                displayCategories();
                document.getElementById('product-name').value = '';
                document.getElementById('product-quantity').value = '';
            }
        } else {
            alert('カテゴリ名、商品名、数量を入力してください。');
        }
    });

    searchProductButton.addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value;
        if (searchCategory && categories[searchCategory]) {
            displayCategories(searchCategory);
        } else {
            alert('カテゴリ名を入力してください。またはカテゴリが存在しません。');
        }
    });

    closeModal.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

    function updateCategorySelect() {
        categorySelect.innerHTML = '';
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        }
    }

    function displayCategories(searchCategory = null) {
        const categoryDiv = document.getElementById('category-list');
        categoryDiv.innerHTML = '';
        for (const category in categories) {
            if (searchCategory && category !== searchCategory) continue;
            const categoryDivElement = document.createElement('div');
            categoryDivElement.className = 'category';
            categoryDivElement.textContent = category;

            const productTable = document.createElement('table');
            productTable.className = 'product-table';

            const tableHeader = document.createElement('tr');
            tableHeader.innerHTML = `
                <th>商品名</th>
                <th>数量</th>
                <th>編集</th>
                <th>詳細</th>
            `;
            productTable.appendChild(tableHeader);

            const tableBody = document.createElement('tbody');
            categories[category].forEach((product, index) => {
                const productRow = document.createElement('tr');
                productRow.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td><button class="edit-button" data-category="${category}" data-index="${index}">編集</button></td>
                    <td><button class="detail-button" data-category="${category}" data-index="${index}">詳細</button></td>
                `;

                productRow.querySelector('.edit-button').addEventListener('click', (e) => {
                    const category = e.target.dataset.category;
                    const index = e.target.dataset.index;
                    const newQuantity = prompt('新しい数量を入力してください:', categories[category][index].quantity);
                    if (newQuantity !== null) {
                        categories[category][index].quantity = newQuantity;
                        const timestamp = new Date().toLocaleString();
                        categories[category][index].history.push(`${timestamp}: 数量を${newQuantity}に変更`);
                        saveCategoryToDB({
                            name: category,
                            products: categories[category]
                        });
                        displayCategories();
                    }
                });

                productRow.querySelector('.detail-button').addEventListener('click', (e) => {
                    const category = e.target.dataset.category;
                    const index = e.target.dataset.index;
                    const product = categories[category][index];
                    detailTitle.textContent = `${product.name}の詳細`;
                    detailBody.innerHTML = product.history.map(entry => `<p>${entry}</p>`).join('');
                    detailModal.style.display = 'block';
                });

                tableBody.appendChild(productRow);
            });

            productTable.appendChild(tableBody);
            categoryDiv.appendChild(categoryDivElement);
            categoryDiv.appendChild(productTable);
        }
    }

    function updateChart() {
        const labels = [];
        const data = [];
        for (const category in categories) {
            categories[category].forEach(product => {
                labels.push(product.name);
                data.push(product.quantity);
            });
        }
        inventoryChart.data.labels = labels;
        inventoryChart.data.datasets[0].data = data;
        inventoryChart.update();
    }

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
                        product.history.push(`${timestamp}: バーコードスキャンで1個減少`);
                        saveCategoryToDB({
                            name: product.category,
                            products: categories[product.category]
                        });
                        displayCategories();
                        updateChart();
                    } else {
                        alert('在庫が不足しています。');
                    }
                } else {
                    alert('該当する商品が見つかりません。');
                }
                barcodeVideo.style.display = 'none';
                codeReader.reset();
            } else if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                alert(`Error: ${err}`);
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
});
