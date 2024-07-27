document.addEventListener('DOMContentLoaded', function() {
    const homeLink = document.getElementById('homeLink');
    const categoryLink = document.getElementById('categoryLink');
    const productLink = document.getElementById('productLink');
    const inventoryLink = document.getElementById('inventoryLink');
    const scanLink = document.getElementById('scanLink');
    
    const homeSection = document.getElementById('homeSection');
    const categorySection = document.getElementById('categorySection');
    const productSection = document.getElementById('productSection');
    const inventorySection = document.getElementById('inventorySection');
    const scanSection = document.getElementById('scanSection');

    homeLink.addEventListener('click', function() {
        showSection(homeSection);
    });

    categoryLink.addEventListener('click', function() {
        showSection(categorySection);
    });

    productLink.addEventListener('click', function() {
        showSection(productSection);
    });

    inventoryLink.addEventListener('click', function() {
        showSection(inventorySection);
    });

    scanLink.addEventListener('click', function() {
        showSection(scanSection);
    });

    function showSection(section) {
        homeSection.style.display = 'none';
        categorySection.style.display = 'none';
        productSection.style.display = 'none';
        inventorySection.style.display = 'none';
        scanSection.style.display = 'none';
        section.style.display = 'block';
    }

    // カテゴリの追加
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryName = document.getElementById('categoryName');
    const categoryList = document.getElementById('categoryList');

    addCategoryBtn.addEventListener('click', function() {
        if (categoryName.value.trim() !== '') {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            categoryItem.innerHTML = `
                <span>${categoryName.value.trim()}</span>
                <div>
                    <button onclick="editCategory(this)">カテゴリ編集</button>
                    <button onclick="deleteCategory(this)">カテゴリ削除</button>
                </div>
            `;
            categoryList.appendChild(categoryItem);
            categoryName.value = '';
        }
    });

    window.editCategory = function(button) {
        const categoryItem = button.parentNode.parentNode;
        const categorySpan = categoryItem.querySelector('span');
        const newCategoryName = prompt('新しいカテゴリ名を入力してください:', categorySpan.textContent);
        if (newCategoryName !== null && newCategoryName.trim() !== '') {
            categorySpan.textContent = newCategoryName.trim();
        }
    };

    window.deleteCategory = function(button) {
        const categoryItem = button.parentNode.parentNode;
        categoryList.removeChild(categoryItem);
    };

    // 商品の追加
    const addProductBtn = document.getElementById('addProductBtn');
    const productName = document.getElementById('productName');
    const productQuantity = document.getElementById('productQuantity');
    const productList = document.getElementById('productList');
    const categorySelect = document.getElementById('categorySelect');

    addProductBtn.addEventListener('click', function() {
        if (productName.value.trim() !== '' && productQuantity.value.trim() !== '' && categorySelect.value !== '') {
            const productItem = document.createElement('div');
            productItem.classList.add('product-item');
            productItem.innerHTML = `
                <span>${productName.value.trim()} (${productQuantity.value.trim()}) - ${categorySelect.value}</span>
                <div>
                    <button onclick="editProduct(this)">商品編集</button>
                    <button onclick="deleteProduct(this)">商品削除</button>
                </div>
            `;
            productList.appendChild(productItem);
            productName.value = '';
            productQuantity.value = '';
            categorySelect.value = '';
        }
    });

    window.editProduct = function(button) {
        const productItem = button.parentNode.parentNode;
        const productSpan = productItem.querySelector('span');
        const [productName, productDetails] = productSpan.textContent.split(' (');
        const [productQuantity, productCategory] = productDetails.split(') - ');

        const newProductName = prompt('新しい商品名を入力してください:', productName.trim());
        const newProductQuantity = prompt('新しい数量を入力してください:', productQuantity.trim());
        const newProductCategory = prompt('新しいカテゴリを入力してください:', productCategory.trim());

        if (newProductName !== null && newProductName.trim() !== '' && newProductQuantity !== null && newProductQuantity.trim() !== '' && newProductCategory !== null && newProductCategory.trim() !== '') {
            productSpan.textContent = `${newProductName.trim()} (${newProductQuantity.trim()}) - ${newProductCategory.trim()}`;
        }
    };

    window.deleteProduct = function(button) {
        const productItem = button.parentNode.parentNode;
        productList.removeChild(productItem);
    };

    // 在庫検索
    const searchInventoryBtn = document.getElementById('searchInventoryBtn');
    const inventoryCategory = document.getElementById('inventoryCategory');
    const inventoryList = document.getElementById('inventoryList');

    searchInventoryBtn.addEventListener('click', function() {
        if (inventoryCategory.value.trim() !== '') {
            // ここで在庫検索の処理を追加
            // 仮の在庫データを表示
            inventoryList.innerHTML = `
                <div class="inventory-item">
                    <span>商品A (10) - ${inventoryCategory.value.trim()}</span>
                    <button onclick="editInventory(this)">在庫編集</button>
                </div>
                <div class="inventory-item">
                    <span>商品B (20) - ${inventoryCategory.value.trim()}</span>
                    <button onclick="editInventory(this)">在庫編集</button>
                </div>
            `;
        }
    });

    window.editInventory = function(button) {
        const inventoryItem = button.parentNode;
        const inventorySpan = inventoryItem.querySelector('span');
        const [productName, productDetails] = inventorySpan.textContent.split(' (');
        const [productQuantity, productCategory] = productDetails.split(') - ');

        const newProductQuantity = prompt('新しい数量を入力してください:', productQuantity.trim());

        if (newProductQuantity !== null && newProductQuantity.trim() !== '') {
            inventorySpan.textContent = `${productName.trim()} (${newProductQuantity.trim()}) - ${productCategory.trim()}`;
        }
    };
});
