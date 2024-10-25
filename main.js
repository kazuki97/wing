// main.js
import './eventListeners.js';
import './salesEventListeners.js';
import './barcodeScanner.js';

// スムーズスクロールとセクションの表示制御
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const targetSection = document.querySelector(targetId);

    if (targetSection) {
      // 認証が必要なセクションかどうかを確認
      const requiresAuth = targetSection.getAttribute('data-requires-auth') === 'true';

      if (requiresAuth && !isAuthenticated()) {
        alert('このセクションを表示するにはパスワードが必要です。');
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
  if (isAuthenticated()) {
    // 認証済みならメニューを表示/非表示
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('show');
  } else {
    // ログインフォームを表示
    document.getElementById('loginForm').style.display = 'block';
  }
});

// ログインフォームの送信イベント
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const passwordInput = document.getElementById('menuPassword').value;
  if (passwordInput === '4697') {
    // パスワードが正しい場合
    authenticateUser();
    document.getElementById('loginForm').style.display = 'none';
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('show');
  } else {
    alert('パスワードが間違っています。');
  }
});

// 認証状態を管理する変数
let authenticated = false;

function isAuthenticated() {
  return authenticated;
}

function authenticateUser() {
  authenticated = true;
}
