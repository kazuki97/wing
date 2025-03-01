// phone_main.js - iPhone用UIのロジック（ES6 モジュール形式）

import { getProducts } from './products.js';
import { addTransaction } from './transactions.js';
import { auth } from './db.js';

// --- カート状態管理 ---
let phoneCart = [];

/**
 * カゴ表示を更新する関数
 */
function updatePhoneCartUI() {
  const cartItemsDiv = document.getElementById('cart-items');
  cartItemsDiv.innerHTML = '';
  let total = 0;
  phoneCart.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.innerHTML = `<span>${item.product.name} x ${item.quantity}</span>
                         <span>¥${item.product.price * item.quantity}</span>`;
    cartItemsDiv.appendChild(itemDiv);
    total += item.product.price * item.quantity;
  });
  document.getElementById('cart-total').textContent = `合計: ¥${total}`;
}

/**
 * 商品をカゴに追加する関数
 * 既にカゴに存在する場合は数量を加算する
 */
function addProductToCart(product) {
  const existing = phoneCart.find(item => item.product.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    phoneCart.push({ product, quantity: 1 });
  }
  updatePhoneCartUI();
}

/**
 * 商品タイルを動的に生成して表示する関数
 */
async function renderProductTiles() {
  try {
    // getProducts は、すべての商品を返すものとする（フィルタ無し）
    const products = await getProducts();
    const productTilesDiv = document.getElementById('product-tiles');
    productTilesDiv.innerHTML = '';
    products.forEach(product => {
      const tile = document.createElement('div');
      tile.className = 'product-tile';
      tile.textContent = product.name;
      // タイルをタップしたらカゴに追加
      tile.addEventListener('click', () => {
        addProductToCart(product);
      });
      productTilesDiv.appendChild(tile);
    });
  } catch (error) {
    console.error('Error loading products:', error);
    alert('商品の読み込みに失敗しました');
  }
}

/**
 * 会計処理（チェックアウト）を実行する関数  
 * カゴの内容から取引データを作成し、共通の取引登録ロジック（addTransaction）を呼び出す
 */
async function processCheckout() {
  if (phoneCart.length === 0) {
    alert('カゴに商品がありません');
    return;
  }
  
  // 取引データの作成
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
  
  const transactionData = {
    items,
    totalAmount,
    totalCost,
    profit: totalAmount - totalCost,
    paymentMethodId: "",  // ※ 支払い方法の選択機能が必要なら追加してください
    timestamp: new Date().toISOString(),
    feeAmount: 0,
    netAmount: totalAmount,
    manuallyAdded: false,
  };
  
  try {
    const transactionId = await addTransaction(transactionData);
    alert('販売が完了しました。取引ID: ' + transactionId);
    // カゴをクリアする
    phoneCart = [];
    updatePhoneCartUI();
  } catch (error) {
    console.error('Checkout failed:', error);
    alert('販売処理に失敗しました');
  }
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
  // 商品タイルを表示
  renderProductTiles();
  
  // 会計ボタンのイベントリスナーを設定
  const checkoutBtn = document.getElementById('checkout');
  checkoutBtn.addEventListener('click', processCheckout);
});
