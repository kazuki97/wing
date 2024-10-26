// main.js
import './eventListeners.js';
import './salesEventListeners.js'; // 新たに追加
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

        if (window.innerWidth <= 767 && requiresAuth && !isAuthenticated()) {
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
    if (window.innerWidth <= 767) { // モバイル版のみ
      if (isAuthenticated()) {
        const navMenu = document.getElementById('navMenu');
        navMenu.classList.toggle('show');
      } else {
        document.getElementById('loginForm').style.display = 'block';
      }
    }
  });

  // ログインフォームの送信イベント
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const passwordInput = document.getElementById('menuPassword').value;
    if (passwordInput === '4697') {
      authenticateUser();
      document.getElementById('loginForm').style.display = 'none';
      const navMenu = document.getElementById('navMenu');
      navMenu.classList.toggle('show');
    } else {
      alert('パスワードが間違っています。');
    }
  });
});

// 認証状態を管理する変数
let authenticated = false;

function isAuthenticated() {
  return authenticated;
}

function authenticateUser() {
  authenticated = true;
}
