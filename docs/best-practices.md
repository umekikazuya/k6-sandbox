# k6負荷検証 ベストプラクティス集

実務でk6を効果的に活用するためのベストプラクティスとアンチパターン集です。

## 📋 目次

1. [テスト設計](#テスト設計)
2. [スクリプト作成](#スクリプト作成)
3. [メトリクスと閾値](#メトリクスと閾値)
4. [パフォーマンス最適化](#パフォーマンス最適化)
5. [CI/CD統合](#cicd統合)
6. [チーム運用](#チーム運用)

---

## テスト設計

### ✅ 目的を明確にする

```javascript
// ✅ Good: 目的が明確
/**
 * 目的: 新機能のAPIが通常負荷で500ms以内にレスポンスすることを確認
 * 対象: POST /api/new-feature
 * 基準: p(95) < 500ms, エラー率 < 1%
 */

// ❌ Bad: 目的が不明
// とりあえず負荷をかけてみる
```

### ✅ 適切なテストタイプを選択

```javascript
// デプロイ前 → Smoke Test
export const options = {
  vus: 1,
  duration: '1m',
};

// 通常運用の検証 → Load Test
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
  ],
};

// 限界値の確認 → Stress Test
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
  ],
};
```

### ✅ 実際のユーザー行動を再現

```javascript
// ✅ Good: Think timeを含む
export default function () {
  http.get(`${BASE_URL}/products`);
  sleep(2); // ユーザーが商品を眺める時間
  
  http.get(`${BASE_URL}/products/1`);
  sleep(5); // 商品詳細を読む時間
  
  http.post(`${BASE_URL}/cart`, payload);
  sleep(1);
}

// ❌ Bad: Think timeなし（現実的でない）
export default function () {
  http.get(`${BASE_URL}/products`);
  http.get(`${BASE_URL}/products/1`);
  http.post(`${BASE_URL}/cart`, payload);
}
```

---

## スクリプト作成

### ✅ 環境変数で設定を外部化

```javascript
// ✅ Good: 環境変数を使用
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.VUS) || 10;

// ❌ Bad: ハードコード
const BASE_URL = 'http://localhost:3000';
const VUS = 10;
```

### ✅ エラーハンドリングを実装

```javascript
// ✅ Good: エラーを適切に処理
const response = http.post(url, payload);

if (response.status !== 201) {
  console.error(`Failed to create: status=${response.status}, body=${response.body}`);
  return; // 後続処理をスキップ
}

try {
  const data = JSON.parse(response.body);
  // データ処理
} catch (e) {
  console.error('JSON parse error:', e);
}

// ❌ Bad: エラーを無視
const response = http.post(url, payload);
const data = JSON.parse(response.body); // 失敗する可能性
```

### ✅ 共通処理はユーティリティ化

```javascript
// ✅ Good: ユーティリティを使用
import { login, getAuthHeaders } from '../utils/auth.js';

export default function () {
  const token = login(BASE_URL, 'user', 'pass');
  http.get(url, { headers: getAuthHeaders(token) });
}

// ❌ Bad: 毎回同じコードを書く
export default function () {
  const loginRes = http.post(...);
  const token = JSON.parse(loginRes.body).token;
  http.get(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### ✅ check()を効果的に使用

```javascript
// ✅ Good: 具体的で意味のあるチェック
check(response, {
  'ログイン成功（200）': (r) => r.status === 200,
  'トークンが取得できた': (r) => {
    const body = JSON.parse(r.body);
    return body.data && body.data.token;
  },
  'レスポンスタイムが許容範囲': (r) => r.timings.duration < 500,
});

// ❌ Bad: 曖昧なチェック
check(response, {
  'success': (r) => r.status === 200,
});
```

---

## メトリクスと閾値

### ✅ パーセンタイルを使用

```javascript
// ✅ Good: パーセンタイルで評価
thresholds: {
  http_req_duration: [
    'p(50)<200',  // 半分のユーザー
    'p(95)<500',  // ほとんどのユーザー
    'p(99)<1000', // 最悪のケース
  ],
}

// ❌ Bad: 平均値のみ（外れ値に影響される）
thresholds: {
  http_req_duration: ['avg<300'],
}
```

### ✅ ビジネスKPIを測定

```javascript
// ✅ Good: ビジネス指標を測定
import { Counter, Rate } from 'k6/metrics';

const purchaseAttempts = new Counter('purchase_attempts');
const purchaseSuccess = new Rate('purchase_success_rate');

export default function () {
  purchaseAttempts.add(1);
  const response = http.post('/checkout', payload);
  purchaseSuccess.add(response.status === 201);
}

// コンバージョン率 = purchase_success_rate
```

### ✅ タグで分類

```javascript
// ✅ Good: タグで詳細分析
http.get(url, {
  tags: {
    endpoint: 'users',
    priority: 'critical',
    operation: 'read',
  },
});

thresholds: {
  'http_req_duration{priority:critical}': ['p(99)<200'],
  'http_req_duration{priority:normal}': ['p(99)<500'],
}
```

---

## パフォーマンス最適化

### ✅ 並列リクエストを活用

```javascript
// ✅ Good: 並列実行で高速化
const responses = http.batch([
  ['GET', `${BASE_URL}/api/users`],
  ['GET', `${BASE_URL}/api/products`],
  ['GET', `${BASE_URL}/api/orders`],
]);

// ❌ Bad: 順次実行（遅い）
http.get(`${BASE_URL}/api/users`);
http.get(`${BASE_URL}/api/products`);
http.get(`${BASE_URL}/api/orders`);
```

### ✅ SharedArrayでメモリ効率化

```javascript
// ✅ Good: SharedArrayで1回だけロード
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

// ❌ Bad: 各VUで個別にロード（メモリ大量消費）
const users = JSON.parse(open('./users.json'));
```

### ✅ 不要なログを削減

```javascript
// ✅ Good: 重要な情報のみログ出力
if (response.status >= 400) {
  console.error(`Error: ${response.status}`);
}

// ❌ Bad: すべてをログ出力（パフォーマンス低下）
console.log(`Status: ${response.status}, Body: ${response.body}`);
```

---

## CI/CD統合

### ✅ 実行時間を短く

```javascript
// ✅ Good: 2-3分で完了
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

// ❌ Bad: 長すぎる（CI/CDの待ち時間が増える）
export const options = {
  duration: '30m',
};
```

### ✅ 段階的に厳しくする

```javascript
// Step 1: 監視のみ（閾値なし）
export const options = {
  vus: 10,
  duration: '1m',
};

// Step 2: 緩い閾値
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 警告レベル
  },
};

// Step 3: 厳しい閾値
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 本番レベル
  },
};
```

### ✅ 結果を可視化

```yaml
# GitHub Actions
- name: Upload results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: k6-results
    path: |
      summary.json
      summary.html

- name: Comment PR
  uses: actions/github-script@v6
  # PRに結果をコメント
```

---

## チーム運用

### ✅ ドキュメントを充実させる

```javascript
/**
 * 購入フローの負荷テスト
 * 
 * 目的: 決済処理が高負荷時も正常に動作することを確認
 * 対象: POST /api/checkout
 * 
 * 実行方法:
 *   k6 run --vus 50 --duration 5m checkout-test.js
 * 
 * 基準:
 *   - p(95) < 1000ms
 *   - エラー率 < 1%
 *   - 決済成功率 > 99%
 * 
 * 注意:
 *   - 本番環境では実行しないこと
 *   - テスト用のクレジットカード番号を使用
 */
```

### ✅ 定期的に実行

```yaml
# GitHub Actions - 定期実行
on:
  schedule:
    - cron: '0 3 * * *'  # 毎日午前3時
    - cron: '0 12 * * 1' # 毎週月曜日正午
```

### ✅ 結果を共有

- Slackへの自動通知
- Grafanaダッシュボード
- 週次レポートの作成
- パフォーマンス改善の追跡

### ✅ バージョン管理

```bash
# タグを付けて実行
git tag -a v1.0-perf-baseline -m "Performance baseline"

# 比較
k6 run script.js > results-v1.json
k6 run script.js > results-v2.json
# 差分を分析
```

---

## アンチパターン

### ❌ 本番環境で無計画に実行

```javascript
// 危険！本番データが壊れる可能性
export const options = {
  vus: 1000,
  duration: '1h',
};

// 本番環境では:
// - Smoke Testのみ
// - 読み取り専用の操作
// - 低いVU数
```

### ❌ データクリーンアップを忘れる

```javascript
// ❌ Bad: テストデータが蓄積
export default function () {
  http.post('/users', generateUser());
  // 削除しない
}

// ✅ Good: クリーンアップ
export default function () {
  const res = http.post('/users', generateUser());
  const userId = JSON.parse(res.body).id;
  
  // テスト実行
  
  http.del(`/users/${userId}`); // クリーンアップ
}
```

### ❌ 過度に複雑なスクリプト

```javascript
// ❌ Bad: 1つのスクリプトで全部やろうとする
export default function () {
  // 100行以上のコード
  // 複数の異なるシナリオ
  // 複雑な条件分岐
}

// ✅ Good: 目的ごとに分割
// login-test.js
// product-search-test.js
// checkout-test.js
```

---

## まとめ

### 重要なポイント

1. **目的を明確にする** - 何を測定したいのか
2. **現実的なシナリオ** - 実際のユーザー行動を再現
3. **適切な閾値** - ビジネス要件に基づく基準
4. **継続的な実施** - CI/CDに組み込む
5. **結果の共有** - チーム全体で改善

### 次のステップ

1. Smoke Testから始める
2. Load Testで基準を確立
3. CI/CDに統合
4. 定期的に見直し・改善

---

## 参考資料

- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
