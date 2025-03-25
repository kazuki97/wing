// receiving.js
import { updateAllParentCategorySelects, updateSubcategorySelect } from './eventListeners.js';
import { updateProductQuantity, updateOverallInventory } from './inventoryManagement.js';
import { getProducts } from './products.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 他のセクションと同様に、グローバル関数を呼び出して全ての親カテゴリセレクトボックスを更新する
  await updateAllParentCategorySelects();
  
  // 2. 入荷セクション専用の親カテゴリのセレクトボックスに対してイベントリスナーを設定
  const receivingParentSelect = document.getElementById('receivingParentCategorySelect');
  if (receivingParentSelect) {
    receivingParentSelect.addEventListener('change', async () => {
      // 他のセクションと同様、updateSubcategorySelect(親カテゴリID, 対象のサブカテゴリセレクトID) を利用
      await updateSubcategorySelect(receivingParentSelect.value, 'receivingSubcategorySelect');
    });
  } else {
    console.error("receivingParentCategorySelect 要素が見つかりません");
  }
  
  // 「商品一覧を読み込む」ボタンのイベントリスナー
  const loadProductsBtn = document.getElementById('loadReceivingProducts');
  loadProductsBtn.addEventListener('click', async () => {
    const subcategorySelect = document.getElementById('receivingSubcategorySelect');
    const subcategoryId = subcategorySelect.value;
    if (!subcategoryId) {
      alert("サブカテゴリを選択してください");
      return;
    }
    try {
      // 在庫管理と同様、親カテゴリは不要なので null を渡してサブカテゴリで絞り込む
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
