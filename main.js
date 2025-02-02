// main.js
import { auth, db } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import {
  updateAllParentCategorySelects,
  updatePricingParentCategorySelect,
  displayParentCategories,
  displayProducts,
  displayOverallInventory,
  displayInventoryProducts,
  displayTransactions,
  updateConsumableCheckboxes,
  initializeConsumableUsage
} from './eventListeners.js';
import { displayConsumables } from './consumables.js';
import './barcodeScanner.js'; // 追加

document.addEventListener('DOMContentLoaded', () => {
  // すべてのコンテンツセクションを非表示にする
  document.querySelectorAll('.content-section').forEach((section) => {
    section.style.display = 'none';
  });
  // 初期表示はログインしていない状態なので、ログインフォームの CSS で中央に配置される
  
  // スムーズスクロールとセクションの表示制御（ログイン中の場合のみ利用される）
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        const requiresAuth = targetSection.getAttribute('data-requires-auth') === 'true';
        if (requiresAuth && !auth.currentUser) {
          alert('このセクションを表示するにはログインが必要です。');
          return;
        }
        document.querySelectorAll('.content-section').forEach((section) => {
          section.style.display = 'none';
        });
        targetSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.innerWidth <= 767) {
          document.getElementById('navMenu').classList.remove('show');
        }
      }
    });
  });
  
  // ハンバーガーメニューのクリックイベント
  document.getElementById('menuIcon').addEventListener('click', function() {
    if (window.innerWidth <= 767) { // モバイル版のみ
      if (auth.currentUser) {
        const navMenu = document.getElementById('navMenu');
        navMenu.classList.toggle('show');
      } else {
        document.getElementById('loginForm').style.display = 'block';
      }
    }
  });
  
  // ログインフォームの送信イベント
  document.getElementById('loginFormElement').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // ログイン成功時は、ログインフォームは非表示にする
        console.log('ログイン成功:', userCredential.user);
        document.getElementById('loginForm').style.display = 'none';
      })
      .catch((error) => {
        alert('ログインに失敗しました：' + error.message);
      });
  });
});

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('ユーザーがログインしています:', user.email);
    document.getElementById('loginForm').style.display = 'none';
    // Firestore の "users" コレクションからユーザーの役割を取得
    const userDocRef = doc(db, "users", user.uid);
    getDoc(userDocRef)
      .then(docSnap => {
        if (docSnap.exists()) {
          const role = docSnap.data().role;
          console.log("取得したユーザーの役割:", role);
          applyRoleBasedUI(role);
        } else {
          console.warn("ユーザードキュメントが見つかりませんでした。");
          showAuthenticatedContent();
        }
      })
      .catch(error => {
        console.error("ユーザー情報取得エラー:", error);
        showAuthenticatedContent();
      });
    initializeApp();
  } else {
    console.log('ユーザーはログインしていません');
    hideAuthenticatedContent();
    // ログインしていない場合は、ログインフォームのみ中央に表示
    document.getElementById('loginForm').style.display = 'block';
  }
});

// 初期化関数
function initializeApp() {
  updateAllParentCategorySelects();
  updatePricingParentCategorySelect();
  displayParentCategories();
  displayProducts();
  displayOverallInventory();
  displayInventoryProducts();
  displayTransactions(); // 売上管理セクションの取引データ表示
  displayConsumables();    // 消耗品リストの初期表示
  updateConsumableCheckboxes();
  initializeConsumableUsage();
}

// 役割に応じた UI 制御関数
function applyRoleBasedUI(role) {
  if (role === 'barcode') {
    // アルバイトの場合、バーコードセクション以外を非表示
    document.querySelectorAll('.content-section').forEach((section) => {
      if (section.id !== 'barcode') {
        section.style.display = 'none';
      }
    });
    // ナビゲーションのリンクもバーコード関連以外を非表示（ただし、ログアウトボタンは常に表示）
    document.querySelectorAll('nav ul li a').forEach((link) => {
      if (link.textContent.trim() === "ログアウト") {
        link.style.display = 'block';
      } else if (!link.getAttribute('href').includes('#barcode')) {
        link.style.display = 'none';
      }
    });
  } else {
    showAuthenticatedContent();
  }
}

// 認証が必要なセクションの表示
function showAuthenticatedContent() {
  const sections = document.querySelectorAll('[data-requires-auth="true"]');
  sections.forEach((section) => {
    section.style.display = 'block';
  });
  document.querySelectorAll('nav ul li a').forEach((link) => {
    link.style.display = 'block';
  });
}

// 認証が必要なセクションの非表示
function hideAuthenticatedContent() {
  const sections = document.querySelectorAll('[data-requires-auth="true"]');
  sections.forEach((section) => {
    section.style.display = 'none';
  });
}

// ログアウト関数
window.logout = function() {
  signOut(auth)
    .then(() => {
      console.log('ログアウトしました');
      hideAuthenticatedContent();
      document.getElementById('loginForm').style.display = 'block';
    })
    .catch((error) => {
      alert('ログアウトに失敗しました：' + error.message);
    });
};
