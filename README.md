# NOVA WARD

トップダウンスペースシューター。

敵の波を撃ち落とし、マルチショット・シールド・スピード・ライフのパワーアップを拾ってハイスコアを狙え。

## 機能

- 敵ウェーブ（Scout / Drone / Bruiser）
- 自動射撃 + マズルフラッシュ
- パワーアップ: Multi / Shield / Speed / Life
- ライフ・スコア・コンボ・ウェーブ表示
- ハイスコアボード（ブラウザ localStorage）
- 一時停止メニュー
- パララックス・スターフィールド
- キーボード（WASD / 矢印）とマウス・タッチ操作

## 遊び方（Mac）

```bash
git clone https://github.com/rinmon/nova-ward.git
cd nova-ward

# どれか一つ
open index.html
npx --yes serve .
python3 -m http.server 8080
```

ブラウザで開き、**出撃** を押す。

| 操作 | 内容 |
| --- | --- |
| WASD / 矢印 | 移動 |
| マウス / タッチ | 機体を追従 |
| 自動 | 射撃 |
| P / Esc | 一時停止 |

## 構成

```
index.html
css/style.css
js/
  main.js         # UI・ループ
  engine.js       # 描画レイヤー
  engine-core.js  # シミュレーション本体
  input.js        # 入力
  audio.js        # SFX
  scores.js       # ハイスコア
```

依存パッケージなし。ES modules の静的サイトです。

## ライセンス

MIT
