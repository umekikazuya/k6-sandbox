import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * 02. JSON出力とHTMLレポート生成
 * 
 * k6の実行結果をJSON形式で出力し、HTMLレポートを生成します。
 * CI/CDパイプラインでアーティファクトとして保存できます。
 * 
 * 学べること:
 * - JSON形式での結果出力
 * - HTMLレポートの生成
 * - handleSummary()のカスタマイズ
 * - CI/CDでのアーティファクト保存
 */

export const options = {
  vus: 10,
  duration: '1m',
  
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const response = http.get(`${BASE_URL}/api/users`);
  
  check(response, {
    'ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
}

// カスタムサマリーハンドラー
export function handleSummary(data) {
  return {
    // コンソールに標準サマリーを表示
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    
    // JSON形式で詳細結果を保存
    'summary.json': JSON.stringify(data),
    
    // HTMLレポートを生成
    'summary.html': htmlReport(data),
  };
}

/**
 * 実行方法:
 * k6 run scenarios/05-cicd/02-json-output.js
 * 
 * 実行後、以下のファイルが生成されます:
 * - summary.json: 詳細な結果データ（JSON形式）
 * - summary.html: ビジュアルなHTMLレポート
 * 
 * JSONファイルの活用:
 * 
 * # 特定のメトリクスを抽出
 * cat summary.json | jq '.metrics.http_req_duration'
 * 
 * # 閾値の合格/不合格を確認
 * cat summary.json | jq '.metrics | to_entries[] | select(.value.thresholds) | {name: .key, passed: .value.thresholds}'
 * 
 * # チェックの成功率を確認
 * cat summary.json | jq '.metrics.checks.values.rate'
 * 
 * CI/CDでの使用例（GitHub Actions）:
 * 
 * - name: Run k6 test
 *   run: k6 run scenarios/05-cicd/02-json-output.js
 * 
 * - name: Upload test results
 *   uses: actions/upload-artifact@v3
 *   with:
 *     name: k6-test-results
 *     path: |
 *       summary.json
 *       summary.html
 * 
 * - name: Comment PR with results
 *   uses: actions/github-script@v6
 *   with:
 *     script: |
 *       const fs = require('fs');
 *       const summary = JSON.parse(fs.readFileSync('summary.json', 'utf8'));
 *       const comment = `## k6 Load Test Results
 *       - Total Requests: ${summary.metrics.http_reqs.values.count}
 *       - Failed Requests: ${(summary.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
 *       - Avg Response Time: ${summary.metrics.http_req_duration.values.avg.toFixed(2)}ms
 *       - P95 Response Time: ${summary.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`;
 *       github.rest.issues.createComment({
 *         issue_number: context.issue.number,
 *         owner: context.repo.owner,
 *         repo: context.repo.repo,
 *         body: comment
 *       });
 */
