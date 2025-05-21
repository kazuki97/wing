import { auth } from './firebase.js';
import { getParentCategories, getSubcategories } from './categories.js';
import { updateProductQuantity, updateOverallInventory } from './inventoryManagement.js';
import { getProducts } from './products.js';




// onAuthStateChanged で認証状態が確定した後に処理を開始する
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("入荷セクションのデータを取得するにはログインが必要です。");
    return;
  }
  
  // 親カテゴリを読み込む関数
  async function loadReceivingParentCategories() {
    try {
      const parentCategories = await getParentCategories();
      const parentSelect = document.getElementById('receivingParentCategorySelect');
      parentSelect.innerHTML = '<option value="">親カテゴリを選択</option>';
      parentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        parentSelect.appendChild(option);
      });
      console.log("読み込んだ親カテゴリ:", parentCategories);
    } catch (error) {
      console.error("親カテゴリの取得に失敗しました", error);
      alert("親カテゴリの取得に失敗しました");
    }
  }
  
  // 親カテゴリ変更時にサブカテゴリを更新する関数
  async function updateReceivingSubcategories() {
    const parentCategoryId = document.getElementById('receivingParentCategorySelect').value;
    const subSelect = document.getElementById('receivingSubcategorySelect');
    subSelect.innerHTML = '<option value="">サブカテゴリを選択</option>';
    if (!parentCategoryId) return;
    try {
      const subcategories = await getSubcategories(parentCategoryId);
      subcategories.forEach(subcat => {
        const option = document.createElement('option');
        option.value = subcat.id;
        option.textContent = subcat.name;
        subSelect.appendChild(option);
      });
      console.log("読み込んだサブカテゴリ:", subcategories);
    } catch (error) {
      console.error("サブカテゴリの取得に失敗しました", error);
      alert("サブカテゴリの取得に失敗しました");
    }
  }
  
  // 初期表示時に親カテゴリを読み込む
  await loadReceivingParentCategories();
  
  // 親カテゴリ選択時のイベントリスナーを追加
  const parentSelectElement = document.getElementById('receivingParentCategorySelect');
  if (parentSelectElement) {
    parentSelectElement.addEventListener('change', updateReceivingSubcategories);
  } else {
    console.error("receivingParentCategorySelect 要素が見つかりません");
  }
  
  // 「商品一覧を読み込む」ボタンのイベントリスナー
  const loadProductsBtn = document.getElementById('loadReceivingProducts');
  loadProductsBtn.addEventListener('click', async () => {
    const subcategoryId = document.getElementById('receivingSubcategorySelect').value;
    if (!subcategoryId) {
      alert("サブカテゴリを選択してください");
      return;
    }
    try {
      // 親カテゴリは不要なので、第一引数に null を渡してサブカテゴリで絞り込む
      const products = await getProducts(null, subcategoryId);
      const tbody = document.getElementById('receivingProductList').querySelector('tbody');
      tbody.innerHTML = "";
      products.forEach(product => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${product.name}</td>
          <td>${product.quantity || 0}</td>
          <td>
            <input type="number" value="0" min="0" data-product-id="${product.id}" class="receiving-quantity" />
          </td>
        `;
        tbody.appendChild(tr);
      });
      console.log("読み込んだ商品一覧:", products);
    } catch (error) {
      console.error("商品一覧の取得に失敗しました", error);
      alert("商品一覧の取得に失敗しました");
    }
  });
  
  // 「一括更新」ボタンのイベントリスナー
  const updateStockBtn = document.getElementById("updateReceivingStock");
  updateStockBtn.addEventListener("click", async () => {
    const subcategoryId = document.getElementById("receivingSubcategorySelect").value;
    if (!subcategoryId) {
      alert("サブカテゴリを選択してください");
      return;
    }
    
    // 全体在庫更新の入力値取得
    const overallQuantityInput = document.getElementById("receivingOverallQuantity");
    const overallQuantity = parseFloat(overallQuantityInput.value);
    const overallReason = document.getElementById("receivingOverallReason").value || "入荷による更新";
    
    // 個別商品の在庫更新
    const quantityInputs = document.querySelectorAll(".receiving-quantity");
    for (let input of quantityInputs) {
      const changeAmount = parseFloat(input.value);
      if (isNaN(changeAmount) || changeAmount === 0) continue;
      const productId = input.getAttribute("data-product-id");
      try {
        await updateProductQuantity(productId, changeAmount, "入荷");
      } catch (error) {
        console.error(`商品ID ${productId} の在庫更新に失敗しました`, error);
      }
    }
    
    // 全体在庫の更新
    try {
      await updateOverallInventory(subcategoryId, overallQuantity, overallReason);
    } catch (error) {
      console.error("全体在庫の更新に失敗しました", error);
    }
    
    alert("入荷更新が完了しました");
    // 更新後、商品一覧を再読み込み
    loadProductsBtn.click();
    overallQuantityInput.value = "";
    document.getElementById("receivingOverallReason").value = "";
  });
});
