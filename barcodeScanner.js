// barcodeScanner.js

import { getProductByBarcode } from './products.js';
import { addToCart, showError, showMessage } from './salesEventListeners.js';
import { displayInventoryProducts } from './eventListeners.js';
import { auth } from './db.js'; // authをインポート

let scannerIsRunning = false; // スキャナーの状態を追跡

export function startQuaggaScanner() {
  if (scannerIsRunning) {
    return; // 既にスキャナーが動作中の場合は何もしない
  }

  // ユーザーが認証されているか確認
  const user = auth.currentUser;
  if (!user) {
    alert('バーコードスキャナーを使用するにはログインが必要です。');
    return;
  }

  console.log("QuaggaJS スキャナーを開始します");
  scannerIsRunning = true; // スキャナーが動作中であることを設定

  // onDetected 関数を定義
  const onDetected = async function(result) {
    const barcode = result.codeResult.code.trim();
    console.log(`スキャンされたバーコード: ${barcode}`);
    showMessage(`バーコード ${barcode} が追加されました`);

    try {
      const product = await getProductByBarcode(barcode);
      if (!product) {
        showError('該当する商品が見つかりません');
        return;
      }
      addToCart(product); // スキャンからの追加

      // 在庫管理セクションの表示を更新
      await displayInventoryProducts();
    } catch (error) {
      console.error(error);
      showError('商品の取得に失敗しました');
    } finally {
      Quagga.stop();
      Quagga.offDetected(onDetected); // イベントリスナーを解除
      scannerIsRunning = false; // スキャナーの状態をリセット
    }
  };

  // QuaggaJS の初期化
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
      showError("バーコードスキャナーの初期化に失敗しました。");
      scannerIsRunning = false; // エラー時にリセット
      return;
    }
    console.log("QuaggaJS の初期化が完了しました。");
    Quagga.start();

    // onDetected リスナーを登録
    Quagga.onDetected(onDetected);
  });
}

document.getElementById("startBarcodeScanButton").addEventListener("click", () => {
  try {
    console.log("startBarcodeScanButton がクリックされました");
    startQuaggaScanner();
  } catch (err) {
    console.error("バーコードスキャナーを開始できませんでした:", err);
    showError("バーコードスキャナーの起動に失敗しました。");
  }
});
