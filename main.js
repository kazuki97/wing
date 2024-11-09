// main.js
import { auth } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import { updateAllParentCategorySelects, updatePricingParentCategorySelect, displayParentCategories, displayProducts, displayOverallInventory, displayInventoryProducts, updateConsumableCheckboxes } from './eventListeners.js';
import { displayTransactions } from './salesEventListeners.js';
import { displayConsumables, initializeConsumableUsage } from './consumables.js';
import './barcodeScanner.js'; // 追加

document.addEventListener('DOMContentLoaded', () => {
  // 初期表示のセクションを設定
  let defaultSectionId = '#home'; // PC版ではホームセクションを表示
  if (window.innerWidth <= 767) {
    defaultSectionId = '#barcode'; // スマホ版ではバーコードスキャンセクションを表示
  }
  document.querySelectorAll('.content-section').forEach((section) => {
    section.style.display = 'none';
  });
  document.querySelector(defaultSectionId).style.display = 'block';

  // スムーズスクロールとセクションの表示制御
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        const requiresAuth = targetSection.getAttribute('data-requires-auth') === 'true';

        if (window.innerWidth <= 767 && requiresAuth && !auth.currentUser) {
          alert('このセクションを表示するにはログインが必要です。');
          return;
        }

        // 全てのセクションを非表示にする
        document.querySelectorAll('.content-section').forEach((section) => {
          section.style.display = 'none';
        });
        // 対象のセクションを表示する
        targetSection.style.display = 'block';
        // スクロールをトップに戻す
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // モバイル表示の場合、メニューを閉じる
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
        // ログイン成功
        console.log('ログイン成功:', userCredential.user);
        document.getElementById('loginForm').style.display = 'none';
        const navMenu = document.getElementById('navMenu');
        navMenu.classList.toggle('show');
        showAuthenticatedContent();

        // 初期化関数を呼び出す
        initializeApp();
      })
      .catch((error) => {
        alert('ログインに失敗しました：' + error.message);
      });
  });
});

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    // ユーザーがログインしている
    console.log('ユーザーがログインしています:', user.email);
    document.getElementById('loginForm').style.display = 'none';
    showAuthenticatedContent();

    // 初期化関数を呼び出す
    initializeApp();
  } else {
    // ユーザーがログインしていない
    console.log('ユーザーはログインしていません');
    hideAuthenticatedContent();
    document.getElementById('loginForm').style.display = 'block';
  }
});

// 初期化関数の定義
function initializeApp() {
  updateAllParentCategorySelects();
  updatePricingParentCategorySelect();
  displayParentCategories();
  displayProducts();
  displayOverallInventory();
  displayInventoryProducts();
  displayTransactions(); // 売上管理セクションの取引データ表示
  displayConsumables(); // 消耗品リストの初期表示
  updateConsumableCheckboxes(); // 消耗品選択リストのチェックボックスを更新
  initializeConsumableUsage(); // 消耗品使用量の初期化
}

// 認証が必要なセクションを表示する関数
function showAuthenticatedContent() {
  const sections = document.querySelectorAll('[data-requires-auth="true"]');
  sections.forEach((section) => {
    section.style.display = 'block';
  });
}

// 認証が必要なセクションを非表示にする関数
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
      // ログアウト成功
      console.log('ログアウトしました');
      hideAuthenticatedContent();
      document.getElementById('loginForm').style.display = 'block';
    })
    .catch((error) => {
      alert('ログアウトに失敗しました：' + error.message);
    });
};
