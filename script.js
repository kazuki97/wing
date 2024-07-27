document.addEventListener('DOMContentLoaded', () => {
  // IndexedDBの設定
  let db;
  const request = indexedDB.open('inventoryDB', 1);

  request.onerror = (event) => {
    console.error('Database error:', event.target.errorCode);
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    loadCategories();
    loadProducts();
  };

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
    categoryStore.createIndex('name', 'name', { unique: true });

    const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
    productStore.createIndex('categoryId', 'categoryId', { unique: false });
    productStore.createIndex('name', 'name', { unique: true });
  };

  // カテゴリをロードする関数
  const loadCategories = () => {
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = (event) => {
      const categories = event.target.result;
      const categoryList = document.getElementById('category-list');
      const categorySelect = document.getElementById('product-category');
      categoryList.innerHTML = '';
      categorySelect.innerHTML = '';
      categories.forEach(category => {
        const categoryItem = document.createElement('li');
        categoryItem.textContent = category.name;
        categoryList.appendChild(categoryItem);

        const categoryOption = document.createElement('option');
        categoryOption.value = category.id;
        categoryOption.textContent = category.name;
        categorySelect.appendChild(categoryOption);
      });
    };
  };

  // カテゴリを追加する関数
  const addCategory = () => {
    const categoryName = document.getElementById('category-name').value;
    const transaction = db.transaction(['categories'], 'readwrite');
    const store = transaction.objectStore('categories');
    const request = store.add({ name: categoryName });

    request.onsuccess = () => {
      document.getElementById('category-name').value = '';
      loadCategories();
    };
  };

  // 商品をロードする関数
  const loadProducts = () => {
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();

    request.onsuccess = (event) => {
      const products = event.target.result;
      const productTable = document.getElementById('product-table');
      productTable.innerHTML = '';
      products.forEach(product => {
        const productRow = document.createElement('tr');
        productRow.innerHTML = `
          <td>${product.name}</td>
          <td>${product.quantity}</td>
          <td>${product.categoryId}</td>
        `;
        productTable.appendChild(productRow);
      });
    };
  };

  // 商品を追加する関数
  const addProduct = () => {
    const productName = document.getElementById('product-name').value;
    const productQuantity = document.getElementById('product-quantity').value;
    const productCategoryId = document.getElementById('product-category').value;
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const request = store.add({ name: productName, quantity: productQuantity, categoryId: productCategoryId });

    request.onsuccess = () => {
      document.getElementById('product-name').value = '';
      document.getElementById('product-quantity').value = '';
      document.getElementById('product-category').value = '';
      loadProducts();
    };
  };

  // イベントリスナーの設定
  document.getElementById('add-category').addEventListener('click', addCategory);
  document.getElementById('add-product').addEventListener('click', addProduct);
});
