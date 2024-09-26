// errorHandling.js
export function showErrorModal(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorModal = document.getElementById('errorModal');
    const closeErrorModalButton = document.getElementById('closeErrorModal');

    if (errorMessage && errorModal && closeErrorModalButton) {
        errorMessage.textContent = message;
        errorModal.style.display = 'block';

        closeErrorModalButton.onclick = () => {
            errorModal.style.display = 'none';
        };
    } else {
        alert(message);
    }
}
