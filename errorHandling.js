// errorHandling.js
/**
 * エラーモーダルを表示する関数
 * @param {string} message - 表示するエラーメッセージ
 */
export function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const closeErrorModal = document.getElementById('closeErrorModal');

    if (errorModal && errorMessage && closeErrorModal) {
        errorMessage.textContent = message;
        errorModal.style.display = 'block';

        closeErrorModal.onclick = () => {
            errorModal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === errorModal) {
                errorModal.style.display = 'none';
            }
        };
    } else {
        console.error('エラーモーダルの要素が見つかりません。');
    }
}
