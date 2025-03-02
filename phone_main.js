// phone_main.js - iPhone用エアレジ風UIのロジック（ログイン機能追加版、ES6 モジュール形式）

import { getParentCategories, getSubcategories } from './categories.js';
import { getProducts } from './products.js';
import { addTransaction } from './transactions.js';
import { auth } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

// --- グローバル変数 ---
let phoneCart = [];
let selectedParentCategory = null;
let selectedSubcategory = null;
// 各商品タイルの参照を保持するMap
const productTileMap = new Map();

/**
 * タイル表示を更新する関数
 * 商品がカートに入っていれば、タイルに「数量」と「合計金額」を表示する
 * @param {Object} product - 商品情報
 * @param {HTMLElement} tile - 対象のタイル要素
 */
function updateTileDisplay(product, tile) {
  const cartItem = phoneCart.find(item => item.product.id === product.id);
  if (cartItem) {
    // 例: 「商品名」+ 改行 + 「2点 ¥2000」
    tile.innerHTML = `${product.name}<br><span>${cartItem.quantity}点 ¥${(product.price * cartItem.quantity).toLocaleString()}</span>`;
  } else {
    tile.textContent = product.name;
  }
}

/**
 * 画面切替用の関数
 * 全ての .screen を非表示にし、指定したIDの画面を表示する
 */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// --- ログイン処理 ---
// ログインフォームの表示・非表示を制御（index_phone.html に追加済み）
const loginFormDiv = document.getElementById('loginForm');
const loginFormElement = document.getElementById('loginFormElement');

// ログインフォーム送信時の処理
loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ログイン成功時はログインフォームを非表示
    loginFormDiv.style.display = 'none';
    showScreen('screen-home');
  } catch (error) {
    alert('ログインに失敗しました: ' + error.message);
  }
});

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginFormDiv.style.display = 'none';
    showScreen('screen-home');
  } else {
    loginFormDiv.style.display = 'flex';
  }
});

// --- ホーム画面 ---
document.getElementById('btn-sales-registration').addEventListener('click', () => {
  showScreen('screen-parent');
  loadParentCategories();
});

// --- 親カテゴリ選択画面 ---
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

// --- サブカテゴリ選択画面 ---
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

// --- 商品選択画面 ---
async function loadProducts(subcatId) {
  try {
    const products = await getProducts(null, subcatId);
    const container = document.getElementById('product-tiles');
    container.innerHTML = '';
    // 初期化：Mapをクリア
    productTileMap.clear();
    products.forEach(product => {
      const tile = document.createElement('div');
      tile.className = 'product-tile';
      // 初回は、カゴに入っているかどうかを確認して表示を更新
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

// --- カゴ（売上登録）画面 ---
// カゴへの商品追加処理
function addProductToCart(product) {
  const existing = phoneCart.find(item => item.product.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    phoneCart.push({ product, quantity: 1 });
  }
  // 対応するタイルの表示を更新
  const tile = productTileMap.get(product.id);
  if (tile) {
    updateTileDisplay(product, tile);
  }
  updateCartUI();
}

// カゴUI更新関数
function updateCartUI() {
  const cartItemsDiv = document.getElementById('cart-items');
  cartItemsDiv.innerHTML = '';
  let total = 0;
  phoneCart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<span>${item.product.name} x ${item.quantity}</span>
                     <span>¥${item.product.price * item.quantity}</span>`;
    cartItemsDiv.appendChild(div);
    total += item.product.price * item.quantity;
  });
  document.getElementById('cart-total').textContent = `合計: ¥${total}`;
}

document.getElementById('btn-go-checkout').addEventListener('click', () => {
  showScreen('screen-checkout');
  updateCartUI();
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

// --- 売上登録処理 ---
document.getElementById('btn-checkout').addEventListener('click', async () => {
  if (phoneCart.length === 0) {
    alert('カゴに商品がありません');
    return;
  }
  
  let totalAmount = 0;
  let totalCost = 0;
  let items = [];
  phoneCart.forEach(item => {
    const { product, quantity } = item;
    totalAmount += product.price * quantity;
    totalCost += product.cost * quantity;
    items.push({
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      unitPrice: product.price,
      cost: product.cost,
      subtotal: product.price * quantity,
      profit: (product.price - product.cost) * quantity,
      size: product.size || 1
    });
  });
  
  // 入力項目の取得
  const saleDate = document.getElementById('saleDate').value;
  if (!saleDate) {
    alert('販売日を入力してください');
    return;
  }
  
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
  
  // 売上登録のための取引データ作成
  const transactionData = {
    items,
    totalAmount: totalAmount - discountAmount,
    totalCost,
    profit: (totalAmount - totalCost - discountAmount) - shippingFee,
    paymentMethodId: "", // 今回は支払い方法入力は不要
    timestamp: new Date(saleDate).toISOString(),
    feeAmount: 0,
    netAmount: totalAmount - discountAmount,
    discount: {
      amount: discountAmount,
      reason: discountReason
    },
    shippingMethod: shippingMethod,
    shippingFee: shippingFee,
    manuallyAdded: false,
  };
  
  try {
    const transactionId = await addTransaction(transactionData);
    alert('売上登録が完了しました。取引ID: ' + transactionId);
    // カゴをクリアし、ホーム画面へ戻る
    phoneCart = [];
    updateCartUI();
    showScreen('screen-home');
  } catch (error) {
    console.error('売上登録処理に失敗:', error);
    alert('売上登録に失敗しました');
  }
});

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
  // 初回はログインフォームが表示される状態（認証状態の監視によりホーム画面へ遷移）
});
