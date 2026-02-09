# k6負荷検証 トラブルシューティングガイド

k6を使用した負荷テストで遭遇する一般的な問題と解決方法をまとめたガイドです。

## 📋 目次

1. [接続エラー](#接続エラー)
2. [パフォーマンス問題](#パフォーマンス問題)
3. [メトリクス・閾値](#メトリクス閾値)
4. [スクリプトエラー](#スクリプトエラー)
5. [CI/CD問題](#cicd問題)
6. [InfluxDB/Grafana](#influxdbgrafana)

---

## 接続エラー

### 🔴 ECONNREFUSED (接続拒否)

**症状:**
```
ERRO[0000] GoError: Get "http://localhost:3000": dial tcp 127.0.0.1:3000: connect: connection refused
```

**原因:**
- サーバーが起動していない
- ポートが間違っている
- Dockerネットワークの問題

**解決方法:**

```bash
# 1. サーバーが起動しているか確認
curl http://localhost:3000/health

# 2. Dockerコンテナの状態を確認
docker ps | grep mock-server

# 3. サーバーを起動
docker compose up -d mock-server

# 4. ログを確認
docker logs k6-sandbox-mock-server

# 5. ポートを確認
lsof -i :3000
```

### 🔴 Timeout Errors

**症状:**
```
request timeout
http_req_duration: p(99) = 30000ms
```

**原因:**
- サーバーの応答が遅い
- ネットワークの問題
- 負荷が高すぎる

**解決方法:**

```javascript
// タイムアウトを延長
export const options = {
  httpDebug: 'full', // デバッグモードを有効化
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 閾値を緩める
  },
};

// または、負荷を下げる
export const options = {
  vus: 1, // VU数を減らす
  duration: '30s',
};
```

```bash
# サーバー側のリソースを確認
docker stats k6-sandbox-mock-server
```

---

## パフォーマンス問題

### 🔴 k6自体が遅い

**症状:**
```
- VU数が上がらない
- CPU使用率が100%
- メモリ不足エラー
```

**原因:**
- k6実行マシンのリソース不足
- 過度なログ出力
- 大きなファイルの読み込み

**解決方法:**

```javascript
// 1. ログ出力を減らす
// ❌ Bad
export default function () {
  console.log('Request started');
  const response = http.get(url);
  console.log(`Status: ${response.status}, Body: ${response.body}`);
}

// ✅ Good
export default function () {
  const response = http.get(url);
  if (response.status >= 400) {
    console.error(`Error: ${response.status}`);
  }
}

// 2. SharedArrayを使用
import { SharedArray } from 'k6/data';

const data = new SharedArray('data', function () {
  return JSON.parse(open('./large-file.json'));
});

// 3. 不要なメトリクスを無効化
export const options = {
  discardResponseBodies: true, // レスポンスボディを破棄
};
```

```bash
# k6をマシンのリソースに合わせて調整
k6 run --vus 10 --duration 1m script.js

# 分散実行を検討
k6 cloud script.js
```

### 🔴 メモリリーク

**症状:**
```
- メモリ使用量が増え続ける
- k6がクラッシュする
```

**原因:**
- 大きなレスポンスボディの保持
- 配列への無制限な追加

**解決方法:**

```javascript
// ✅ レスポンスボディを破棄
export const options = {
  discardResponseBodies: true,
};

// または、必要な部分のみ抽出
const response = http.get(url);
const userId = JSON.parse(response.body).id; // 必要な部分だけ
// response.body は後で参照しない
```

---

## メトリクス・閾値

### 🔴 閾値が常に失敗する

**症状:**
```
✗ http_req_duration..........: p(95)=1523.45ms  ← 閾値: p(95)<500
ERRO[0065] some thresholds have failed
```

**原因:**
- 閾値が厳しすぎる
- サーバーの性能問題
- テスト設計の問題

**解決方法:**

```javascript
// 1. まずは閾値なしで実行して現状を把握
export const options = {
  vus: 10,
  duration: '1m',
  // thresholds: {}, // 一旦コメントアウト
};

// 2. 実際の値を確認して現実的な閾値を設定
export const options = {
  thresholds: {
    // 現状: p(95) = 1500ms → 少し余裕を持たせて2000ms
    http_req_duration: ['p(95)<2000'],
  },
};

// 3. 段階的に厳しくする
// 1週間後: p(95)<1500
// 2週間後: p(95)<1000
// 1ヶ月後: p(95)<500
```

### 🔴 カスタムメトリクスが表示されない

**症状:**
```
- 定義したカスタムメトリクスが結果に表示されない
```

**原因:**
- メトリクス名の typo
- 値を記録していない

**解決方法:**

```javascript
import { Counter } from 'k6/metrics';

// ✅ 正しい使い方
const myCounter = new Counter('my_counter');

export default function () {
  myCounter.add(1); // 値を記録
}

// デバッグ
console.log('Counter value:', myCounter.value);
```

```bash
# メトリクス名を確認
k6 run --summary-export=summary.json script.js
cat summary.json | jq '.metrics | keys'
```

---

## スクリプトエラー

### 🔴 TypeError: Cannot read property 'X' of undefined

**症状:**
```javascript
TypeError: Cannot read property 'token' of undefined
```

**原因:**
- JSONパースの失敗
- レスポンスの構造が期待と異なる

**解決方法:**

```javascript
// ❌ Bad
const response = http.get(url);
const token = JSON.parse(response.body).data.token; // エラー！

// ✅ Good: エラーハンドリング
const response = http.get(url);

if (response.status !== 200) {
  console.error(`Request failed: ${response.status}`);
  return;
}

try {
  const body = JSON.parse(response.body);
  
  if (!body.data || !body.data.token) {
    console.error('Token not found in response');
    return;
  }
  
  const token = body.data.token;
  // 以降の処理
} catch (e) {
  console.error(`JSON parse error: ${e}`);
}
```

### 🔴 Module import errors

**症状:**
```
ERRO[0000] Cannot find module '../utils/auth.js'
```

**原因:**
- パスが間違っている
- ファイルが存在しない

**解決方法:**

```bash
# ファイルが存在するか確認
ls -la utils/auth.js

# 相対パスを確認
# scenarios/01-basics/test.js から utils/auth.js をインポート
# → ../../utils/auth.js
```

```javascript
// 絶対パスではなく相対パスを使用
import { login } from '../../utils/auth.js'; // ✅ 
import { login } from '/utils/auth.js';      // ❌ 動かない
```

---

## CI/CD問題

### 🔴 GitHub Actionsでテストが失敗

**症状:**
```
Error: Process completed with exit code 99.
```

**原因:**
- モックサーバーが起動していない
- ネットワークの問題
- 閾値を超過

**解決方法:**

```yaml
# 1. サーバーの起動を確認
- name: Start mock server
  run: |
    docker compose up -d mock-server
    sleep 10  # 起動を待つ
    
    # ヘルスチェック
    timeout 30 bash -c 'until curl -f http://localhost:3000/health; do sleep 1; done'

# 2. ネットワーク設定を確認
- name: Run k6 test
  run: |
    docker run --rm -i --network=host \
      grafana/k6 run - < scenarios/01-basics/01-simple-http.js

# 3. デバッグ情報を出力
- name: Debug
  if: failure()
  run: |
    docker ps
    docker logs k6-sandbox-mock-server
    curl -v http://localhost:3000/health || true
```

### 🔴 アーティファクトがアップロードされない

**症状:**
```
Warning: No files were found with the provided path
```

**原因:**
- ファイルが生成されていない
- パスが間違っている

**解決方法:**

```yaml
# ファイルの存在を確認
- name: List files
  run: |
    ls -la
    ls -la summary.* || echo "No summary files"

# 正しいパスを指定
- name: Upload results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: k6-results
    path: |
      summary.json
      summary.html
    if-no-files-found: warn  # ファイルがなくても警告のみ
```

---

## InfluxDB/Grafana

### 🔴 InfluxDBに接続できない

**症状:**
```
WARN[0000] Could not write to InfluxDB: Post "http://localhost:8086/write?db=k6": dial tcp: connection refused
```

**原因:**
- InfluxDBが起動していない
- ポートが間違っている
- データベースが作成されていない

**解決方法:**

```bash
# 1. InfluxDBが起動しているか確認
docker ps | grep influxdb

# 2. 起動
docker compose up -d influxdb

# 3. データベースを確認
docker exec -it k6-influxdb influx
> SHOW DATABASES
> CREATE DATABASE k6  # 存在しない場合

# 4. k6から接続
k6 run --out influxdb=http://localhost:8086/k6 script.js
```

### 🔴 Grafanaにデータが表示されない

**症状:**
- Grafanaは起動しているがデータが表示されない

**原因:**
- データソースの設定が間違っている
- データが送信されていない

**解決方法:**

```bash
# 1. Grafanaにアクセス
open http://localhost:3001

# 2. データソースを確認
# Settings > Data Sources > InfluxDB
# URL: http://influxdb:8086
# Database: k6

# 3. データが送信されているか確認
docker exec -it k6-influxdb influx
> USE k6
> SHOW MEASUREMENTS
> SELECT * FROM http_reqs LIMIT 10

# 4. k6でデータを送信
k6 run --out influxdb=http://localhost:8086/k6 scenarios/01-basics/01-simple-http.js
```

---

## よくある質問

### Q: k6のバージョンを確認するには？

```bash
k6 version
```

### Q: スクリプトの構文チェックだけ行うには？

```bash
k6 inspect script.js
```

### Q: デバッグモードで実行するには？

```bash
k6 run --http-debug script.js
k6 run --verbose script.js
```

### Q: 特定のメトリクスだけ表示するには？

```bash
k6 run --summary-trend-stats="avg,p(95),p(99)" script.js
```

### Q: 結果をファイルに保存するには？

```bash
k6 run script.js > results.txt 2>&1
k6 run --summary-export=summary.json script.js
```

---

## デバッグのコツ

### 1. 段階的にテストする

```bash
# Step 1: VU=1で実行
k6 run --vus 1 --iterations 1 script.js

# Step 2: VU=1で複数回
k6 run --vus 1 --iterations 10 script.js

# Step 3: 複数VUで短時間
k6 run --vus 5 --duration 30s script.js

# Step 4: 本番設定で実行
k6 run script.js
```

### 2. ログを活用

```javascript
// リクエスト前後でログ出力
console.log('=== Starting request ===');
console.log(`URL: ${url}`);
console.log(`Payload: ${payload}`);

const response = http.post(url, payload);

console.log(`Status: ${response.status}`);
console.log(`Body: ${response.body}`);
console.log(`Duration: ${response.timings.duration}ms`);
```

### 3. check()で詳細を確認

```javascript
check(response, {
  'status is 200': (r) => {
    if (r.status !== 200) {
      console.error(`Expected 200, got ${r.status}`);
      console.error(`Body: ${r.body}`);
    }
    return r.status === 200;
  },
});
```

---

## サポート

### コミュニティ

- [k6 Community Forum](https://community.k6.io/)
- [k6 Slack](https://k6.io/slack)
- [k6 GitHub](https://github.com/grafana/k6)

### ドキュメント

- [k6 公式ドキュメント](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)

---

## まとめ

トラブルシューティングの基本ステップ：

1. **エラーメッセージを読む** - 何が問題かを把握
2. **段階的に切り分ける** - 問題の範囲を特定
3. **ログを確認する** - 詳細情報を収集
4. **シンプルから始める** - VU=1, iterations=1で検証
5. **コミュニティに相談** - 解決しない場合は質問

問題が解決しない場合は、Issue として報告してください！
