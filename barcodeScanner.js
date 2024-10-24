// barcodeScanner.js

import { getProductByBarcode } from './products.js';
import { addToCart, showError } from './salesEventListeners.js';
import { displayInventoryProducts } from './eventListeners.js';

export function startQuaggaScanner() {
  console.log("QuaggaJS スキャナーを開始します");

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#barcode-scanner'),
      constraints: {
        facingMode: "environment",
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        focusMode: "continuous",
      },
    },
    decoder: {
      readers: ["ean_reader"], // EAN-13形式のバーコードのみを読み取る
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4,
    frequency: 10,
  }, function(err) {
    if (err) {
      console.error(err);
      alert("バーコードスキャナーの初期化に失敗しました。");
      return;
    }
    console.log("QuaggaJS の初期化が完了しました。");
    Quagga.start();
  });

  let barcodeDetected = false;

  const onDetected = async function(result) {
    if (barcodeDetected) {
      return;
    }
    barcodeDetected = true;

    const barcode = result.codeResult.code.trim();
    console.log(`スキャンされたバーコード: ${barcode}`);
    alert(`スキャンされたバーコード: ${barcode}`);

    try {
      const product = await getProductByBarcode(barcode);
      if (!product) {
        showError('該当する商品が見つかりません');
        return;
      }
      addToCart(product, true); // スキャンからの追加

      // 在庫管理セクションの表示を更新
      await displayInventoryProducts();
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    } finally {
      Quagga.stop();
      barcodeDetected = false; // 再スキャンを可能にするためにリセット
    }
  };

  Quagga.onDetected(onDetected);

  Quagga.onProcessed(function(result) {
    // 必要に応じて処理を追加
  });
}

document.getElementById("startBarcodeScanButton").addEventListener("click", () => {
  try {
    console.log("startBarcodeScanButton がクリックされました");
    startQuaggaScanner();
  } catch (err) {
    console.error("バーコードスキャナーを開始できませんでした:", err);
    alert("バーコードスキャナーの起動に失敗しました。");
  }
});
