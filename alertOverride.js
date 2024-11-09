// alertOverride.js

(function() {
  const originalAlert = window.alert;
  window.alert = function(message) {
    // 抑制したいメッセージを指定
    const suppressedMessages = [
      'この操作を行うにはログインが必要です。'
      // 他に抑制したいメッセージがあれば、ここに追加
    ];

    if (!suppressedMessages.includes(message)) {
      originalAlert(message);
    } else {
      console.warn(`Alert suppressed: ${message}`);
    }
  };
})();
