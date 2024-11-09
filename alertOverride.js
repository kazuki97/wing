// alertOverride.js

(function() {
  const originalAlert = window.alert;
  window.alert = function(message) {
    const suppressKeywords = ['ログインが必要です'];

    const shouldSuppress = suppressKeywords.some(keyword => message.includes(keyword));

    if (!shouldSuppress) {
      originalAlert(message);
    } else {
      console.warn(`Alert suppressed: ${message}`);
    }
  };
})();
