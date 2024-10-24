// barcodeScanner.js
import Quagga from "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.2.6/dist/quagga.min.js";

export function startBarcodeScanner(onDetected) {
Quagga.init({
  inputStream: {
    type: "LiveStream",
    constraints: {
      facingMode: "environment", // 背面カメラを使用
    },
  },
  decoder: {
    readers: ["code_128_reader"], // 一つのバーコードリーダーに限定して設定
  },
}, function (err) {
  if (err) {
    console.error(err);
    alert("カメラの初期化に失敗しました。");
    return;
  }
  console.log("Quagga初期化完了");
  Quagga.start();
});

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
