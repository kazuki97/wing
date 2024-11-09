// alertOverride.js

(function() {
  const originalAlert = window.alert;
  window.alert = function(message) {
    const suppressedMessages = [
      'この操作を行うにはログインが必要です。',
      '親カテゴリを取得するにはログインが必要です。',
      '親カテゴリを表示するにはログインが必要です。',
      '商品を表示するにはログインが必要です。',
      '取引を表示するにはログインが必要です。',
      '消耗品を表示するにはログインが必要です。',
      '消耗品リストを取得するにはログインが必要です。',
      'アプリケーションを利用するにはログインが必要です。'
      // 他に抑制したいメッセージがあれば、ここに追加
    ];

    if (!suppressedMessages.includes(message)) {
      originalAlert(message);
    } else {
      console.warn(`Alert suppressed: ${message}`);
    }
  };
})();
