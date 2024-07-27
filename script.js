document.addEventListener("DOMContentLoaded", function() {
    var addCategoryButton = document.getElementById('add-category');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', addCategory);
    }
    
    var editCategoryButtons = document.querySelectorAll('.edit-category');
    editCategoryButtons.forEach(function(button) {
        button.addEventListener('click', editCategory);
    });
    
    var deleteCategoryButtons = document.querySelectorAll('.delete-category');
    deleteCategoryButtons.forEach(function(button) {
        button.addEventListener('click', deleteCategory);
    });
    
    var addProductButton = document.getElementById('add-product');
    if (addProductButton) {
        addProductButton.addEventListener('click', addProduct);
    }

    var editProductButtons = document.querySelectorAll('.edit-product');
    editProductButtons.forEach(function(button) {
        button.addEventListener('click', editProduct);
    });

    var deleteProductButtons = document.querySelectorAll('.delete-product');
    deleteProductButtons.forEach(function(button) {
        button.addEventListener('click', deleteProduct);
    });

    loadCategories();
    loadProducts();
});

function addCategory() {
    var categoryNameInput = document.getElementById('category-name');
    var categoryName = categoryNameInput.value.trim();
    if (categoryName === "") {
        alert("カテゴリ名を入力してください。");
        return;
    }
    var categoryList = document.getElementById('category-list');
    var categoryItem = document.createElement('div');
    categoryItem.className = 'category-item';
    categoryItem.innerHTML = `
        <span class="category-name">${categoryName}</span>
        <button class="edit-category">カテゴリ編集</button>
        <button class="delete-category">カテゴリ削除</button>
    `;
    categoryList.appendChild(categoryItem);

    // リスナーを追加
    categoryItem.querySelector('.edit-category').addEventListener('click', editCategory);
    categoryItem.querySelector('.delete-category').addEventListener('click', deleteCategory);
    categoryNameInput.value = "";
}

function editCategory(event) {
    var categoryItem = event.target.closest('.category-item');
    var categoryNameSpan = categoryItem.querySelector('.category-name');
    var newCategoryName = prompt("新しいカテゴリ名を入力してください:", categoryNameSpan.textContent);
    if (newCategoryName !== null && newCategoryName.trim() !== "") {
        categoryNameSpan.textContent = newCategoryName.trim();
    }
}

function deleteCategory(event) {
    if (confirm("本当にこのカテゴリを削除しますか？")) {
        var categoryItem = event.target.closest('.category-item');
        categoryItem.remove();
    }
}

function addProduct() {
    var productNameInput = document.getElementById('product-name');
    var productQuantityInput = document.getElementById('product-quantity');
    var productCategorySelect = document.getElementById('product-category');
    var productName = productNameInput.value.trim();
    var productQuantity = productQuantityInput.value.trim();
    var productCategory = productCategorySelect.value;

    if (productName === "" || productQuantity === "" || productCategory === "") {
        alert("全ての項目を入力してください。");
        return;
    }

    var productList = document.getElementById('product-list');
    var productItem = document.createElement('div');
    productItem.className = 'product-item';
    productItem.innerHTML = `
        <span class="product-name">${productName}</span>
        <span class="product-quantity">${productQuantity}</span>
        <span class="product-category">${productCategory}</span>
        <button class="edit-product">商品編集</button>
        <button class="delete-product">商品削除</button>
    `;
    productList.appendChild(productItem);

    // リスナーを追加
    productItem.querySelector('.edit-product').addEventListener('click', editProduct);
    productItem.querySelector('.delete-product').addEventListener('click', deleteProduct);
    productNameInput.value = "";
    productQuantityInput.value = "";
    productCategorySelect.value = "";
}

function editProduct(event) {
    var productItem = event.target.closest('.product-item');
    var productNameSpan = productItem.querySelector('.product-name');
    var productQuantitySpan = productItem.querySelector('.product-quantity');
    var productCategorySpan = productItem.querySelector('.product-category');
    var newProductName = prompt("新しい商品名を入力してください:", productNameSpan.textContent);
    var newProductQuantity = prompt("新しい数量を入力してください:", productQuantitySpan.textContent);
    var newProductCategory = prompt("新しいカテゴリを入力してください:", productCategorySpan.textContent);
    
    if (newProductName !== null && newProductName.trim() !== "" &&
        newProductQuantity !== null && newProductQuantity.trim() !== "" &&
        newProductCategory !== null && newProductCategory.trim() !== "") {
        productNameSpan.textContent = newProductName.trim();
        productQuantitySpan.textContent = newProductQuantity.trim();
        productCategorySpan.textContent = newProductCategory.trim();
    }
}

function deleteProduct(event) {
    if (confirm("本当にこの商品を削除しますか？")) {
        var productItem = event.target.closest('.product-item');
        productItem.remove();
    }
}

function loadCategories() {
    // カテゴリを読み込む実装
}

function loadProducts() {
    // 商品を読み込む実装
}
