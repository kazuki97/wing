// pos.js
import { auth, db } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { 
  getParentCategories, 
  getSubcategories, 
  getProducts 
} from './categoriesAndProducts.js'; // 既存の関数群（適宜名前を合わせてください）
import { addTransaction } from './transactions.js';
import { updateProductQuantity } from './inventoryManagement.js';

// ログイン処理
document.getElementById('loginButton').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ログイン成功後は自動的に onAuthStateChanged で処理される
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

// 画面切り替えのための関数
function showScreen(screen) {
  const screens = ['topScreen', 'parentCategoryScreen', 'subCategoryScreen', 'productScreen'];
  screens.forEach(s => {
    document.getElementById(s).style.display = (s === screen) ? 'block' : 'none';
  });
}

// 初期状態はトップ画面表示
showScreen('topScreen');

// イベントリスナー: 「注文入力」ボタン
document.getElementById('orderInputBtn').addEventListener('click', async () => {
  showScreen('parentCategoryScreen');
  const parents = await getParentCategories();
  renderParentCategories(parents);
});

// イベントリスナー: 「会計」ボタン（トップ画面の会計ボタン）
document.getElementById('checkoutBtn').addEventListener('click', () => {
  alert('売上登録はカゴ画面の「売上登録」ボタンから行ってください。');
});

// カテゴリ、サブカテゴリ、商品を表示する関数
function renderParentCategories(parents) {
  const container = document.getElementById('parentCategoryContainer');
  container.innerHTML = '';
  parents.forEach(pc => {
    const btn = document.createElement('div');
    btn.className = 'grid-button';
    btn.textContent = pc.name;
    btn.addEventListener('click', async () => {
      showScreen('subCategoryScreen');
      const subs = await getSubcategories(pc.id);
      renderSubCategories(subs);
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
      const products = await getProducts(sc.id); // サブカテゴリでフィルター
      renderProducts(products);
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
      // 重量入力が必要なら、ここで表示。シンプルな例としてprompt()を使用
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

// カゴ管理
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

function renderCart() {
  // カゴが空でなければ表示
  document.getElementById('cartSection').style.display = cartItems.length > 0 ? 'block' : 'none';
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
      <td><button data-index="${idx}">削除</button></td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById('cartTotal').textContent = `合計: ¥${total}`;

  // 削除ボタンイベント
  tbody.querySelectorAll('button').forEach(btn => {
    const idx = parseInt(btn.dataset.index);
    btn.addEventListener('click', () => {
      cartItems.splice(idx, 1);
      renderCart();
    });
  });
}

// 売上登録ボタンの処理
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
    // 在庫を更新する処理（各商品の在庫からカゴの数量分を減算）
    for (const item of cartItems) {
      await updateProductQuantity(item.productId, -item.quantity, '売上登録による在庫減少');
    }
    alert('売上登録が完了しました。取引ID: ' + txId);
    cartItems = [];
    renderCart();
  } catch (error) {
    console.error(error);
    alert('売上登録に失敗しました');
  }
});
