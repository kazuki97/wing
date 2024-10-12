// barcodeScanner.js
import Quagga from "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.2.6/dist/quagga.min.js";

export function startBarcodeScanner(onDetected) {
  Quagga.init(
    {
      inputStream: {
        type: "LiveStream",
        constraints: {
          facingMode: "environment",
        },
        area: {
          top: "0%",    // スキャンエリアの上部位置
          right: "0%",  // スキャンエリアの右端
          left: "0%",   // スキャンエリアの左端
          bottom: "0%", // スキャンエリアの下部位置
        },
      },
      decoder: {
        readers: ["ean_reader", "code_128_reader"],
      },
    },
    function (err) {
      if (err) {
        console.error("QuaggaJS の初期化エラー:", err);
        return;
      }
      Quagga.start();
    }
  );

  Quagga.onDetected(function (data) {
    const code = data.codeResult.code;
    onDetected(code);
    Quagga.stop();
  });
}
