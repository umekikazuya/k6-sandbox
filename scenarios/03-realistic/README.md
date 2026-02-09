# 03-realistic: 実践的なシナリオ

実務で頻繁に遭遇するパターンを再現した、実践的な負荷テストシナリオ集です。

## 📚 シナリオ一覧

### 01-authentication.js - JWT認証フロー

**目的:** JWT認証を使用したAPIの負荷テスト

**フロー:**

1. ログインしてトークンを取得
2. トークンを使って認証APIにアクセス
3. 無効なトークンでのエラーハンドリング

**学べること:**

- 認証トークンの取得と使用
- レスポンスからデータを抽出
- `group()` による論理的なグルーピング
- タグ付けによるメトリクス分類

**実行方法:**

```bash
k6 run scenarios/03-realistic/01-authentication.js
```

**応用:**

- トークンの有効期限テスト
- リフレッシュトークンのフロー
- 複数ユーザーでの同時ログイン

---

### 02-user-journey.js - ユーザーフロー

**目的:** ECサイトでの一連の買い物フローをシミュレート

**フロー:**

1. ログイン
2. 商品一覧を閲覧
3. 商品詳細を表示（複数）
4. カートに商品を追加
5. マイページを確認

**学べること:**

- 複数ステップの連続したフロー
- カスタムメトリクス（`Counter`）の定義
- think time（ユーザーの思考時間）の実装
- コンバージョン率の測定

**実行方法:**

```bash
k6 run scenarios/03-realistic/02-user-journey.js
```

**カスタムメトリクス:**

- `purchase_attempts`: 購入試行回数
- `purchase_success`: 購入成功回数
- コンバージョン率 = `purchase_success / purchase_attempts`

**応用:**

- 異なるユーザージャーニーパターン（新規 vs リピーター）
- 離脱率の測定
- ファネル分析

---

### 03-data-correlation.js - データ相関

**目的:** 前のリクエストの結果を次のリクエストで使用するパターン

**フロー:**

1. ユーザー一覧を取得
2. レスポンスからランダムにIDを抽出
3. そのIDでユーザー詳細を取得
4. 新規ユーザーを作成
5. 作成したユーザーを更新
6. 更新したユーザーを削除

**学べること:**

- レスポンスデータの抽出と再利用
- 動的なリクエストパラメータ
- `SharedArray` によるテストデータ管理
- JSONレスポンスの解析とエラーハンドリング

**実行方法:**

```bash
k6 run scenarios/03-realistic/03-data-correlation.js
```

**ユースケース:**

- 動的なIDの取得と使用
- セッションIDやトークンの引き継ぎ
- 注文番号の取得と追跡
- ページネーションのカーソル

---

### 04-file-upload.js - ファイルアップロード

**目的:** ファイルアップロード機能の負荷テスト

**パターン:**

1. 小さなファイル（1KB）のアップロード
2. 中サイズのファイル（10KB）のアップロード
3. FormDataを使用したマルチパートアップロード

**学べること:**

- バイナリデータの送信
- `FormData` の使用
- マルチパートフォームの扱い
- ファイルサイズによる負荷の違い

**実行方法:**

```bash
k6 run scenarios/03-realistic/04-file-upload.js
```

**テストポイント:**

- ファイルサイズによるレスポンスタイムの違い
- 同時アップロード数の制限
- ネットワーク帯域の使用率
- サーバー側のディスク書き込み性能

**監視メトリクス:**

- `http_req_sending`: データ送信時間
- `http_req_waiting`: サーバー処理時間
- `http_req_receiving`: レスポンス受信時間
- `data_sent`: 送信データ量

---

### 06-batch-requests.js - バッチリクエストと並列処理

**目的:** 複数のリクエストを効率的に実行するパターン

**パターン:**

1. 順次実行（比較用）
2. 並列実行（`http.batch()`）
3. 異なるエンドポイントへの並列アクセス
4. ページネーション処理

**学べること:**

- `http.batch()` による並列リクエスト
- 順次実行 vs 並列実行のパフォーマンス比較
- 複数エンドポイントの同時負荷
- レスポンスタイムの最適化

**実行方法:**

```bash
k6 run scenarios/03-realistic/06-batch-requests.js
```

**http.batch() の利点:**

- レスポンスタイムの短縮
- ネットワークの有効活用
- より現実的な負荷（ブラウザの並列リクエストを再現）

**使用例:**

- ダッシュボードの初期表示（複数のAPIを同時呼び出し）
- 画像の一括ダウンロード
- マイクロサービス間の並列呼び出し

---

## 🎯 実践的なテクニック

### 1. データ抽出と再利用

```javascript
const response = http.get("/api/users");
const body = JSON.parse(response.body);
const userId = body.data[0].id;

// 次のリクエストで使用
http.get(`/api/users/${userId}`);
```

### 2. カスタムメトリクス

```javascript
import { Counter, Trend } from "k6/metrics";

const errorCount = new Counter("custom_errors");
const responseTime = new Trend("custom_response_time");

// 記録
errorCount.add(1);
responseTime.add(response.timings.duration);
```

### 3. SharedArray（メモリ効率的なテストデータ）

```javascript
import { SharedArray } from "k6/data";

const users = new SharedArray("users", function () {
  return JSON.parse(open("./testdata.json"));
});

// 使用
const user = users[__ITER % users.length];
```

### 4. タグ付けとフィルタリング

```javascript
http.get(url, {
  tags: {
    name: 'login',
    type: 'api',
    version: 'v2',
  },
});

// 閾値で特定のタグのみ指定
thresholds: {
  'http_req_duration{name:login}': ['p(95)<500'],
}
```

### 5. グループ化

```javascript
import { group } from "k6";

group("Login Flow", () => {
  // ログイン関連の処理
});

group("Browse Products", () => {
  // 商品閲覧関連の処理
});
```

## 📊 メトリクスの活用

### group_duration

```javascript
thresholds: {
  'group_duration{group:::Login_Flow}': ['p(95)<1000'],
}
```

### タグ付きメトリクス

```javascript
thresholds: {
  'http_req_duration{type:api}': ['p(95)<500'],
  'http_req_duration{type:static}': ['p(95)<100'],
}
```

### カスタムメトリクス

```javascript
import { Counter, Rate, Gauge, Trend } from "k6/metrics";

const myCounter = new Counter("my_counter");
const myRate = new Rate("my_rate");
const myGauge = new Gauge("my_gauge");
const myTrend = new Trend("my_trend");
```

## 🔧 トラブルシューティング

### JSONパースエラー

```javascript
try {
  const body = JSON.parse(response.body);
  // 処理
} catch (e) {
  console.error("JSONパースエラー:", e);
  console.log("レスポンス:", response.body);
}
```

### 認証トークンが取得できない

```bash
# モックサーバーのログを確認
docker logs k6-sandbox-mock-server

# リクエストの詳細を確認
k6 run --http-debug scenarios/03-realistic/01-authentication.js
```

### 並列リクエストが期待通りに動作しない

```javascript
// http.batch() は同じVU内で並列実行
// 複数VUでの並列実行とは異なる
const responses = http.batch([...]);
console.log('すべて完了:', responses.length);
```

## 💡 ベストプラクティス

1. **エラーハンドリングを必ず実装**
   - try-catch でJSONパースエラーをキャッチ
   - レスポンスステータスを確認してから処理

2. **Think Time を適切に設定**
   - 実際のユーザー行動を再現
   - サーバーへの過度な負荷を避ける

3. **グループとタグで整理**
   - group() で論理的に分割
   - tags でメトリクスを分類

4. **カスタムメトリクスでビジネスKPIを測定**
   - コンバージョン率
   - エラー率
   - 特定機能の使用率

5. **メモリ効率を意識**
   - SharedArray でテストデータを共有
   - 大きなファイルは慎重に扱う

6. **デバッグ情報を適切に出力**
   - console.log で重要な値を出力
   - --http-debug オプションで詳細を確認
