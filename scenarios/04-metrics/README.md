# 04-metrics: メトリクスと可観測性

k6のメトリクス機能を活用して、詳細なパフォーマンス分析と可観測性を実現するシナリオ集です。

## 📊 メトリクスの種類

k6では4種類のカスタムメトリクスを定義できます：

| メトリクス | 説明 | 用途 | 統計情報 |
|----------|------|------|---------|
| **Counter** | 累積カウンター | リクエスト数、エラー数 | count, rate |
| **Rate** | 成功率・失敗率 | 成功率、エラー率 | rate (0-1) |
| **Gauge** | 現在の値 | アクティブユーザー数 | value |
| **Trend** | 統計情報を追跡 | レスポンスタイム | min/max/avg/p(N) |

## 📚 シナリオ一覧

### 01-custom-metrics.js - カスタムメトリクスの定義

**目的:** 独自のビジネスメトリクスを定義して測定

**学べること:**
- 4種類のメトリクスの使い分け
- ビジネスKPIの測定
- メトリクスの閾値設定

**メトリクス例:**
```javascript
import { Counter, Rate, Gauge, Trend } from 'k6/metrics';

const loginAttempts = new Counter('login_attempts');
const loginSuccessRate = new Rate('login_success_rate');
const activeUsers = new Gauge('active_users');
const responseSize = new Trend('response_size_bytes');
```

**実行方法:**
```bash
k6 run scenarios/04-metrics/01-custom-metrics.js
```

**ビジネスKPI例:**
- ログイン成功率
- コンバージョン率
- カート放棄率
- 平均注文金額
- エラー発生率

---

### 02-tags.js - タグ付けとフィルタリング

**目的:** タグを使用してリクエストを分類し、フィルタリング

**学べること:**
- タグの付け方
- タグを使った閾値の設定
- エンドポイントごとの性能測定

**タグ例:**
```javascript
http.get(url, {
  tags: {
    endpoint: 'users',
    priority: 'critical',
    api_version: 'v1',
    operation: 'read',
  },
});
```

**閾値例:**
```javascript
thresholds: {
  'http_req_duration{endpoint:users}': ['p(95)<300'],
  'http_req_duration{priority:critical}': ['p(99)<200'],
  'http_req_failed{endpoint:auth}': ['rate<0.01'],
}
```

**実行方法:**
```bash
k6 run scenarios/04-metrics/02-tags.js
```

**タグのベストプラクティス:**
- 一貫した命名規則を使用
- 必要最小限のタグを使用
- ビジネス価値の高いものから優先

---

### 03-groups.js - グルーピングによる分析

**目的:** リクエストを論理的にグループ化して分析

**学べること:**
- `group()` の使い方
- ネストしたグループ
- グループごとの閾値設定
- ユーザージャーニーの測定

**グループ例:**
```javascript
import { group } from 'k6';

group('User_Registration', () => {
  group('Step1_Input_Form', () => {
    // フォーム表示
  });
  
  group('Step2_Submit', () => {
    // 登録送信
  });
});
```

**閾値例:**
```javascript
thresholds: {
  'group_duration{group:::User_Registration}': ['p(95)<2000'],
  'group_duration{group:::User_Registration::Step1_Input_Form}': ['p(95)<300'],
}
```

**実行方法:**
```bash
k6 run scenarios/04-metrics/03-groups.js
```

**活用シーン:**
- ユーザージャーニーの各ステップを分析
- ボトルネックの特定
- ファネル分析
- トランザクション境界の明確化

---

### 04-trends.js - トレンド分析

**目的:** 時系列データを収集して統計分析

**学べること:**
- Trendメトリクスの定義
- カスタムタイミングの測定
- パーセンタイルの活用
- 時系列データの分析

**Trend例:**
```javascript
import { Trend } from 'k6/metrics';

const customResponseTime = new Trend('custom_response_time');
const dataProcessingTime = new Trend('data_processing_time');
const payloadSize = new Trend('payload_size_bytes');

// 測定
const start = Date.now();
const response = http.get(url);
const end = Date.now();

customResponseTime.add(end - start);
payloadSize.add(response.body.length);
```

**実行方法:**
```bash
k6 run scenarios/04-metrics/04-trends.js
```

**統計情報:**
- min/max: 最小値/最大値
- avg/med: 平均値/中央値
- p(90), p(95), p(99): パーセンタイル

---

## 📈 組み込みメトリクス

k6が自動的に収集する主要メトリクス：

### HTTP メトリクス

**http_req_duration**
- HTTPリクエストの合計時間
- 最も重要なメトリクス
- パーセンタイル（p90, p95, p99）で評価

**http_req_failed**
- HTTPリクエストの失敗率
- `rate` として表示（0.05 = 5%）

**http_req_sending**
- リクエストデータの送信時間
- アップロード速度の指標

**http_req_waiting**
- サーバー処理時間（TTFB: Time To First Byte）
- サーバー側のボトルネック特定に重要

**http_req_receiving**
- レスポンスデータの受信時間
- ダウンロード速度の指標

**http_reqs**
- 総リクエスト数
- スループットの指標（requests/sec）

### データ転送

**data_received**
- 受信したデータ量（bytes）
- 帯域幅の使用状況

**data_sent**
- 送信したデータ量（bytes）
- アップロード負荷の測定

### イテレーション

**iteration_duration**
- 1回のイテレーション（VU関数の実行）にかかる時間

**iterations**
- 完了したイテレーション数

### VU（Virtual Users）

**vus**
- 現在のアクティブVU数

**vus_max**
- 最大VU数

### Checks

**checks**
- check()の成功率
- `rate` として表示

## 🎯 閾値（Thresholds）の設定

### 基本的な閾値

```javascript
thresholds: {
  // 失敗率が5%未満
  http_req_failed: ['rate<0.05'],
  
  // レスポンスタイム
  http_req_duration: [
    'p(95)<500',  // 95%が500ms未満
    'p(99)<1000', // 99%が1000ms未満
    'avg<300',    // 平均が300ms未満
  ],
  
  // Check成功率が95%以上
  checks: ['rate>0.95'],
}
```

### タグ付き閾値

```javascript
thresholds: {
  'http_req_duration{endpoint:api}': ['p(95)<500'],
  'http_req_duration{priority:critical}': ['p(99)<200'],
  'http_req_failed{endpoint:auth}': ['rate<0.01'],
}
```

### グループ閾値

```javascript
thresholds: {
  'group_duration{group:::Login}': ['p(95)<1000'],
  'group_duration{group:::Checkout}': ['p(95)<3000'],
}
```

### カスタムメトリクス閾値

```javascript
thresholds: {
  'login_success_rate': ['rate>0.95'],
  'api_error_rate': ['rate<0.05'],
  'custom_response_time': ['p(95)<500'],
}
```

## 📊 パーセンタイルとは

パーセンタイルは、データの分布を理解するための統計指標です。

**例: p(95) = 500ms**
- 95%のリクエストが500ms以下でレスポンス
- 残り5%は500msより遅い

### なぜ平均値だけではダメか

```
リクエスト1: 100ms
リクエスト2: 100ms
リクエスト3: 100ms
リクエスト4: 100ms
リクエスト5: 10000ms（外れ値）

平均: 2060ms（実態と乖離）
p(90): 100ms（ほとんどのユーザーの体験を反映）
```

### よく使われるパーセンタイル

- **p(50) - 中央値**: 半分のユーザーの体験
- **p(90)**: 90%のユーザーの体験
- **p(95)**: 一般的なSLA目標
- **p(99)**: 厳しいSLA目標
- **p(99.9)**: 非常に厳しい要件

## 🔧 InfluxDB + Grafana 統合

### InfluxDBへの出力

```bash
# InfluxDB v1
k6 run --out influxdb=http://localhost:8086/k6 script.js

# InfluxDB v2
K6_INFLUXDB_ORGANIZATION=myorg \
K6_INFLUXDB_BUCKET=k6 \
K6_INFLUXDB_TOKEN=mytoken \
k6 run --out influxdb=http://localhost:8086 script.js
```

### Docker Composeで環境構築

```bash
# InfluxDB + Grafana起動
docker-compose up -d influxdb grafana

# Grafanaにアクセス
open http://localhost:3001
```

### Grafanaダッシュボード

主要なパネル：
1. **レスポンスタイムの推移**（折れ線グラフ）
2. **エラー率**（折れ線グラフ）
3. **スループット**（requests/sec）
4. **VU数の推移**
5. **パーセンタイル比較**（p50, p95, p99）

## 💡 ベストプラクティス

### 1. 適切なメトリクスを選択

```javascript
// ✅ Good: 用途に応じた適切なメトリクス
const errorCount = new Counter('errors');
const successRate = new Rate('success_rate');
const responseTime = new Trend('response_time');

// ❌ Bad: すべてCounterで測定
const metric1 = new Counter('metric1');
const metric2 = new Counter('metric2');
```

### 2. 意味のある名前を付ける

```javascript
// ✅ Good: 具体的で分かりやすい
const loginSuccessRate = new Rate('login_success_rate');
const apiResponseTime = new Trend('api_response_time_ms');

// ❌ Bad: 抽象的で分かりにくい
const rate1 = new Rate('rate1');
const time = new Trend('time');
```

### 3. 閾値は現実的な値を設定

```javascript
// ✅ Good: 段階的な閾値
thresholds: {
  http_req_duration: [
    'p(90)<300',
    'p(95)<500',
    'p(99)<1000',
  ],
}

// ❌ Bad: 達成不可能な閾値
thresholds: {
  http_req_duration: ['p(99)<10'],
}
```

### 4. タグは必要最小限に

```javascript
// ✅ Good: 分析に必要なタグのみ
tags: {
  endpoint: 'users',
  operation: 'read',
}

// ❌ Bad: 過剰なタグ
tags: {
  endpoint: 'users',
  method: 'GET',
  status: '200',
  timestamp: Date.now(),
  random_id: Math.random(),
}
```

### 5. グループは論理的に構成

```javascript
// ✅ Good: ユーザーの視点で構成
group('User Registration', () => {
  group('Step 1: Form Input', () => {});
  group('Step 2: Submit', () => {});
});

// ❌ Bad: 技術的な視点のみ
group('HTTP Requests', () => {
  group('GET', () => {});
  group('POST', () => {});
});
```

## 🔍 トラブルシューティング

### メトリクスが表示されない

```bash
# デバッグモードで実行
k6 run --verbose script.js

# メトリクス名を確認
k6 run --summary-export=summary.json script.js
cat summary.json | jq '.metrics'
```

### 閾値が機能しない

```javascript
// タグの記述が正しいか確認
thresholds: {
  // ✅ Correct
  'http_req_duration{endpoint:api}': ['p(95)<500'],
  
  // ❌ Wrong: 引用符の位置
  http_req_duration{endpoint:api}: ['p(95)<500'],
}
```

### InfluxDBに接続できない

```bash
# InfluxDBが起動しているか確認
docker ps | grep influxdb

# 接続テスト
curl http://localhost:8086/ping

# ログ確認
docker logs k6-influxdb
```

## 📖 参考情報

- [k6 Metrics Documentation](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds Documentation](https://k6.io/docs/using-k6/thresholds/)
- [k6 Tags and Groups Documentation](https://k6.io/docs/using-k6/tags-and-groups/)
