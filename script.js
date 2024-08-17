document.addEventListener('DOMContentLoaded', () => {
    let categories = {};
    let db;

    const request = indexedDB.open('inventoryDB', 3);

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
    const searchButton = document.getElementById('searchButton');
    const rangeSearchButton = document.getElementById('rangeSearchButton');

    const homeSection = document.getElementById('home-section');
    const categorySection = document.getElementById('category-section');
    const productSection = document.getElementById('product-section');
    const inventorySection = document.getElementById('inventory-section');
    const barcodeSection = document.getElementById('barcode-section');
    const salesSection = document.getElementById('sales-section');

    function showSection(section) {
        homeSection.style.display = 'none';
        categorySection.style.display = 'none';
        productSection.style.display = 'none';
        inventorySection.style.display = 'none';
        barcodeSection.style.display = 'none';
        salesSection.style.display = 'none';
        section.style.display = 'block';
    }

    // すべてのリンク要素が存在することを確認し、イベントリスナーを追加
    const linkHome = document.getElementById('linkHome');
    const linkCategory = document.getElementById('linkCategory');
    const linkProduct = document.getElementById('linkProduct');
    const linkInventory = document.getElementById('linkInventory');
    const linkBarcode = document.getElementById('linkBarcode');
    const linkSales = document.getElementById('linkSales');

    if (linkHome) {
        linkHome.addEventListener('click', () => {
            showSection(homeSection);
        });
    }

    if (linkCategory) {
        linkCategory.addEventListener('click', () => {
            showSection(categorySection);
        });
    }

    if (linkProduct) {
        linkProduct.addEventListener('click', () => {
            showSection(productSection);
            updateCategorySelect();
        });
    }

    if (linkInventory) {
        linkInventory.addEventListener('click', () => {
            showSection(inventorySection);
            displayInventoryCategories();
        });
    }

    if (linkBarcode) {
        linkBarcode.addEventListener('click', () => {
            showSection(barcodeSection);
        });
    }

    if (linkSales) {
        linkSales.addEventListener('click', () => {
            showSection(salesSection);
            displaySales();
        });
    }

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

    searchButton.addEventListener('click', () => {
        const monthFilter = document.getElementById('month-filter').value;
        if (monthFilter) {
            const transaction = db.transaction(['sales'], 'readonly');
            const store = transaction.objectStore('sales');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const sales = event.target.result;
                const filteredSales = sales.filter(sale => sale.date.startsWith(monthFilter));
                displaySales(filteredSales);
            };
        }
    });

    rangeSearchButton.addEventListener('click', () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        if (startDate && endDate) {
            const transaction = db.transaction(['sales'], 'readonly');
            const store = transaction.objectStore('sales');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const sales = event.target.result;
                const filteredSales = sales.filter(sale => sale.date >= startDate && sale.date <= endDate);
                displaySales(filteredSales);
            };
        }
    });

    function displaySales(salesList = []) {
        const salesTableBody = document.getElementById('sales-table').getElementsByTagName('tbody')[0];
        salesTableBody.innerHTML = '';

        salesList.forEach((sale, index) => {
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
                                displaySales(salesList);
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
                    displaySales(salesList);
                }
            });
            row.insertCell(7).appendChild(deleteButton);
        });
    }

    function displayFilteredSales(sales) {
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
            deleteButton.innerHTML = '🗑️';
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
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const request = store.getAll();

        request.onsuccess = (event) => {
            const sales = event.target.result;
            displaySales(sales);
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
                deleteButton.innerHTML = '🗑️';
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

    function displayFilteredSales(sales) {
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
            deleteButton.innerHTML = '🗑️';
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
    }
});
