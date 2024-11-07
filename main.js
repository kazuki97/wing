// main.js
import { auth } from './db.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import './eventListeners.js';
import './salesEventListeners.js'; // 新たに追加
import './barcodeScanner.js'; // 追加

document.addEventListener('DOMContentLoaded', () => {
  // 初期表示のセクションを設定（変更なし）
  // ...（省略）...

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
  } else {
    // ユーザーがログインしていない
    console.log('ユーザーはログインしていません');
    hideAuthenticatedContent();
    document.getElementById('loginForm').style.display = 'block';
  }
});

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
function logout() {
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
}
