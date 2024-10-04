// errorHandling.js
let listenersAdded = false;

/**
 * エラーメッセージを表示するモーダルを表示する関数
 * @param {string} message - 表示するエラーメッセージ
 */
export function showErrorModal(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorModal = document.getElementById('errorModal');
    const closeErrorModalButton = document.getElementById('closeErrorModal');

    if (errorMessage && errorModal && closeErrorModalButton) {
        // エラーメッセージを設定
        errorMessage.textContent = message;
        // モーダルを表示
        errorModal.style.display = 'block';

        // 閉じるボタンのクリックイベントを設定
        closeErrorModalButton.onclick = () => {
            errorModal.style.display = 'none';
        };

        // モーダルの外側をクリックした場合に閉じるイベントを一度だけ設定
        if (!listenersAdded) {
            window.onclick = (event) => {
                if (event.target === errorModal) {
                    errorModal.style.display = 'none';
                }
            };

            // キーボード操作でエスケープキーを押した場合にモーダルを閉じる
            window.onkeydown = (event) => {
                if (event.key === 'Escape') {
                    errorModal.style.display = 'none';
                }
            };

            listenersAdded = true;
        }
    } else {
        // 必要な要素が見つからない場合はアラートで表示
        alert(message);
    }
}
