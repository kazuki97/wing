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

  Quagga.onDetected(async function(result) {
    const barcode = result.codeResult.code;
    console.log(`スキャンされたバーコード: ${barcode}`);

    try {
      const product = await getProductByBarcode(barcode);
      if (!product) {
        showError('該当する商品が見つかりません');
        return;
      }
      addToCart(product);

      // 在庫管理セクションの表示を更新
      await displayInventoryProducts(); // 在庫管理セクションを再描画
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    }

    Quagga.stop(); // 必要に応じてスキャナーを停止
  });

  Quagga.onProcessed(function(result) {
    const drawingCtx = Quagga.canvas.ctx.overlay,
          drawingCanvas = Quagga.canvas.dom.overlay;

    if (result) {
      if (result.boxes) {
        drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
        result.boxes.filter(function (box) {
          return box !== result.box;
        }).forEach(function (box) {
          Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
        });
      }

      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
      }

      if (result.codeResult && result.codeResult.code) {
        Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
      }
    }
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
