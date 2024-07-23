document.addEventListener('DOMContentLoaded', () => {
    const categories = {};
    const inventoryData = [];

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
                inventoryData.push({ name: productName, quantity: productQuantity });
                displayCategories();
                document.getElementById('product-name').value = '';
                document.getElementById('product-quantity').value = '';
                updateChart();
            } else {
                alert('カテゴリが存在しません。先にカテゴリを追加してください。');
            }
        } else {
            alert('全てのフィールドを入力してください。');
        }
    });

    searchProductButton.addEventListener('click', () => {
        const searchCategory = document.getElementById('search-category').value;
        if (categories[searchCategory]) {
            displayCategories(searchCategory);
        } else {
            alert('カテゴリが存在しません。');
        }
    });

    closeModal.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === detailModal) {
            detailModal.style.display = 'none';
        }
    });

    function updateCategorySelect() {
        categorySelect.innerHTML = '<option value="">カテゴリを選択</option>';
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        }
    }

    function displayCategories(searchCategory = null) {
        const categoryListElement = document.getElementById('category-list');
        categoryListElement.innerHTML = '';

        for (const category in categories) {
            if (searchCategory && category !== searchCategory) continue;

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category;
            categoryDiv.appendChild(categoryTitle);

            const productTable = document.createElement('table');
            productTable.className = 'product-table';

            const tableHeader = document.createElement('thead');
            tableHeader.innerHTML = `
                <tr>
                    <th>商品名</th>
                    <th>数量</th>
                    <th>編集</th>
                    <th>詳細</th>
                </tr>
            `;
            productTable.appendChild(tableHeader);

            const tableBody = document.createElement('tbody');

            categories[category].forEach((product, index) => {
                const productRow = document.createElement('tr');
                productRow.innerHTML = `
                    <td>${product.name}</td>
                    <td class="editable">
                        <span>${product.quantity}</span>
                        <input type="number" value="${product.quantity}" style="display: none;">
                    </td>
                    <td>
                        <button class="edit-btn">編集</button>
                        <button class="save-btn" style="display: none;">保存</button>
                    </td>
                    <td>
                        <button class="detail-btn">詳細</button>
                    </td>
                `;
                productRow.querySelector('.edit-btn').addEventListener('click', () => {
                    const span = productRow.querySelector('.editable span');
                    const input = productRow.querySelector('.editable input');
                    const editBtn = productRow.querySelector('.edit-btn');
                    const saveBtn = productRow.querySelector('.save-btn');

                    span.style.display = 'none';
                    input.style.display = 'inline';
                    editBtn.style.display = 'none';
                    saveBtn.style.display = 'inline';
                });

                productRow.querySelector('.save-btn').addEventListener('click', () => {
                    const input = productRow.querySelector('.editable input');
                    const span = productRow.querySelector('.editable span');
                    const editBtn = productRow.querySelector('.edit-btn');
                    const saveBtn = productRow.querySelector('.save-btn');

                    const newQuantity = input.value;
                    const timestamp = new Date().toLocaleString();
                    categories[category][index].quantity = newQuantity;
                    categories[category][index].history.push(`${timestamp}: 数量を${newQuantity}に変更`);

                    span.textContent = newQuantity;
                    span.style.display = 'inline';
                    input.style.display = 'none';
                    editBtn.style.display = 'inline';
                    saveBtn.style.display = 'none';

                    displayCategories(searchCategory);
                    updateChart();
                });

                productRow.querySelector('.detail-btn').addEventListener('click', () => {
                    detailTitle.textContent = `${product.name}の詳細`;
                    detailBody.innerHTML = product.history.map(entry => `<p>${entry}</p>`).join('');
                    detailModal.style.display = 'block';
                });

                tableBody.appendChild(productRow);
            });

            productTable.appendChild(tableBody);
            categoryDiv.appendChild(productTable);
            categoryListElement.appendChild(categoryDiv);
        }
    }

    function updateChart() {
        const labels = inventoryData.map(item => item.name);
        const data = inventoryData.map(item => item.quantity);
        inventoryChart.data.labels = labels;
        inventoryChart.data.datasets[0].data = data;
        inventoryChart.update();
    }
    // バーコードスキャン機能
    const codeReader = new ZXing.BrowserBarcodeReader();
    const startScanButton = document.getElementById('start-scan');
    const barcodeVideo = document.getElementById('barcode-video');

    startScanButton.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
            barcodeVideo.srcObject = stream;
            barcodeVideo.play();
            codeReader.decodeFromVideoDevice(null, 'barcode-video', (result, err) => {
                if (result) {
                    alert(`Barcode detected: ${result.text}`);
                    // バーコード検出結果に基づいて在庫を更新する処理を追加
                    const product = findProductByBarcode(result.text);
                    if (product) {
                        const newQuantity = parseInt(product.quantity, 10) - 1;
                        if (newQuantity >= 0) {
                            const timestamp = new Date().toLocaleString();
                            product.quantity = newQuantity;
                            product.history.push(`${timestamp}: バーコードスキャンにより数量を${newQuantity}に変更`);
                            displayCategories();
                            updateChart();
                        } else {
                            alert('在庫が不足しています。');
                        }
                    } else {
                        alert('該当する商品が見つかりません。');
                    }
                    barcodeVideo.srcObject.getTracks().forEach(track => track.stop());
                    barcodeVideo.style.display = 'none';
                    codeReader.reset();
                }
            });
        }).catch((err) => {
            console.error("Error accessing camera: ", err);
            alert("カメラにアクセスできませんでした。カメラの許可を確認してください。");
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
