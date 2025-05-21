import {
  db, collection, addDoc, serverTimestamp, query, orderBy, getDocs, getDoc, updateDoc, doc
} from './firebase.js';
import {
  getParentCategories,
  getSubcategories,
  getParentCategoryById,   // ★★★ これを追加！
  getSubcategoryById       // ★★★ これを追加！
} from './categories.js';
import {
  getProducts
} from './products.js';


// 消耗品追加関数
async function addConsumable(event) {
  event.preventDefault();
  const name = document.getElementById('consumableName').value;
  const cost = parseFloat(document.getElementById('consumableCost').value);

  try {
    await addDoc(collection(db, 'consumables'), {
      name,
      cost,
      createdAt: serverTimestamp(),
      usedProducts: []
    });

    alert('消耗品を登録しました。');
    document.getElementById('addConsumableForm').reset();
    displayConsumables();
  } catch (error) {
    alert('エラーが発生しました: ' + error.message);
  }
}

// 消耗品一覧表示関数
async function displayConsumables() {
  const tbody = document.querySelector('#consumableList tbody');
  tbody.innerHTML = '';

  try {
    const consumablesQuery = query(collection(db, 'consumables'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(consumablesQuery);

    snapshot.forEach(docSnap => {
      const consumable = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${consumable.name}</td>
        <td>${consumable.cost}円</td>
        <td>
          <button class="edit-consumable" data-id="${docSnap.id}">編集</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    alert('一覧表示中にエラーが発生しました: ' + error.message);
  }
}

// 親カテゴリ・サブカテゴリ・商品セレクトを連動セット
async function populateParentCategories(selectedId = "") {
  const select = document.getElementById('consumableProductParentCategory');
  select.innerHTML = '<option value="">選択</option>';
  const parents = await getParentCategories();
  parents.forEach(cat => {
    select.innerHTML += `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${cat.name}</option>`;
  });
}

async function populateSubcategories(parentCategoryId, selectedId = "") {
  const select = document.getElementById('consumableProductSubcategory');
  select.innerHTML = '<option value="">選択</option>';
  if (!parentCategoryId) return;
  const subs = await getSubcategories(parentCategoryId);
  subs.forEach(sub => {
    select.innerHTML += `<option value="${sub.id}" ${sub.id === selectedId ? 'selected' : ''}>${sub.name}</option>`;
  });
}

async function populateProducts(parentCategoryId, subcategoryId, selectedId = "") {
  const select = document.getElementById('consumableProductName');
  select.innerHTML = '<option value="">選択</option>';
  if (!parentCategoryId || !subcategoryId) return;
  const products = await getProducts(parentCategoryId, subcategoryId);
  products.forEach(prod => {
    select.innerHTML += `<option value="${prod.id}" ${prod.id === selectedId ? 'selected' : ''}>${prod.name}</option>`;
  });
}

// 商品連動セレクトの初期化＆イベント
export async function initConsumableProductSelects() {
  await populateParentCategories();

  document.getElementById('consumableProductParentCategory').addEventListener('change', async function () {
    await populateSubcategories(this.value);
    document.getElementById('consumableProductName').innerHTML = '<option value="">選択</option>';
  });

  document.getElementById('consumableProductSubcategory').addEventListener('change', async function () {
    const parentId = document.getElementById('consumableProductParentCategory').value;
    await populateProducts(parentId, this.value);
  });
}

// 編集エリアセット＋セレクト初期値もセット
async function setupConsumableProductEditor(consumableId, consumable) {
  await initConsumableProductSelects();
  // usedProducts表示
  renderConsumableProductList(consumable.usedProducts || [], consumableId);

  // 直近のusedProductsがあれば、セレクト初期値を自動セット
  if (consumable.usedProducts && consumable.usedProducts.length > 0) {
    const last = consumable.usedProducts[consumable.usedProducts.length - 1];
    await populateParentCategories(last.parentCategoryId);
    await populateSubcategories(last.parentCategoryId, last.subcategoryId);
    await populateProducts(last.parentCategoryId, last.subcategoryId, last.productId);
  }
}

// usedProductsをFirestoreへ反映
async function updateConsumableUsedProducts(consumableId, usedProducts) {
  await updateDoc(doc(db, 'consumables', consumableId), {
    usedProducts: usedProducts
  });
}

// usedProductsテーブル描画


async function renderConsumableProductList(usedProducts, consumableId) {
  const tbody = document.querySelector('#consumableProductList tbody');
  tbody.innerHTML = '';

  // ID→名前変換を**非同期で順次取得**
  for (let idx = 0; idx < usedProducts.length; idx++) {
    const row = usedProducts[idx];
    let parentCategoryName = row.parentCategoryId;
    let subcategoryName = row.subcategoryId;

    // Firestoreからカテゴリ名・サブカテゴリ名を取得
    try {
      const parent = await getParentCategoryById(row.parentCategoryId);
      const sub = await getSubcategoryById(row.subcategoryId);
      if (parent) parentCategoryName = parent.name;
      if (sub) subcategoryName = sub.name;
    } catch (e) {
      // 取得失敗時はIDのまま
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${parentCategoryName}</td>
      <td>${subcategoryName}</td>
      <td>${row.productName}</td>
      <td>${row.quantity}</td>
      <td><button class="remove-consumable-product" data-index="${idx}" data-id="${consumableId}">削除</button></td>
    `;
    tbody.appendChild(tr);
  }
}


// usedProductsに追加
async function addConsumableProductToList(productRow, consumableId) {
  // 最新のusedProductsを取得
  const consumableDoc = await getDoc(doc(db, 'consumables', consumableId));
  const consumable = consumableDoc.data();
  const usedProducts = Array.isArray(consumable.usedProducts) ? [...consumable.usedProducts] : [];
  usedProducts.push(productRow);
  await updateConsumableUsedProducts(consumableId, usedProducts);
  renderConsumableProductList(usedProducts, consumableId);
}

// usedProductsから削除
async function removeConsumableProductFromList(idx, consumableId) {
  const consumableDoc = await getDoc(doc(db, 'consumables', consumableId));
  const consumable = consumableDoc.data();
  const usedProducts = Array.isArray(consumable.usedProducts) ? [...consumable.usedProducts] : [];
  usedProducts.splice(idx, 1);
  await updateConsumableUsedProducts(consumableId, usedProducts);
  renderConsumableProductList(usedProducts, consumableId);
}

// -------------------- DOMイベント --------------------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addConsumableForm').addEventListener('submit', addConsumable);
  displayConsumables();
});

// 「編集」ボタン
document.getElementById('consumableList').addEventListener('click', async (e) => {
  if (e.target.classList.contains('edit-consumable')) {
    const consumableId = e.target.dataset.id;
    const consumableDoc = await getDoc(doc(db, 'consumables', consumableId));
    const consumable = consumableDoc.data();
    await setupConsumableProductEditor(consumableId, consumable);
    document.getElementById('consumableProductsArea').style.display = 'block';

    // 「追加」ボタンに都度リスナーを追加（既存リスナーが重複しないよう注意）
    const addBtn = document.getElementById('addConsumableProductRow');
    addBtn.onclick = async function () {
      const parentCategoryId = document.getElementById('consumableProductParentCategory').value;
      const subcategoryId = document.getElementById('consumableProductSubcategory').value;
      const productId = document.getElementById('consumableProductName').value;
      const quantity = Number(document.getElementById('consumableProductQuantity').value);
      const productName = document.getElementById('consumableProductName').selectedOptions[0]?.textContent || '';

      if (!parentCategoryId || !subcategoryId || !productId || !quantity) {
        alert('全ての項目を入力してください');
        return;
      }
      await addConsumableProductToList({ parentCategoryId, subcategoryId, productId, productName, quantity }, consumableId);
    };
  }
});

// 「削除」ボタン
document.getElementById('consumableProductList').addEventListener('click', async function (e) {
  if (e.target.classList.contains('remove-consumable-product')) {
    const idx = Number(e.target.dataset.index);
    const consumableId = e.target.dataset.id;
    await removeConsumableProductFromList(idx, consumableId);
  }
});
