# かおかくしカメラ

## 起動（ES Module と WASM を使うため http(s) 配信が必須。file:// では顔検出が動きません）
    cd kao-camera
    ./fetch-assets.sh              # 任意。実行すると vendor/ に保存され、以後は外部通信なしで検出
    python3 -m http.server 8000    # PCで確認。スマホは同一Wi-FiのPC IP、または HTTPS ホスティング(GitHub Pages等)で開く

## 顔検出
- MediaPipe Tasks Vision `@mediapipe/tasks-vision@0.10.14`（Apache-2.0）+ BlazeFace short-range float16/1（約230KB, sha256 b4578f35…0152f）
- 読み込み順: `./vendor/` → jsDelivr + storage.googleapis.com → ブラウザ標準 FaceDetector（あれば補助）
- `vendor/` が無い場合、初回のみライブラリとモデルを取得するため通信が必要。**写真は送信されず、推論は端末内（WASM/CPU）**
- 小さい顔のため 全体+2×2+3×3 分割で検出して統合。大きな横向き・遠景の小顔・マスク等は見落とす可能性あり

## 構成
index.html（画面） / app.js（操作・描画・保存） / detector.js（顔検出） / core.js（座標・履歴などの純粋関数） / tests.mjs（`node tests.mjs`）

## 保存仕様
全体を長辺最大3000pxで再描画し、JPEG品質0.92。表示のズーム・移動は保存範囲に影響しません。選択枠は含みません。
