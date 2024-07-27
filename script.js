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
        if (category && productName && quantity) {
            const product = { category, name: productName, quantity: parseInt(quantity, 10) };
            saveProductToDB(product);
            displayProducts(category);
            document.getElementById('product-name').value = '';
            document.getElementById('product-quantity').value = '';
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
            displayInventoryCategories();
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
            editButton.textContent = 'カテゴリ編集';
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
            deleteButton.textContent = 'カテゴリ削除';
            deleteButton.className = 'category-button';
            deleteButton.addEventListener('click', () => {
                if (confirm('本当にこのカテゴリを削除しますか？')) {
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

    function displayInventoryCategories() {
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
        inventoryTableBody.innerHTML = '';
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(IDBKeyRange.only(category));

        request.onsuccess = (event) => {
            const products = event.target.result;
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td><button class="edit-button" data-id="${product.id}">編集</button></td>
                `;
                inventoryTableBody.appendChild(row);
            });

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = parseInt(event.target.getAttribute('data-id'), 10);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                        const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                        if (newQuantity) {
                            product.quantity = parseInt(newQuantity, 10);
                            saveProductToDB(product);
                            displayInventoryProducts(category);
                        } else {
                            alert('入力が無効です。');
                        }
                    }
                });
            });
        };
    }

    function displayProducts(category) {
        const productTableBody = document.querySelector('#product-table tbody');
        productTableBody.innerHTML = '';
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(IDBKeyRange.only(category));

        request.onsuccess = (event) => {
            const products = event.target.result;
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td><button class="edit-button" data-id="${product.id}">編集</button></td>
                    <td><button class="detail-button" data-id="${product.id}">詳細</button></td>
                `;
                productTableBody.appendChild(row);
            });

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = parseInt(event.target.getAttribute('data-id'), 10);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                        const newProductName = prompt('新しい商品名を入力してください:', product.name);
                        const newQuantity = prompt('新しい数量を入力してください:', product.quantity);
                        if (newProductName && newQuantity) {
                            product.name = newProductName;
                            product.quantity = parseInt(newQuantity, 10);
                            saveProductToDB(product);
                            displayProducts(category);
                        } else {
                            alert('入力が無効です。');
                        }
                    }
                });
            });

            document.querySelectorAll('.detail-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const productId = parseInt(event.target.getAttribute('data-id'), 10);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                        document.getElementById('detail-title').textContent = product.name;
                        document.getElementById('detail-body').innerHTML = `
                            <p>カテゴリ: ${product.category}</p>
                            <p>数量: ${product.quantity}</p>
                        `;
                        detailModal.style.display = 'block';
                    }
                });
            });
        };
    }
});
