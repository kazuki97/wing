// main.js
console.log("あいうえお - JavaScript 実行確認");

import './eventListeners.js';
import './salesEventListeners.js'; // 新たに追加

// DOMContentLoaded イベントを使用して、DOM の読み込み完了後に実行
document.addEventListener('DOMContentLoaded', () => {
  // ナビゲーションリンクのクリックイベントを設定
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        // すべてのセクションを非表示にする
        document.querySelectorAll('.content-section').forEach((section) => {
          section.style.display = 'none';
        });
        // 対象のセクションを表示する
        targetSection.style.display = 'block';
        // スクロールをトップに戻す
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.error(`セクションが見つかりません: ${targetId}`);
      }
    });
  });

  // 初期表示のセクションを設定（例：ホームセクションを表示）
  const homeSection = document.getElementById('home');
  if (homeSection) {
    // すべてのセクションを非表示にする
    document.querySelectorAll('.content-section').forEach((section) => {
      section.style.display = 'none';
    });
    // ホームセクションを表示する
    homeSection.style.display = 'block';
  } else {
    console.error('ホームセクションが見つかりません');
  }
});
