// errorHandling.js

/**
 * エラーモーダルを表示する関数
 * @param {string} message - 表示するエラーメッセージ
 */
export function showErrorModal(message) {
    const errorModal = document.createElement('div');
    errorModal.className = 'error-modal';

    errorModal.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h3>エラー</h3>
                <p>${message}</p>
            </div>
        </div>
    `;

    document.body.appendChild(errorModal);

    const modal = errorModal.querySelector('.modal');
    const closeButton = errorModal.querySelector('.close-button');

    modal.style.display = 'block';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(errorModal);
    });
}

// テスト用のログ（正常に読み込まれているか確認）
console.log('errorHandling.js が正しく読み込まれました。');
