// barcodeScanner.js

import { getProductByBarcode } from './products.js';
import { addToCart, showError } from './salesEventListeners.js';
import { displayInventoryProducts } from './eventListeners.js';

export function startQuaggaScanner() {
  console.log("QuaggaJS スキャナーを開始します"); // デバッグログ

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#barcode-scanner'), // ビデオフィードを表示する要素
      constraints: {
        facingMode: "environment" // 背面カメラを使用
      },
    },
    decoder: {
      readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "code_39_vin_reader", "codabar_reader", "upc_reader", "upc_e_reader", "i2of5_reader"],
    },
    locate: true, // バーコードの位置を特定
  }, function(err) {
    if (err) {
      console.error(err);
      alert("バーコードスキャナーの初期化に失敗しました。");
      return;
    }
    console.log("QuaggaJS の初期化が完了しました。");
    Quagga.start();
  });

  // バーコードが既に検出されたかを追跡するフラグ
  let barcodeDetected = false;

  const onDetected = async function(result) {
    if (barcodeDetected) {
      return;
    }
    barcodeDetected = true;

    const barcode = result.codeResult.code;
    console.log(`スキャンされたバーコード: ${barcode}`);

    try {
      const product = await getProductByBarcode(barcode);
      if (!product) {
        showError('該当する商品が見つかりません');
        return;
      }
      addToCart(product, true); // 第二引数に true を渡して、数量を増やさない

      // 在庫管理セクションの表示を更新
      await displayInventoryProducts(); // 在庫管理セクションを再描画
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    } finally {
      Quagga.stop();
      Quagga.offDetected(onDetected); // リスナーを解除
    }
  };

  Quagga.onDetected(onDetected);

  Quagga.onProcessed(function(result) {
    // 関数の内容
  });
}

document.getElementById("startBarcodeScanButton").addEventListener("click", () => {
  try {
    console.log("startBarcodeScanButton がクリックされました"); // デバッグログ
    startQuaggaScanner();
  } catch (err) {
    console.error("バーコードスキャナーを開始できませんでした:", err);
    alert("バーコードスキャナーの起動に失敗しました。");
  }
});
