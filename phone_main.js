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
import { getPaymentMethods } from './paymentMethods.js'; // ←冒頭で追加が必要
import { fetchCustomers, getCustomerById } from './customers.js';





// --- グローバル変数 ---
let phoneCart = [];
let selectedParentCategory = null;
let selectedSubcategory = null;
const productTileMap = new Map();
let selectedCustomer = null;


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

  // サブカテゴリごとに必要数量を集計
  const qtyBySubcat = {};
  for (const item of phoneCart) {
    const size = item.product.size || 1;
    const requiredQuantity = size * item.quantity;
    const subcatId = item.product.subcategoryId;
    qtyBySubcat[subcatId] = (qtyBySubcat[subcatId] || 0) + requiredQuantity;
    totalQuantity += item.quantity;
  }

  // サブカテゴリごとに単価を一度だけ取得
  const priceBySubcat = {};
  for (const [subcatId, reqQty] of Object.entries(qtyBySubcat)) {
    // 同じサブカテゴリの最初のアイテムから basePrice を取る
      const priceBySubcat = {};
  for (const [subcatId, reqQty] of Object.entries(qtyBySubcat)) {
    const basePrice = phoneCart.find(item => item.product.subcategoryId === subcatId)
                             .product.price;
    let finalUnitPrice = await getUnitPrice(subcatId, reqQty, basePrice);

    // 特別単価がある場合は上書き
    if (selectedCustomer?.pricingRules?.length) {
      const matchedRule = selectedCustomer.pricingRules.find(rule => {
        return rule.subcategoryId === subcatId &&
               reqQty >= rule.minQuantity &&
               reqQty <= rule.maxQuantity;
      });
      if (matchedRule) {
        console.log(`【かごボタン】特別単価適用: サブカテゴリ ${subcatId} → ¥${matchedRule.unitPrice}`);
        finalUnitPrice = matchedRule.unitPrice;
      }
    }

    priceBySubcat[subcatId] = finalUnitPrice;
    totalPrice += finalUnitPrice * reqQty;
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

  // ① サブカテゴリごとに必要数量を集計
  const qtyBySubcat = {};
  phoneCart.forEach(item => {
    const size = item.product.size || 1;
    const requiredQuantity = size * item.quantity;
    const subcatId = item.product.subcategoryId;
    qtyBySubcat[subcatId] = (qtyBySubcat[subcatId] || 0) + requiredQuantity;
  });

  // ② サブカテゴリごとに単価を一度だけ取得
  const priceBySubcat = {};
for (const [subcatId, reqQty] of Object.entries(qtyBySubcat)) {
  const sampleItem = phoneCart.find(item => item.product.subcategoryId === subcatId);
  const basePrice = sampleItem.product.price;

  // デフォルト単価（通常単価）
  let finalUnitPrice = await getUnitPrice(subcatId, reqQty, basePrice);

  // 顧客が選択されていて、特別単価ルールがある場合に上書き
  if (selectedCustomer?.pricingRules?.length) {
    const matchedRule = selectedCustomer.pricingRules.find(rule => {
      return rule.subcategoryId === subcatId &&
             reqQty >= rule.minQuantity &&
             reqQty <= rule.maxQuantity;
    });
    if (matchedRule) {
      console.log(`特別単価適用: サブカテゴリ ${subcatId} に ¥${matchedRule.unitPrice}`);
      finalUnitPrice = matchedRule.unitPrice;
    }
  }

  priceBySubcat[subcatId] = finalUnitPrice;
}


  // ③ 各行に同じサブカテゴリの単価を適用してUIを構築
  for (const item of phoneCart) {
    const size = item.product.size || 1;
    const requiredQuantity = size * item.quantity;
    const unitPrice = priceBySubcat[item.product.subcategoryId];
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

    // 金額表示（単価×数量×サイズ）
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

  // 割引額を反映して合計金額を表示
  const discountAmount = parseFloat(
    document.getElementById('discountAmount').value
  ) || 0;
  const finalTotal = total - discountAmount;
  document.getElementById('cart-total').textContent = `合計: ¥${finalTotal.toLocaleString()}`;

  // ビュー用ボタンも更新
  await updateViewCartButton();
}


// -------------------------
// 商品追加関数（特別単価対応 / 非同期処理）
// -------------------------
async function addProductToCart(product) {
  console.log("【iPhone版】追加される商品オブジェクト:", product);
  const existing = phoneCart.find(item => item.product.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    let customPrice = product.price; // デフォルトは通常単価

    // 特別単価が適用可能かチェック（顧客が選択されていて、ルールがある場合）
    if (selectedCustomer && Array.isArray(selectedCustomer.pricingRules)) {
      const rules = selectedCustomer.pricingRules;

      const size = product.size || 1;
      const requiredQuantity = size * 1; // 初回追加時の数量

      // この商品のサブカテゴリに対応する特別単価ルールを取得
      const matchedRule = rules.find(rule => {
        return rule.subcategoryId === product.subcategoryId &&
               requiredQuantity >= rule.minQuantity &&
               requiredQuantity <= rule.maxQuantity;
      });

      if (matchedRule) {
        console.log('適用される特別単価:', matchedRule.unitPrice);
        customPrice = matchedRule.unitPrice;
      }
    }

    // 商品オブジェクトに特別単価をセット（あくまで見かけ上）
    const productWithCustomPrice = {
      ...product,
      price: customPrice
    };

    phoneCart.push({ product: productWithCustomPrice, quantity: 1 });
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
// phone_main.js
// 売上登録処理（サブカテゴリ合計量で単価を一度だけ取得）
document.getElementById('btn-checkout').addEventListener('click', async () => {
  if (phoneCart.length === 0) {
    alert('カゴに商品がありません');
    return;
  }

  const saleDate = document.getElementById('saleDate').value;
  if (!saleDate) {
    alert('販売日を入力してください');
    return;
  }
  const saleTimestamp = new Date(saleDate + "T00:00");

  const salesMethod = document.getElementById('salesMethodSelect').value;
  if (!salesMethod) {
    alert('販売方法を選択してください');
    return;
  }

  const paymentMethodId = document.getElementById('paymentMethodSelect').value;
  if (!paymentMethodId) {
    alert('支払方法を選択してください');
    return;
  }

  // 支払い方法を取得
  const paymentMethods = await getPaymentMethods();
  const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
  if (!paymentMethod) {
    alert('支払い方法が見つかりません');
    return;
  }

  // ─── ① サブカテゴリごとに必要数量を集計 ─────────────────
  const qtyBySubcat = {};
  phoneCart.forEach(item => {
    const size = item.product.size || 1;
    const reqQty = size * item.quantity;
    const subcatId = item.product.subcategoryId;
    qtyBySubcat[subcatId] = (qtyBySubcat[subcatId] || 0) + reqQty;
  });

  // ─── ② 一度だけ getUnitPrice を呼び出して単価を保持 ────────
  const unitPriceBySubcat = {};
  for (const [subcatId, totalReqQty] of Object.entries(qtyBySubcat)) {
    const sampleItem = phoneCart.find(item => item.product.subcategoryId === subcatId);
    const basePrice  = sampleItem.product.price;
    unitPriceBySubcat[subcatId] = await getUnitPrice(subcatId, totalReqQty, basePrice);
  }

  // ─── ③ 各アイテムを再計算し、合計金額・items を構築 ───────
  let totalAmount = 0;
  let totalCost   = 0;
  const items     = [];

  for (const item of phoneCart) {
    const product = item.product;
    const quantity = item.quantity;
    const size     = product.size || 1;
    const requiredQuantity = size * quantity;
    const unitPrice = unitPriceBySubcat[product.subcategoryId];
    const subtotal  = unitPrice * requiredQuantity;
    totalAmount    += subtotal;
    const cost     = product.cost * requiredQuantity;
    totalCost      += cost;

    items.push({
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unitPrice: unitPrice,
      cost: cost,
      subtotal: subtotal,
      profit: subtotal - cost,
      size: size,
      subcategoryId: product.subcategoryId,
    });
  }

  // 送料計算（変更なし）
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

  // 手数料計算（変更なし）
  const feeRate   = paymentMethod.feeRate || 0;
  const feeAmount = Math.round((totalAmount - discountAmount) * feeRate / 100);

  const displayedSales   = totalAmount - discountAmount;
  const profitCalculated = displayedSales - totalCost - feeAmount - shippingFee;

  // Firestore に渡す transactionData（変更なし）
  const transactionData = {
  timestamp: saleTimestamp.toISOString(),
  totalAmount: displayedSales,
  totalCost: totalCost,
  feeAmount: feeAmount,
  paymentMethodId: paymentMethodId,
  paymentMethodName: paymentMethod.name,
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
  netAmount: displayedSales - feeAmount,

  // ✅ 顧客情報を追加（PC版で表示させるため）
  customerId: selectedCustomer?.id || null,
  customerName: selectedCustomer?.name || '一般',
};


  // 在庫更新（変更なし）
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
// --- 修正後 ---
// 割引額の入力欄にイベントリスナーを追加して即時反映
document.addEventListener('DOMContentLoaded', async () => {
  const customerSelect = document.getElementById('customerSelect');
  if (customerSelect) {
    customerSelect.innerHTML = '<option value="">（一般）</option>';
    const customers = await fetchCustomers();
    customers.forEach(cust => {
      const option = document.createElement('option');
      option.value = cust.id;
      option.textContent = cust.name;
      customerSelect.appendChild(option);
    });

    // 顧客選択変更時に顧客情報を保持
    customerSelect.addEventListener('change', async (e) => {
      const customerId = e.target.value;
      if (!customerId) {
        selectedCustomer = null;
        console.log('一般客モード');
        return;
      }
      selectedCustomer = await getCustomerById(customerId);
      console.log('選択された顧客情報:', selectedCustomer);
    });
  }

  // ★ ここを追加：割引額が変更されたら即座にボタン金額も再計算
  const discountInput = document.getElementById('discountAmount');
  if (discountInput) {
    discountInput.addEventListener('input', () => {
      updateViewCartButton();
    });
  }
});
