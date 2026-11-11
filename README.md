# かおかくしカメラ

## 起動
ES Module と WASM を使うため **http(s) で配信** してください（`file://` では顔検出は動きません）。

    cd kao-camera
    ./fetch-assets.sh              # 任意（下記）
    python3 -m http.server 8000    # PCで確認。スマホで使うには HTTPS 配信（GitHub Pages 等）が必要

## 通信について（vendor の有無で違います）
| | vendor/ を置く場合 | vendor/ なし（既定の納品状態） |
|---|---|---|
| ライブラリ・モデル | 自分のサーバーから配信（`./vendor/`） | 実行時に jsDelivr（`@mediapipe/tasks-vision@0.10.14`）と storage.googleapis.com（BlazeFace）から取得 |
| 顔検出用ファイルの通信 | 不要（自サーバーのみ） | 必要な場合があります。2回目以降はブラウザの通常キャッシュに残ることがありますが、**保証はしません** |
| 写真 | 端末内で処理。送信しません | 同左 |

- **vendor ファイルは今回の納品に含まれていません**（作成環境が外部ダウンロード不可のため）。含める場合は、通信できる環境で `./fetch-assets.sh` を実行してください（SHA-256 検証付き）。
- **オフライン動作は保証しません**（Service Worker 等は未実装）。会場の電波が弱い場合は、事前に vendor を配置した自前ホスティングを推奨します。
- 取得に失敗した場合、ブラウザ標準 FaceDetector があればそれを使い、なければ「もう一度試す」と手動追加を案内します。

## 顔検出
MediaPipe Tasks Vision 0.10.14（Apache-2.0）+ BlazeFace short-range float16/1（約230KB, sha256 `b4578f35…0152f`）、WASM/CPU。
全体+2×2+3×3分割で小さい顔も検出。横向き・遠景の小顔・マスク等は見落とす可能性があります。**保存前に必ず目視確認してください。**

## 構成
index.html / app.js（操作・描画・保存） / detector.js / core.js（座標・履歴・非同期の世代管理） / tests.mjs / fetch-assets.sh

## テスト
    node tests.mjs        # Node.js 18+

## 保存仕様
長辺最大3000pxで、編集画面と同じ関数 render() で描画。JPEG 品質0.92。表示ズームは保存範囲に影響せず、選択枠は含みません。
