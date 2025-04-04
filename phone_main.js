// phone_main.js - iPhone用エアレジ風UIのロジック（ログイン機能・消耗品管理含む）

import { getParentCategories, getSubcategories } from './categories.js';
import { getProducts, updateProduct } from './products.js';
import { addTransaction } from './transactions.js';
import { updateOverallInventory } from './inventoryManagement.js';
import { getUnitPrice } from './pricing.js';
import { auth } from './db.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { getConsumables } from './consumables.js'; // 消耗品取得用
import { updatePaymentMethodSelect } from './eventListeners.js'; // PC版と同様の支払方法更新関数

// --- グローバル変数 ---
let phoneCart = [];
let selectedParentCategory = null;
let selectedSubcategory = null;
const productTileMap = new Map();

// -------------------------
// 画面切替用関数
// 売上登録プロセス（screen-parent, screen-subcategory, screen-product, screen-checkout）の場合は固定のかごボタンを表示
// -------------------------
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  const salesScreens = ['screen-parent', 'screen-subcategory', 'screen-product', 'screen-checkout'];
  const fixedCart = document.getElementById('fixed-cart-button');
  if (salesScreens.includes(screenId)) {
    fixedCart.style.display = 'block';
  } else {
    fixedCart.style.display = 'none';
  }
  // チェックアウト画面に遷移する際、支払方法のドロップダウンを更新する
  if (screenId === 'screen-checkout') {
    updatePaymentMethodSelect();
  }
}

// -------------------------
// 「かごを見る」ボタン更新関数（非同期処理に対応）
// カート内の合計数量と合計金額（getUnitPrice を用いて計算）を表示する
// -------------------------
async function updateViewCartButton() {
  let totalQuantity = 0;
  let totalPrice = 0;
  for (const item of phoneCart) {
    const size = item.product.size || 1;
    const requiredQuantity = size * item.quantity;
    const unitPrice = await getUnitPrice(item.product.subcategoryId, requiredQuantity, item.product.price);
    totalQuantity += item.quantity;
    totalPrice += unitPrice * requiredQuantity;
  }
  const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
  const finalPrice = totalPrice - discountAmount;
  const btn = document.getElementById('btn-go-checkout');
  if (totalQuantity > 0) {
    btn.textContent = `${totalQuantity}点 ¥${finalPrice.toLocaleString()}`;
  } else {
    btn.textContent = 'カゴを見る';
  }
}

// -------------------------
// カゴ内更新関数（非同期処理に対応）
// -------------------------
async function updateCartUI() {
  const cartItemsDiv = document.getElementById('cart-items');
  cartItemsDiv.innerHTML = '';
  let total = 0;
  
  // サブカテゴリごとの合計数量（重量）を計算
const subcategoryTotals = {};
phoneCart.forEach((item) => {
  const subcatId = item.product.subcategoryId;
  const size = item.product.size || 1;
  const requiredQuantity = size * item.quantity;
  if (!subcategoryTotals[subcatId]) {
    subcategoryTotals[subcatId] = 0;
  }
  subcategoryTotals[subcatId] += requiredQuantity;
});
  
// 各アイテム表示時は、該当サブカテゴリ全体の合計数量を利用して単価を計算
for (const item of phoneCart) {
  const size = item.product.size || 1;
  const requiredQuantity = size * item.quantity;
  // 該当サブカテゴリ全体の合計数量を取得
  const totalQuantity = subcategoryTotals[item.product.subcategoryId];
  // product.price を数値に変換。無効な場合は 0 を設定
  const basePrice = Number(item.product.price);
  const validPrice = isNaN(basePrice) || basePrice <= 0 ? 0 : basePrice;
  const unitPrice = await getUnitPrice(item.product.subcategoryId, totalQuantity, validPrice);
  const itemTotal = unitPrice * requiredQuantity;
  total += itemTotal;
    
  const div = document.createElement('div');
  div.className = 'cart-item';
    
  // 商品名表示
  const nameSpan = document.createElement('span');
  nameSpan.textContent = item.product.name;
  div.appendChild(nameSpan);
    
  // 数量入力フィールド
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.min = 1;
  quantityInput.value = item.quantity;
  quantityInput.style.width = '60px';
  quantityInput.addEventListener('change', async (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity) || newQuantity < 1) {
      e.target.value = item.quantity;
      return;
    }
    item.quantity = newQuantity;
    await updateCartUI();
  });
  div.appendChild(quantityInput);
    
  // 金額表示（単価×数量×サイズ、getUnitPrice の結果を反映）
  const priceSpan = document.createElement('span');
  priceSpan.textContent = `¥${itemTotal.toLocaleString()} (単価: ¥${unitPrice.toLocaleString()})`;
  div.appendChild(priceSpan);
    
  // 削除ボタン
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '削除';
  deleteButton.className = 'btn-delete';
  deleteButton.dataset.id = item.product.id;
  deleteButton.addEventListener('click', (e) => {
    const productId = e.target.dataset.id;
    removeFromCart(productId);
  });
  div.appendChild(deleteButton);
    
  cartItemsDiv.appendChild(div);
}
  
// ★ 割引額を反映して合計金額を表示 ★
const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
const finalTotal = total - discountAmount;
document.getElementById('cart-total').textContent = `合計: ¥${finalTotal.toLocaleString()}`;
await updateViewCartButton();
}

// -------------------------
// 商品追加関数（非同期処理に対応）
// -------------------------
async function addProductToCart(product) {
  const existing = phoneCart.find(item => item.product.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    phoneCart.push({ product, quantity: 1 });
  }
  await updateCartUI();
}

async function removeFromCart(productId) {
  phoneCart = phoneCart.filter(item => item.product.id !== productId);
  await updateCartUI();
}

// -------------------------
// 商品タイル表示（商品名のみ）
// -------------------------
function updateTileDisplay(product, tile) {
  tile.textContent = product.name;
}

// -------------------------
// ログイン処理
// -------------------------
const loginFormDiv = document.getElementById('loginForm');
const loginFormElement = document.getElementById('loginFormElement');

loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginFormDiv.style.display = 'none';
    document.getElementById('btn-logout').style.display = 'block';
    // 支払方法のドロップダウンを更新
    updatePaymentMethodSelect();
    showScreen('screen-home');
  } catch (error) {
    alert('ログインに失敗しました: ' + error.message);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginFormDiv.style.display = 'none';
    document.getElementById('btn-logout').style.display = 'block';
    // 支払方法の更新（認証後に一度更新）
    updatePaymentMethodSelect();
    showScreen('screen-home');
  } else {
    loginFormDiv.style.display = 'flex';
    document.getElementById('btn-logout').style.display = 'none';
  }
});

// -------------------------
// ログアウト処理
// -------------------------
document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await signOut(auth);
    loginFormDiv.style.display = 'flex';
    document.getElementById('btn-logout').style.display = 'none';
    showScreen('screen-home');
  } catch (error) {
    alert('ログアウトに失敗しました: ' + error.message);
  }
});

// -------------------------
// ホーム画面
// -------------------------
document.getElementById('btn-sales-registration').addEventListener('click', () => {
  showScreen('screen-parent');
  loadParentCategories();
});
document.getElementById('btn-consumables').addEventListener('click', () => {
  showScreen('screen-consumables');
  loadConsumables();
});

// -------------------------
// 親カテゴリ選択画面
// -------------------------
async function loadParentCategories() {
  try {
    const parentCategories = await getParentCategories();
    const container = document.getElementById('parent-category-list');
    container.innerHTML = '';
    parentCategories.forEach(category => {
      const btn = document.createElement('button');
      btn.textContent = category.name;
      btn.addEventListener('click', () => {
        selectedParentCategory = category;
        showScreen('screen-subcategory');
        loadSubcategories(category.id);
      });
      container.appendChild(btn);
    });
  } catch (error) {
    console.error('親カテゴリの読み込みに失敗:', error);
    alert('親カテゴリの読み込みに失敗しました');
  }
}

document.getElementById('btn-back-home').addEventListener('click', () => {
  showScreen('screen-home');
});

// -------------------------
// サブカテゴリ選択画面
// -------------------------
async function loadSubcategories(parentId) {
  try {
    const subcategories = await getSubcategories(parentId);
    const container = document.getElementById('subcategory-list');
    container.innerHTML = '';
    subcategories.forEach(subcat => {
      const btn = document.createElement('button');
      btn.textContent = subcat.name;
      btn.addEventListener('click', () => {
        selectedSubcategory = subcat;
        showScreen('screen-product');
        loadProducts(subcat.id);
      });
      container.appendChild(btn);
    });
  } catch (error) {
    console.error('サブカテゴリの読み込みに失敗:', error);
    alert('サブカテゴリの読み込みに失敗しました');
  }
}

document.getElementById('btn-back-parent').addEventListener('click', () => {
  showScreen('screen-parent');
});

// -------------------------
// 商品選択画面
// -------------------------
async function loadProducts(subcatId) {
  try {
    const products = await getProducts(null, subcatId);
    const container = document.getElementById('product-tiles');
    container.innerHTML = '';
    productTileMap.clear();
    products.forEach(product => {
      const tile = document.createElement('div');
      tile.className = 'product-tile';
      updateTileDisplay(product, tile);
      tile.addEventListener('click', () => {
        addProductToCart(product);
      });
      container.appendChild(tile);
      productTileMap.set(product.id, tile);
    });
  } catch (error) {
    console.error('商品の読み込みに失敗:', error);
    alert('商品の読み込みに失敗しました');
  }
}

document.getElementById('btn-back-subcategory').addEventListener('click', () => {
  showScreen('screen-subcategory');
});

// -------------------------
// カゴ（売上登録）画面
// -------------------------
document.getElementById('btn-go-checkout').addEventListener('click', async () => {
  showScreen('screen-checkout');
  await updateCartUI();
});

document.getElementById('btn-back-product').addEventListener('click', () => {
  showScreen('screen-product');
});

// 発送方法選択で送料入力欄の表示切替
document.getElementById('shippingMethodSelect').addEventListener('change', function() {
  const feeContainer = document.getElementById('shippingFeeInputContainer');
  if (this.value === 'ヤマト運輸') {
    feeContainer.style.display = 'block';
  } else {
    feeContainer.style.display = 'none';
  }
});

// -------------------------
// 売上登録処理
// -------------------------
document.getElementById('btn-checkout').addEventListener('click', async () => {
  if (phoneCart.length === 0) {
    alert('カゴに商品がありません');
    return;
  }
  
  let totalAmount = 0;
  let totalCost = 0;
  let items = [];
  
  // ★ サブカテゴリごとの合計数量（重量）を計算 ★
  const subcategoryTotals = {};
  phoneCart.forEach((item) => {
    const subcatId = item.product.subcategoryId;
    const size = item.product.size || 1;
    const requiredQuantity = size * item.quantity;
    if (!subcategoryTotals[subcatId]) {
      subcategoryTotals[subcatId] = 0;
    }
    subcategoryTotals[subcatId] += requiredQuantity;
  });
  
  // 各カート商品の計算（サブカテゴリ全体の合計数量をもとに単価を取得）
  // ※ 万一 product.price が数値として無効な場合、defaultPrice を使用する
  const defaultPrice = 1000; // ※ 適切なデフォルト単価に変更してください
  for (const item of phoneCart) {
    const product = item.product;
    const quantity = item.quantity;
    const size = product.size || 1;
    const requiredQuantity = size * quantity;
    
    // 該当サブカテゴリ ID のチェック
    const subcatId = product.subcategoryId;
    if (!subcatId) {
      console.error("product.subcategoryId is missing for product:", product);
      continue; // サブカテゴリ ID がない商品はスキップ
    }
    
    // サブカテゴリ全体の合計数量を取得
    const totalQuantity = subcategoryTotals[subcatId];
    
    // product.price を数値に変換、無効な場合は defaultPrice を利用
    const basePrice = Number(product.price);
    const validPrice = (!isNaN(basePrice) && basePrice > 0) ? basePrice : defaultPrice;
    
    const unitPrice = await getUnitPrice(subcatId, totalQuantity, validPrice);
    const subtotal = unitPrice * requiredQuantity;
    totalAmount += subtotal;
    const cost = product.cost * requiredQuantity;
    totalCost += cost;
    items.push({
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unitPrice: unitPrice,
      cost: cost,
      subtotal: subtotal,
      profit: subtotal - cost,
      size: size,
      subcategoryId: subcatId,
    });
  }
  
  const saleDate = document.getElementById('saleDate').value;
  if (!saleDate) {
    alert('販売日を入力してください');
    return;
  }
  const saleTimestamp = new Date(saleDate + "T00:00");
  
  // --- 販売方法と支払方法の選択 ---
  const salesMethod = document.getElementById('salesMethodSelect').value;
  if (!salesMethod) {
    alert('販売方法を選択してください');
    return;
  }
  
  const paymentMethod = document.getElementById('paymentMethodSelect').value;
  if (!paymentMethod) {
    alert('支払方法を選択してください');
    return;
  }
  // -------------------------------
  
  const shippingMethod = document.getElementById('shippingMethodSelect').value;
  let shippingFee = 0;
  if (shippingMethod === 'クリックポスト') {
    shippingFee = 185;
  } else if (shippingMethod === 'ゆうパケットポスト') {
    shippingFee = 200;
  } else if (shippingMethod === 'ヤマト運輸') {
    shippingFee = parseFloat(document.getElementById('shippingFeeInput').value) || 0;
  }
  
  const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
  const discountReason = document.getElementById('discountReason').value;
  
  const feeAmount = 0;
  // 売上は、各商品の合計金額から割引額を引いた値として計算
  const displayedSales = totalAmount - discountAmount;
  // 利益は「売上 － 原価 － 手数料 － 送料」で計算
  const profitCalculated = displayedSales - totalCost - feeAmount - shippingFee;
  
  const transactionData = {
    timestamp: saleTimestamp.toISOString(),
    totalAmount: displayedSales,  // 売上は割引適用後の値
    totalCost: totalCost,
    feeAmount: feeAmount,
    paymentMethodId: paymentMethod,
    salesMethod: salesMethod,
    shippingMethod: shippingMethod,
    shippingFee: shippingFee,
    items: items,
    manuallyAdded: false,
    cost: totalCost,
    profit: profitCalculated,
    discount: {
      amount: discountAmount,
      reason: discountReason,
    },
  };
  
  // 在庫更新（各商品の在庫の減少および全体在庫の更新）
  for (const item of phoneCart) {
    const product = item.product;
    const quantity = item.quantity;
    const size = product.size || 1;
    const requiredQuantity = size * quantity;
    await updateProduct(product.id, { quantity: product.quantity - quantity });
    await updateOverallInventory(product.subcategoryId, -requiredQuantity);
  }
  
  try {
    const transactionId = await addTransaction(transactionData);
    alert('売上登録が完了しました。取引ID: ' + transactionId);
    phoneCart = [];
    await updateCartUI();
    showScreen('screen-home');
  } catch (error) {
    console.error('売上登録処理に失敗:', error);
    alert('売上登録に失敗しました');
  }
});



// -------------------------
// 消耗品管理
// -------------------------
document.getElementById('btn-back-from-consumables').addEventListener('click', () => {
  showScreen('screen-home');
});

async function loadConsumables() {
  try {
    const consumables = await getConsumables();
    const tbody = document.querySelector('#consumableList table tbody');
    tbody.innerHTML = '';
    consumables.forEach(consumable => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${consumable.name}</td>
        <td>¥${consumable.cost}</td>
        <td>
          <button class="edit-consumable" data-id="${consumable.id}">編集</button>
          <button class="delete-consumable" data-id="${consumable.id}">削除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    // 編集、削除のイベントリスナーの追加
    document.querySelectorAll('.edit-consumable').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const consumableId = e.target.dataset.id;
        await openEditConsumableModal(consumableId);
      });
    });
    document.querySelectorAll('.delete-consumable').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const consumableId = e.target.dataset.id;
        if (confirm('本当に削除しますか？')) {
          await deleteConsumable(consumableId);
          alert('消耗品が削除されました');
          await loadConsumables();
        }
      });
    });
  } catch (error) {
    console.error('消耗品の読み込みに失敗:', error);
    alert('消耗品の読み込みに失敗しました');
  }
}

// -------------------------
// 消耗品使用量編集用モーダル
// -------------------------
document.getElementById('closeEditConsumableUsageModal').addEventListener('click', () => {
  document.getElementById('editConsumableUsageModal').style.display = 'none';
});

document.getElementById('editConsumableUsageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usageId = document.getElementById('editConsumableUsageId').value;
  const consumableId = document.getElementById('editConsumableSelect').value;
  const quantityUsed = parseFloat(document.getElementById('editQuantityUsed').value);
  const usageTimestamp = document.getElementById('editUsageTimestamp').value;
  
  try {
    await updateConsumableUsage(usageId, {
      consumableId,
      quantityUsed,
      timestamp: new Date(usageTimestamp).toISOString()
    });
    alert('消耗品使用量が更新されました');
    document.getElementById('editConsumableUsageModal').style.display = 'none';
    loadConsumables();
  } catch (error) {
    console.error('消耗品使用量の更新に失敗:', error);
    alert('消耗品使用量の更新に失敗しました');
  }
});

// -------------------------
// 以下、PC版と同様のその他のイベントリスナー（取引編集・在庫管理など）
// ※ 以下、割愛せず全体が続く部分となりますが、今回は支払方法の不具合解消が主な修正箇所なので
// PC版と同様のロジックは eventListeners.js 側にあるため、ここでの変更は支払い方法の更新処理の追加に留めています。

// -------------------------
// 初期化処理
// -------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 初回はログインフォームが表示され、認証状態の監視によりホーム画面へ遷移
});
