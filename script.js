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
    };

    function saveCategoryToDB(category) {
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        store.put(category);
    }

    function loadCategories() {
        if (!db) return;

        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = (event) => {
            categories = {};
            event.target.result.forEach(category => {
                categories[category.name] = category.products;
            });
            updateCategorySelect();
            displayCategories();
        };
    }

    function updateCategorySelect() {
        const categorySelect = document.getElementById('category-select');
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
            categoryDivElement.textContent = category;

            const editCategoryButton = document.createElement('button');
            editCategoryButton.textContent = 'カテゴリ編集';
            editCategoryButton.dataset.category = category;
            editCategoryButton.addEventListener('click', (e) => {
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

            const deleteCategoryButton = document.createElement('button');
            deleteCategoryButton.textContent = 'カテゴリ削除';
            deleteCategoryButton.dataset.category = category;
            deleteCategoryButton.addEventListener('click', (e) => {
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

            categoryDivElement.appendChild(editCategoryButton);
            categoryDivElement.appendChild(deleteCategoryButton);
            categoryDiv.appendChild(categoryDivElement);
        }
    }

    document.getElementById('add-category').addEventListener('click', () => {
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

    document.getElementById('add-product').addEventListener('click', () => {
        const categoryName = document.getElementById('category-select').value;
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
});
