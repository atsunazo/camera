#!/bin/sh
# 自前配置用: ライブラリとモデルを ./vendor に保存（これ以降は外部通信なしで検出可能）
set -e
V=0.10.14; C=https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@$V
M=https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
SHA=b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f
cd "$(dirname "$0")"; mkdir -p vendor/wasm
curl -fL "$C/vision_bundle.mjs" -o vendor/vision_bundle.js   # .mjs はMIME誤設定を避け .js で保存
for f in vision_wasm_internal.js vision_wasm_internal.wasm vision_wasm_nosimd_internal.js vision_wasm_nosimd_internal.wasm; do
  curl -fL "$C/wasm/$f" -o "vendor/wasm/$f"; done
curl -fL "$M" -o vendor/blaze_face_short_range.tflite
echo "$SHA  vendor/blaze_face_short_range.tflite" | (sha256sum -c - 2>/dev/null || shasum -a 256 -c -)
echo "OK: vendor/ を配置しました。 python3 -m http.server 8000 で起動できます"
