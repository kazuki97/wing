// main.js
import './eventListeners.js';
import './salesEventListeners.js'; // 新たに追加

// スムーズスクロールとセクションの表示制御
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      // 全てのセクションを非表示にする
      document.querySelectorAll('.content-section').forEach((section) => {
        section.style.display = 'none';
      });
      // 対象のセクションを表示する
      targetSection.style.display = 'block';
      // スクロールをトップに戻す
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});
