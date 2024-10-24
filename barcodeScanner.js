// barcodeScanner.js
import { Html5Qrcode } from "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";

export function startBarcodeScanner() {
  const html5QrCode = new Html5Qrcode("reader"); // 'reader'はカメラプレビューエリアのID
  const config = { fps: 10, qrbox: { width: 250, height: 250 } }; // カメラプレビューの設定

  html5QrCode.start(
    { facingMode: "environment" }, // 背面カメラを使用
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
    alert("カメラの起動に失敗しました。");
  });
}

document.getElementById("startBarcodeScanButton").addEventListener("click", startBarcodeScanner);
