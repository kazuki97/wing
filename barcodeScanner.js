// barcodeScanner.js
import Quagga from "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.2.6/dist/quagga.min.js";

export function startBarcodeScanner(onDetected) {
Quagga.init(
  {
    inputStream: {
      type: "LiveStream",
      constraints: {
        facingMode: "environment", // 背面カメラを使用
        width: { ideal: 1280 }, // 解像度を指定
        height: { ideal: 720 }  // 解像度を指定
      },
      area: { // スキャンエリア設定（必要に応じて調整）
        top: "0%", 
        right: "0%", 
        left: "0%", 
        bottom: "0%"
      }
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader"] // 読み取るバーコードの種類
    },
  },
  function (err) {
    if (err) {
      console.error("QuaggaJS の初期化エラー:", err);
      alert("カメラの初期化に失敗しました。カメラのアクセス許可を確認してください。");
      return;
    }
    Quagga.start();
  }
);

 Quagga.onDetected(function (data) {
  if (data && data.codeResult && data.codeResult.code) {
    const code = data.codeResult.code;
    console.log("バーコードが検出されました:", code);
    onDetected(code);
    Quagga.stop();
  } else {
    console.warn("バーコードの検出に失敗しました。");
  }
});

Quagga.onProcessed(function (result) {
  if (result) {
    console.log("Quaggaが処理しました:", result);
  }
});
