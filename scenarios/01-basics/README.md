# 01-basics: 基本シナリオ

k6の基本的な機能と使い方を学ぶためのシナリオ集です。

## 📚 シナリオ一覧

### 01-simple-http.js - 最もシンプルなHTTPリクエスト

k6の最も基本的な使い方を示すスクリプトです。

**学べること:**

- k6スクリプトの基本構造
- `export const options` でのテスト設定
- `export default function` でのメインロジック
- HTTPリクエストの送信
- `sleep()` による待機

**実行方法:**

```bash
k6 run scenarios/01-basics/01-simple-http.js
```

**設定:**

- Virtual Users: 1
- イテレーション回数: 10回

---

### 02-http-methods.js - HTTPメソッドのテスト

RESTful APIの基本的なCRUD操作をテストします。

**学べること:**

- GET, POST, PUT, DELETEの各HTTPメソッド
- リクエストボディの送信
- HTTPヘッダーの設定
- JSONペイロードの扱い方

**実行方法:**

```bash
k6 run scenarios/01-basics/02-http-methods.js
```

**テストするエンドポイント:**

- `GET /api/users` - ユーザー一覧取得
- `POST /api/users` - ユーザー作成
- `PUT /api/users/:id` - ユーザー更新
- `DELETE /api/users/:id` - ユーザー削除

---

### 03-checks.js - レスポンスの検証

k6の`check()`機能を使用して、レスポンスが期待通りかを検証します。

**学べること:**

- `check()` による検証の書き方
- ステータスコードの確認
- レスポンスタイムの検証
- JSONボディの内容検証
- 複数の検証条件の定義

**実行方法:**

```bash
k6 run scenarios/01-basics/03-checks.js
```

**ポイント:**

- checkが失敗してもテストは継続される
- 失敗率は`checks`メトリクスとして記録される
- サマリーで成功率が表示される

---

### 04-thresholds.js - 閾値設定

テストの合格基準を定義し、CI/CDパイプラインで使用できるようにします。

**学べること:**

- 閾値（Thresholds）の設定方法
- パーセンタイル（p95, p99）の指定
- 成功率・失敗率の条件設定
- CI/CDでの自動判定

**実行方法:**

```bash
k6 run scenarios/01-basics/04-thresholds.js
```

**設定している閾値:**

- HTTPリクエスト失敗率: 5%未満
- レスポンスタイム（p95）: 500ms未満
- レスポンスタイム（p99）: 1000ms未満
- レスポンスタイム（平均）: 300ms未満
- Check成功率: 90%以上
- イテレーション回数: 最低100回

**終了コード:**

- `0`: すべての閾値をクリア（成功）
- 非`0`: いずれかの閾値を超過（失敗）

---

### 05-variables.js - 環境変数・設定の外部化

異なる環境（開発、ステージング、本番）で同じスクリプトを使用できるように、設定を外部化します。

**学べること:**

- 環境変数の使用方法（`__ENV`）
- デフォルト値の設定
- コマンドライン引数による設定の上書き
- 環境ごとの設定切り替え

**実行方法:**

デフォルト設定で実行:

```bash
k6 run scenarios/01-basics/05-variables.js
```

カスタム設定で実行:

```bash
BASE_URL=http://staging-api.example.com VUS=10 DURATION=1m \
  k6 run scenarios/01-basics/05-variables.js
```

Docker環境で実行:

```bash
docker run --rm -i --network=host \
  -e BASE_URL=http://localhost:3000 \
  grafana/k6 run - < scenarios/01-basics/05-variables.js
```

**使用できる環境変数:**

- `BASE_URL`: APIのベースURL（デフォルト: `http://localhost:3000`）
- `VUS`: Virtual Users数（デフォルト: `3`）
- `DURATION`: テスト実行時間（デフォルト: `20s`）

---

## 🎯 推奨学習順序

1. **01-simple-http.js** → k6の基本を理解
2. **02-http-methods.js** → HTTPメソッドの使い方を習得
3. **03-checks.js** → レスポンス検証の方法を学ぶ
4. **04-thresholds.js** → 合格基準の設定を理解
5. **05-variables.js** → 実践的な設定管理を学ぶ

## 📊 メトリクスの見方

k6実行後に表示される主要なメトリクス:

- **http_req_duration**: HTTPリクエストの所要時間
  - `avg`: 平均
  - `min`: 最小値
  - `max`: 最大値
  - `p(90)`, `p(95)`, `p(99)`: パーセンタイル

- **http_req_failed**: HTTPリクエストの失敗率
- **http_reqs**: 総リクエスト数
- **iterations**: イテレーション完了回数
- **vus**: Virtual Users数
- **checks**: 検証の成功率

## 🔧 トラブルシューティング

### モックサーバーに接続できない

```bash
# モックサーバーが起動しているか確認
docker ps | grep k6

# 起動していない場合
docker compose up -d

# ヘルスチェック
curl http://localhost:3000/health
```

### k6がインストールされていない

macOS:

```bash
brew install k6
```

Linux:

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Windows:

```powershell
choco install k6
```

または、Dockerを使用:

```bash
docker run --rm -i --network=host grafana/k6 run - < scenarios/01-basics/01-simple-http.js
```
