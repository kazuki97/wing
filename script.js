document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;

    const request = indexedDB.open('inventoryDB', 1);

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
            db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        }
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
        };

        request.onerror = (event) => {
            console.error('Error loading categories:', event.target.error);
        };
    }

    function saveProductToDB(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        store.put(product);
    }

    const addCategoryButton = document.getElementById('add-category');
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

    function displayCategories() {
        const categoryDiv = document.getElementById('category-list');
        categoryDiv.innerHTML = '';
        for (const category in categories) {
            const categoryDivElement = document.createElement('div');
            categoryDivElement.className = 'category';
            categoryDivElement.textContent = category;

            const editButton = document.createElement('button');
            editButton.textContent = 'カテゴリ編集';
            editButton.className = 'edit-category-button';
            editButton.dataset.category = category;
            editButton.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
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
                    updateCategorySelect();
                    displayCategories();
                }
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'カテゴリ削除';
            deleteButton.className = 'delete-category-button';
            deleteButton.dataset.category = category;
            deleteButton.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                if (confirm(`カテゴリ "${category}" を削除してもよろしいですか？`)) {
                    delete categories[category];
                    const transaction = db.transaction(['categories'], 'readwrite');
                    const store = transaction.objectStore('categories');
                    store.delete(category);
                    updateCategorySelect();
                    displayCategories();
                }
            });

            categoryDivElement.appendChild(editButton);
            categoryDivElement.appendChild(deleteButton);

            categoryDiv.appendChild(categoryDivElement);
        }
    }

    const addProductButton = document.getElementById('add-product');
    addProductButton.addEventListener('click', () => {
        const productName = document.getElementById('product-name').value;
        const productQuantity = document.getElementById('product-quantity').value;
        const category = categorySelect.value;
        if (productName && productQuantity && category) {
            const product = {
                name: productName,
                quantity: Number(productQuantity),
                category: category
            };
            categories[category].push(product);
            saveProductToDB(product);
            document.getElementById('product-name').value = '';
            document.getElementById('product-quantity').value = '';
        } else {
            alert('全てのフィールドに入力してください。');
        }
    });

    const searchProductButton = document.getElementById('search-product');
    searchProductButton.addEventListener('click', () => {
        const searchCategoryName = document.getElementById('search-category').value;
        const inventoryList = document.getElementById('inventory-list');
        inventoryList.innerHTML = '';
        if (searchCategoryName && categories[searchCategoryName]) {
            const products = categories[searchCategoryName];
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'product';
                productDiv.textContent = `${product.name} - 数量: ${product.quantity}`;
                inventoryList.appendChild(productDiv);
            });
        } else {
            alert('カテゴリ名を正しく入力してください。');
        }
    });

    const startScanButton = document.getElementById('start-scan');
    const barcodeVideo = document.getElementById('barcode-video');
    const barcodeInput = document.getElementById('barcode-input');
    let scanner;

    startScanButton.addEventListener('click', () => {
        if (!scanner) {
            scanner = new ZXing.BrowserBarcodeReader();
        }
        scanner.decodeFromVideoDevice(null, barcodeVideo, (result, err) => {
            if (result) {
                barcodeInput.value = result.text;
                scanner.reset();
                barcodeVideo.style.display = 'none';
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
            }
        });
        barcodeVideo.style.display = 'block';
    });

    window.onclick = (event) => {
        if (event.target === detailModal) {
            detailModal.style.display = 'none';
        }
    };
});
