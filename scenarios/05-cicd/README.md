# 05-cicd: CI/CD統合

CI/CDパイプラインでk6負荷テストを実行するためのシナリオとベストプラクティス集です。

## 📚 シナリオ一覧

### 01-threshold-validation.js - 閾値ベースの自動判定

**目的:** CI/CDで自動的に合格/不合格を判定

**特徴:**

- 環境ごとに異なる閾値（dev/staging/production）
- 短時間で完了（2分）
- 明確な終了コード（0=成功, 非0=失敗）

**実行方法:**

```bash
# 開発環境
k6 run scenarios/05-cicd/01-threshold-validation.js

# ステージング環境
ENVIRONMENT=staging BASE_URL=https://staging-api.example.com \
  k6 run scenarios/05-cicd/01-threshold-validation.js

# 本番環境
ENVIRONMENT=production BASE_URL=https://api.example.com \
  k6 run scenarios/05-cicd/01-threshold-validation.js
```

---

### 02-json-output.js - JSON/HTMLレポート生成

**目的:** テスト結果をJSON・HTML形式で出力

**生成されるファイル:**

- `summary.json`: 詳細な結果データ
- `summary.html`: ビジュアルなHTMLレポート

**実行方法:**

```bash
k6 run scenarios/05-cicd/02-json-output.js
```

**JSONデータの活用:**

```bash
# メトリクスを確認
cat summary.json | jq '.metrics.http_req_duration'

# 閾値の結果を確認
cat summary.json | jq '.metrics | to_entries[] | select(.value.thresholds)'
```

---

## 🔄 GitHub Actions統合

### 基本的なワークフロー

`.github/workflows/k6-tests.yml`:

```yaml
name: k6 Load Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    # 毎日午前3時に実行
    - cron: "0 3 * * *"

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run k6 test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: scenarios/05-cicd/01-threshold-validation.js
        env:
          ENVIRONMENT: staging
          BASE_URL: ${{ secrets.STAGING_API_URL }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: |
            summary.json
            summary.html
```

### PRコメントに結果を投稿

```yaml
- name: Comment PR with results
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const summary = JSON.parse(fs.readFileSync('summary.json', 'utf8'));

      const p95 = summary.metrics.http_req_duration.values['p(95)'].toFixed(2);
      const failRate = (summary.metrics.http_req_failed.values.rate * 100).toFixed(2);

      const comment = `## 📊 k6 Load Test Results

      | Metric | Value |
      |--------|-------|
      | Total Requests | ${summary.metrics.http_reqs.values.count} |
      | Failed Requests | ${failRate}% |
      | P95 Response Time | ${p95}ms |
      | Avg Response Time | ${summary.metrics.http_req_duration.values.avg.toFixed(2)}ms |
      `;

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

### Slackへの通知

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: custom
    custom_payload: |
      {
        text: "❌ k6 Load Test Failed",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*k6 Load Test Failed*\n${{ github.repository }}@${{ github.ref }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 🛠️ 共通ユーティリティ

### utils/auth.js - 認証ヘルパー

```javascript
import http from "k6/http";

export function login(baseUrl, username, password) {
  const payload = JSON.stringify({ username, password });
  const response = http.post(`${baseUrl}/api/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return body.data.token;
  }

  return null;
}

export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
```

### utils/config.js - 共通設定

```javascript
export const config = {
  baseUrl: __ENV.BASE_URL || "http://localhost:3000",
  environment: __ENV.ENVIRONMENT || "dev",
  vus: parseInt(__ENV.VUS) || 10,
  duration: __ENV.DURATION || "1m",
};

export const thresholds = {
  dev: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<1000"],
  },
  staging: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"],
  },
  production: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};
```

### utils/data-generator.js - テストデータ生成

```javascript
export function generateUser() {
  const timestamp = Date.now();
  return {
    name: `User_${timestamp}`,
    email: `user_${timestamp}@example.com`,
  };
}

export function generateRandomString(length = 10) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateEmail(prefix = "test") {
  return `${prefix}_${Date.now()}@example.com`;
}
```

---

## 💡 ベストプラクティス

### 1. CI/CD向けの実行時間

```javascript
// ❌ Bad: 長すぎる（CI/CDの待ち時間が長い）
export const options = {
  duration: "30m",
};

// ✅ Good: 短時間で完了
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
};
```

### 2. 環境ごとの設定分離

```javascript
// ✅ Good: 環境変数で設定を切り替え
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const ENVIRONMENT = __ENV.ENVIRONMENT || "dev";

const thresholds = {
  dev: {
    /* 緩い閾値 */
  },
  staging: {
    /* 中程度 */
  },
  production: {
    /* 厳しい */
  },
};

export const options = {
  thresholds: thresholds[ENVIRONMENT],
};
```

### 3. 失敗時の詳細情報

```javascript
// ✅ Good: 失敗時に詳細を出力
check(response, {
  ステータスは200: (r) => {
    if (r.status !== 200) {
      console.error(`Failed: status=${r.status}, body=${r.body}`);
    }
    return r.status === 200;
  },
});
```

### 4. アーティファクトの保存

```yaml
# ✅ Good: 常に結果を保存
- name: Upload test results
  if: always() # 成功・失敗に関わらず保存
  uses: actions/upload-artifact@v3
  with:
    name: k6-results-${{ github.run_number }}
    path: |
      summary.json
      summary.html
```

### 5. 段階的な導入

```
Step 1: CI/CDで実行（閾値なし）
  ↓ メトリクスを収集・分析
Step 2: 緩い閾値を設定（警告のみ）
  ↓ パフォーマンス改善
Step 3: 厳しい閾値を設定（ビルド失敗）
  ↓ 継続的な監視
Step 4: 定期実行（Cron）
```

---

## 🔍 トラブルシューティング

### テストが頻繁に失敗する

```bash
# 閾値を緩めに調整
thresholds: {
  http_req_duration: ['p(95)<1000'],  # 500ms → 1000ms
}

# または、環境を確認
echo $ENVIRONMENT
echo $BASE_URL
```

### GitHub Actionsでタイムアウト

```yaml
# タイムアウトを延長
jobs:
  load-test:
    timeout-minutes: 10 # デフォルト: 360分
```

### モックサーバーに接続できない

```yaml
# サービスコンテナを使用
services:
  mock-server:
    image: your-mock-server:latest
    ports:
      - 3000:3000

steps:
  - name: Wait for server
    run: |
      until curl -f http://localhost:3000/health; do
        sleep 1
      done
```

---

## 📖 参考資料

- [k6 CI/CD Documentation](https://k6.io/docs/integrations/ci/)
- [GitHub Actions k6 Action](https://github.com/grafana/k6-action)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
