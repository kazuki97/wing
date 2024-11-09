// authCheck.js

import { auth } from './db.js'; // authをインポート

// アラート表示を制御するフラグ
let alertDisplayed = false;

// 認証チェック関数
export function checkAuth() {
  const user = auth.currentUser;
  if (!user) {
    if (!alertDisplayed) {
      alert('この操作を行うにはログインが必要です。');
      alertDisplayed = true;
    }
    return false;
  }
  return true;
}

// アラート表示フラグをリセットする関数
export function resetAlertFlag() {
  alertDisplayed = false;
}
