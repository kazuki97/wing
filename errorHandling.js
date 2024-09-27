// errorHandling.js

/**
 * モーダルのイベントリスナーを初期化する関数
 */
function initializeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    const closeErrorModal = document.getElementById('closeErrorModal');

    if (errorModal && closeErrorModal) {
        // 閉じるボタンのイベントリスナーを一度だけ設定
        if (!closeErrorModal.dataset.listenerAdded) {
            closeErrorModal.addEventListener('click', () => {
                errorModal.style.display = 'none';
            });
            closeErrorModal.dataset.listenerAdded = 'true';
        }

        // モーダルの外側をクリックした場合のイベントリスナーを一度だけ設定
        if (!window.dataset.modalListenerAdded) {
            window.addEventListener('click', (event) => {
                if (event.target === errorModal) {
                    errorModal.style.display = 'none';
                }
            });
            window.dataset.modalListenerAdded = 'true';
        }
    } else {
        console.error('エラーモーダルの要素が見つかりません。');
    }
}

/**
 * エラーモーダルを表示する関数
 * @param {string} message - 表示するエラーメッセージ
 */
export function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');

    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        errorModal.style.display = 'block';
    } else {
        console.error('エラーモーダルの要素が見つかりません。');
    }
}

// DOMContentLoaded イベントでモーダルのイベントリスナーを初期化
document.addEventListener('DOMContentLoaded', initializeErrorModal);
