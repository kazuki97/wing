// barcodeScanner.js

export function startBarcodeScanner() {
  console.log("startBarcodeScanner 関数が呼び出されました"); // デバッグログ
  
  // Html5Qrcode がグローバルに定義されているか確認
  if (!window.Html5Qrcode) {
    console.error("Html5Qrcode is not loaded");
    alert("バーコードスキャナーの起動に失敗しました。ライブラリが正しく読み込まれていません。");
    return;
  }

  const html5QrCode = new window.Html5Qrcode("reader"); // 'reader'はカメラプレビューエリアのID
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 }, 
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true // バーコード検出のための新しい実験的な機能を有効化
    }
  };

  html5QrCode.start(
    { facingMode: { exact: "environment" } }, // 背面カメラを明示的に使用
    config,
    (decodedText, decodedResult) => {
      console.log(`バーコードが検出されました: ${decodedText}`);
      alert(`バーコードが検出されました: ${decodedText}`);
      html5QrCode.stop(); // 必要であれば、検出後にカメラを停止
    },
    (errorMessage) => {
      console.warn(`読み取りエラー: ${errorMessage}`);
    }
  ).catch((err) => {
    console.error(`カメラの起動に失敗しました: ${err}`);
    alert("カメラの起動に失敗しました。ページを再読み込みして、カメラの許可を再確認してください。");
  });
}

document.getElementById("startBarcodeScanButton").addEventListener("click", () => {
  try {
    console.log("startBarcodeScanButton がクリックされました"); // デバッグログ
    startBarcodeScanner();
  } catch (err) {
    console.error("バーコードスキャナーを開始できませんでした:", err);
    alert("バーコードスキャナーの起動に失敗しました。");
  }
});
