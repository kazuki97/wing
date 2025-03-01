// pos.js (修正後)
import { auth, db } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { getParentCategories, getSubcategories, getProducts } from './categoriesAndProducts.js'; // 既存の関数群
import { addTransaction } from './transactions.js';
import { updateProductQuantity } from './inventoryManagement.js';

// -------------------------
// ログイン処理
// -------------------------
document.getElementById('loginButton').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) {
    alert('メールアドレスとパスワードを入力してください。');
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ログイン成功後は onAuthStateChanged で処理される
  } catch (error) {
    alert('ログイン失敗: ' + error.message);
  }
});

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('posMain').style.display = 'block';
  } else {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('posMain').style.display = 'none';
  }
});

// -------------------------
// 画面切り替え関数
// -------------------------
function showScreen(screen) {
  const screens = ['topScreen', 'parentCategoryScreen', 'subCategoryScreen', 'productScreen'];
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === screen) ? 'block' : 'none';
  });
}

// 初期状態はトップ画面を表示
showScreen('topScreen');

// -------------------------
// 親カテゴリ・サブカテゴリ・商品表示
// -------------------------
document.getElementById('orderInputBtn').addEventListener('click', async () => {
  showScreen('parentCategoryScreen');
  try {
    const parents = await getParentCategories();
    renderParentCategories(parents);
  } catch (error) {
    alert('親カテゴリの取得に失敗しました。');
  }
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  alert('売上登録はカゴ画面の「売上登録」ボタンから行ってください。');
});

function renderParentCategories(parents) {
  const container = document.getElementById('parentCategoryContainer');
  container.innerHTML = '';
  parents.forEach(pc => {
    const btn = document.createElement('div');
    btn.className = 'grid-button';
    btn.textContent = pc.name;
    btn.addEventListener('click', async () => {
      showScreen('subCategoryScreen');
      try {
        const subs = await getSubcategories(pc.id);
        renderSubCategories(subs);
      } catch (error) {
        alert('サブカテゴリの取得に失敗しました。');
      }
    });
    container.appendChild(btn);
  });
}

function renderSubCategories(subs) {
  const container = document.getElementById('subCategoryContainer');
  container.innerHTML = '';
  subs.forEach(sc => {
    const btn = document.createElement('div');
    btn.className = 'grid-button';
    btn.textContent = sc.name;
    btn.addEventListener('click', async () => {
      showScreen('productScreen');
      try {
        const products = await getProducts(sc.id); // サブカテゴリフィルター
        renderProducts(products);
      } catch (error) {
        alert('商品の取得に失敗しました。');
      }
    });
    container.appendChild(btn);
  });
}

function renderProducts(products) {
  const container = document.getElementById('productContainer');
  container.innerHTML = '';
  products.forEach(prod => {
    const btn = document.createElement('div');
    btn.className = 'grid-button';
    btn.innerHTML = `<div>${prod.name}</div><div>¥${prod.price}</div>`;
    btn.addEventListener('click', () => {
      let quantity = 1;
      if (prod.priceType === 'weight') {
        const grams = prompt(`${prod.name}の重量(g)を入力してください:`, '100');
        if (!grams) return;
        quantity = parseFloat(grams);
        if (isNaN(quantity) || quantity <= 0) return;
      }
      addToCart({
        productId: prod.id,
        productName: prod.name,
        unitPrice: prod.price,
        quantity: quantity
      });
    });
    container.appendChild(btn);
  });
}

// -------------------------
// カゴ管理
// -------------------------
let cartItems = [];

function addToCart(item) {
  const existing = cartItems.find(x => x.productId === item.productId && x.unitPrice === item.unitPrice);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cartItems.push(item);
  }
  renderCart();
}

// renderCart: 内部でテーブル全体を再描画し、イベントデリゲーションを使用
function renderCart() {
  const cartSection = document.getElementById('cartSection');
  cartSection.style.display = cartItems.length > 0 ? 'block' : 'none';
  const tbody = document.querySelector('#cartTable tbody');
  tbody.innerHTML = '';
  let total = 0;
  cartItems.forEach((item, idx) => {
    const sub = item.unitPrice * item.quantity;
    total += sub;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>¥${item.unitPrice}</td>
      <td>¥${sub}</td>
      <td><button class="remove-btn" data-index="${idx}">削除</button></td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById('cartTotal').textContent = `合計: ¥${total}`;
}

// イベントデリゲーションで削除ボタンの処理
document.querySelector('#cartTable tbody').addEventListener('click', (e) => {
  if (e.target && e.target.matches('button.remove-btn')) {
    const idx = parseInt(e.target.getAttribute('data-index'));
    if (!isNaN(idx)) {
      cartItems.splice(idx, 1);
      renderCart();
    }
  }
});

// -------------------------
// 売上登録処理
// -------------------------
document.getElementById('registerSaleBtn').addEventListener('click', async () => {
  if (cartItems.length === 0) {
    alert('カゴが空です');
    return;
  }
  let totalAmount = 0;
  const itemsForTransaction = cartItems.map(item => {
    const sub = item.unitPrice * item.quantity;
    totalAmount += sub;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: sub
    };
  });

  const transactionData = {
    items: itemsForTransaction,
    totalAmount,
    timestamp: new Date().toISOString()
  };

  try {
    const txId = await addTransaction(transactionData);
    // 在庫更新を並列で実行
    await Promise.all(cartItems.map(item =>
      updateProductQuantity(item.productId, -item.quantity, '売上登録による在庫減少')
    ));
    alert('売上登録が完了しました。取引ID: ' + txId);
    cartItems = [];
    renderCart();
  } catch (error) {
    console.error(error);
    alert('売上登録に失敗しました');
  }
});
