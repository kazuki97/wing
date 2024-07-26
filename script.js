document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;

    console.log('DOM fully loaded and parsed');

    const request = indexedDB.open('inventoryDB', 1);

    request.onerror = (event) => {
        console.error('Database error:', event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database initialized', db);
        loadCategories();
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('categories')) {
            db.createObjectStore('categories', { keyPath: 'name' });
        }
        console.log('Database upgrade needed', db);
    };

    function saveCategoryToDB(category) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        store.put(category);
    }

    function loadCategories() {
        if (!db) {
            console.error('Database is not initialized');
            return;
        }

        console.log('Loading categories');

        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const results = event.target.result;
            categories = {};
            results.forEach(category => {
                categories[category.name] = category.products;
            });
            displayCategories();
        };

        request.onerror = (event) => {
            console.error('Error loading categories:', event.target.error);
        };
    }

    const addCategoryButton = document.getElementById('add-category');
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
    const inventoryCategoryList = document.getElementById('inventory-category-list');
    const inventoryProductList = document.getElementById('inventory-product-list');
    const backToCategoriesButton = document.getElementById('back-to-categories');
    const selectedCategoryTitle = document.getElementById('selected-category');
    const productListDiv = document.getElementById('product-list');

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

    linkHome.addEventListener('click', () => showSection(homeSection));
    linkCategory.addEventListener('click', () => showSection(categorySection));
    linkProduct.addEventListener('click', () => showSection(productSection));
    linkInventory.addEventListener('click', () => {
        showSection(inventorySection);
        displayInventoryCategories();
    });
    linkBarcode.addEventListener('click', () => showSection(barcodeSection));

    addCategoryButton.addEventListener('click', () => {
        const categoryName = document.getElementById('category-name').value;
        if (categoryName && !categories[categoryName]) {
            categories[categoryName] = [];
            saveCategoryToDB({
                name: categoryName,
                products: categories[categoryName]
            });
            displayCategories();
            document.getElementById('category-name').value = '';
        } else {
            alert('カテゴリ名を入力してください。またはカテゴリが既に存在しています。');
        }
    });

    searchProductButton.addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value;
        if (searchCategory && categories[searchCategory]) {
            displayInventory(searchCategory);
        } else {
            alert('カテゴリ名を入力してください。またはカテゴリが存在しません。');
        }
    });

    closeModal.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

    function displayCategories() {
        const categoryDiv = document.getElementById('category-list');
        categoryDiv.innerHTML = '';
        for (const category in categories) {
            const categoryDivElement = document.createElement('div');
            categoryDivElement.className = 'category';

            const categoryNameElement = document.createElement('div');
            categoryNameElement.className = 'category-name';
            categoryNameElement.textContent = category;

            const editButton = document.createElement('button');
            editButton.textContent = 'カテゴリ編集';
            editButton.addEventListener('click', () => {
                const newCategoryName = prompt('新しいカテゴリ名を入力してください:', category);
                if (newCategoryName && newCategoryName !== category) {
                    categories[newCategoryName] = categories[category];
                    delete categories[category];
                    saveCategoryToDB({
                        name: newCategoryName,
                        products: categories[newCategoryName]
                    });
                    const transaction = db.transaction(['categories'], 'readwrite');
                    const store = transaction.objectStore('categories');
                    store.delete(category);
                    displayCategories();
                }
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'カテゴリ削除';
            deleteButton.addEventListener('click', () => {
                if (confirm(`カテゴリ "${category}" を削除してもよろしいですか？`)) {
                    delete categories[category];
                    const transaction = db.transaction(['categories'], 'readwrite');
                    const store = transaction.objectStore('categories');
                    store.delete(category);
                    displayCategories();
                }
            });

            categoryDivElement.appendChild(categoryNameElement);
            categoryDivElement.appendChild(editButton);
            categoryDivElement.appendChild(deleteButton);
            categoryDiv.appendChild(categoryDivElement);
        }
    }

    function displayInventoryCategories() {
        inventoryCategoryList.innerHTML = '';
        inventoryCategoryList.style.display = 'block';
        inventoryProductList.style.display = 'none';
        for (const category in categories) {
            const categoryDivElement = document.createElement('div');
            categoryDivElement.className = 'category';

            const categoryNameElement = document.createElement('div');
            categoryNameElement.className = 'category-name';
            categoryNameElement.textContent = category;

            categoryDivElement.addEventListener('click', () => {
                selectedCategoryTitle.textContent = category;
                displayInventory(category);
            });

            categoryDivElement.appendChild(categoryNameElement);
            inventoryCategoryList.appendChild(categoryDivElement);
        }
    }

    backToCategoriesButton.addEventListener('click', () => {
        displayInventoryCategories();
    });

    function displayInventory(category) {
        productListDiv.innerHTML = '';
        inventoryCategoryList.style.display = 'none';
        inventoryProductList.style.display = 'block';

        if (categories[category]) {
            categories[category].forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';
                productDiv.textContent = `${product.name} - 数量: ${product.quantity}`;

                const editButton = document.createElement('button');
                editButton.textContent = '数量編集';
                editButton.addEventListener('click', () => {
                    const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                    if (newQuantity !== null) {
                        product.quantity = newQuantity;
                        const timestamp = new Date().toLocaleString();
                        product.history.push(`${timestamp}: 数量を${newQuantity}に変更`);
                        saveCategoryToDB({
                            name: category,
                            products: categories[category]
                        });
                        displayInventory(category);
                    }
                });

                productDiv.appendChild(editButton);
                productListDiv.appendChild(productDiv);
            });
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

    loadCategories();
});
