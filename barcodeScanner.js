// barcodeScanner.js
import { findProductByBarcode } from './productSearch.js';
import { showErrorModal } from './errorHandling.js';

/**
 * Quagga.jsを使用してバーコードスキャンを初期化する関数
 */
export function initializeQuagga() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        showErrorModal('カメラがサポートされていないブラウザです。');
        return;
    }

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#barcode-scanner'), // スキャン用のDOM要素
            constraints: {
                facingMode: "environment" // 背面カメラを使用
            },
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader"] // 読み取るバーコードの種類
        },
    }, function(err) {
        if (err) {
            console.error(err);
            showErrorModal('バーコードスキャンの初期化に失敗しました。');
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(handleBarcodeDetected);
}

/**
 * バーコードが検出されたときの処理
 * @param {Object} result - Quagga.jsからの検出結果
 */
function handleBarcodeDetected(result) {
    const code = result.codeResult.code;
    console.log('バーコード検出:', code);

    // 商品を検索し、結果に基づいてアラートを表示
    findProductByBarcode(code).then(product => {
        if (product) {
            alert(`商品名: ${product.name}\n数量: ${product.quantity}`);
            // 必要に応じてUIを更新
        } else {
            alert('該当する商品が見つかりませんでした。');
        }
    }).catch(error => {
        console.error('商品検索エラー:', error);
        showErrorModal('商品検索中にエラーが発生しました。');
    });
}
