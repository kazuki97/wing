document.addEventListener('DOMContentLoaded', function() {
    const dbName = 'inventoryDB';
    const dbVersion = 1;
    let db;

    function initDatabase() {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = function(event) {
            db = event.target.result;

            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('products')) {
                const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                productStore.createIndex('categoryId', 'categoryId', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            loadCategories();
            loadProducts();
        };

        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
        };
    }

    function loadCategories() {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = function(event) {
            const categories = event.target.result;
            renderCategories(categories);
        };
    }

    function loadProducts() {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.getAll();

        request.onsuccess = function(event) {
            const products = event.target.result;
            renderProducts(products);
        };
    }

    function addCategory(categoryName) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.add({ name: categoryName });

        request.onsuccess = function(event) {
            loadCategories();
        };
    }

    function addProduct(product) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.add(product);

        request.onsuccess = function(event) {
            loadProducts();
        };
    }

    function renderCategories(categories) {
        const categoryList = document.getElementById('category-list');
        const productCategorySelect = document.getElementById('product-category');
        categoryList.innerHTML = '';
        productCategorySelect.innerHTML = '<option value="">カテゴリを選択</option>';

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            categoryDiv.innerHTML = `
                <span>${category.name}</span>
                <button class="edit-category" data-id="${category.id}">カテゴリ編集</button>
                <button class="delete-category" data-id="${category.id}">カテゴリ削除</button>
            `;
            categoryList.appendChild(categoryDiv);

            const categoryOption = document.createElement('option');
            categoryOption.value = category.id;
            categoryOption.textContent = category.name;
            productCategorySelect.appendChild(categoryOption);
        });
    }

    function renderProducts(products) {
        const productTableBody = document.querySelector('#product-table tbody');
        productTableBody.innerHTML = '';

        products.forEach(product => {
            const productRow = document.createElement('tr');
            productRow.innerHTML = `
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td><button class="edit-product" data-id="${product.id}">編集</button></td>
                <td><button class="detail-product" data-id="${product.id}">詳細</button></td>
            `;
            productTableBody.appendChild(productRow);
        });
    }

    document.getElementById('add-category').addEventListener('click', function() {
        const categoryName = document.getElementById('category-name').value;
        if (categoryName) {
            addCategory(categoryName);
            document.getElementById('category-name').value = '';
        }
    });

    document.getElementById('add-product').addEventListener('click', function() {
        const productName = document.getElementById('product-name').value;
        const productQuantity = document.getElementById('product-quantity').value;
        const categoryId = document.getElementById('product-category').value;

        if (productName && productQuantity && categoryId) {
            const product = {
                name: productName,
                quantity: parseInt(productQuantity, 10),
                categoryId: parseInt(categoryId, 10)
            };
            addProduct(product);
            document.getElementById('product-name').value = '';
            document.getElementById('product-quantity').value = '';
        }
    });

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-category')) {
            const categoryId = event.target.dataset.id;
            editCategory(categoryId);
        } else if (event.target.classList.contains('delete-category')) {
            const categoryId = event.target.dataset.id;
            deleteCategory(categoryId);
        } else if (event.target.classList.contains('edit-product')) {
            const productId = event.target.dataset.id;
            editProduct(productId);
        } else if (event.target.classList.contains('detail-product')) {
            const productId = event.target.dataset.id;
            showProductDetails(productId);
        }
    });

    function editCategory(categoryId) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.get(parseInt(categoryId, 10));

        request.onsuccess = function(event) {
            const category = event.target.result;
            const newCategoryName = prompt('カテゴリ名を編集', category.name);
            if (newCategoryName) {
                category.name = newCategoryName;
                const updateRequest = store.put(category);
                updateRequest.onsuccess = function() {
                    loadCategories();
                };
            }
        };
    }

    function deleteCategory(categoryId) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const request = store.delete(parseInt(categoryId, 10));

        request.onsuccess = function() {
            loadCategories();
        };
    }

    function editProduct(productId) {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.get(parseInt(productId, 10));

        request.onsuccess = function(event) {
            const product = event.target.result;
            const newProductName = prompt('商品名を編集', product.name);
            const newProductQuantity = prompt('数量を編集', product.quantity);
            if (newProductName && newProductQuantity) {
                product.name = newProductName;
                product.quantity = parseInt(newProductQuantity, 10);
                const updateRequest = store.put(product);
                updateRequest.onsuccess = function() {
                    loadProducts();
                };
            }
        };
    }

    function showProductDetails(productId) {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.get(parseInt(productId, 10));

        request.onsuccess = function(event) {
            const product = event.target.result;
            alert(`商品名: ${product.name}\n数量: ${product.quantity}`);
        };
    }

    initDatabase();
});
