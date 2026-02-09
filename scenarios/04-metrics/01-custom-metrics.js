import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Gauge, Trend } from 'k6/metrics';

/**
 * 01. カスタムメトリクスの定義と使用
 * 
 * k6の組み込みメトリクスに加えて、独自のビジネスメトリクスを
 * 定義して測定します。
 * 
 * カスタムメトリクスの種類:
 * - Counter: 累積カウンター（増加のみ）
 * - Rate: 成功率・失敗率を測定（0-1の範囲）
 * - Gauge: 現在の値を保持（上下に変動）
 * - Trend: 統計情報を追跡（min/max/avg/percentiles）
 * 
 * 学べること:
 * - カスタムメトリクスの定義方法
 * - ビジネスKPIの測定
 * - メトリクスの可視化と分析
 */

// カスタムメトリクスを定義
const loginAttempts = new Counter('login_attempts');
const loginSuccesses = new Counter('login_successes');
const loginFailures = new Counter('login_failures');
const loginSuccessRate = new Rate('login_success_rate');

const apiErrors = new Counter('api_errors');
const apiErrorRate = new Rate('api_error_rate');

const activeUsers = new Gauge('active_users');
const responseSize = new Trend('response_size_bytes');
const processingTime = new Trend('processing_time_ms');

export const options = {
  scenarios: {
    metrics_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  
  thresholds: {
    // 組み込みメトリクスの閾値
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
    
    // カスタムメトリクスの閾値
    'login_success_rate': ['rate>0.95'],
    'api_error_rate': ['rate<0.05'],
    'response_size_bytes': ['avg<10000'],
    'processing_time_ms': ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // アクティブユーザー数を記録（現在のVU数）
  activeUsers.add(__VU);
  
  // === ログインフロー ===
  loginAttempts.add(1);
  
  const loginPayload = JSON.stringify({
    username: 'testuser',
    password: Math.random() > 0.1 ? 'testpass' : 'wrongpass', // 90%成功
  });
  
  const startTime = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const endTime = Date.now();
  
  // 処理時間を記録
  processingTime.add(endTime - startTime);
  
  // レスポンスサイズを記録
  if (loginRes.body) {
    responseSize.add(loginRes.body.length);
  }
  
  // ログイン結果を記録
  if (loginRes.status === 200) {
    loginSuccesses.add(1);
    loginSuccessRate.add(true);
  } else {
    loginFailures.add(1);
    loginSuccessRate.add(false);
  }
  
  check(loginRes, {
    'ログイン処理完了': (r) => r.status === 200 || r.status === 401,
  });
  
  sleep(1);
  
  // === API呼び出し ===
  const apiRes = http.get(`${BASE_URL}/api/users`);
  
  // レスポンスサイズを記録
  if (apiRes.body) {
    responseSize.add(apiRes.body.length);
  }
  
  // エラー率を記録
  if (apiRes.status >= 400) {
    apiErrors.add(1);
    apiErrorRate.add(true);
  } else {
    apiErrorRate.add(false);
  }
  
  check(apiRes, {
    'API呼び出し成功': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // === ランダムエラーエンドポイント ===
  const errorRes = http.get(`${BASE_URL}/api/random-error`);
  
  if (errorRes.status >= 400) {
    apiErrors.add(1);
    apiErrorRate.add(true);
  } else {
    apiErrorRate.add(false);
  }
  
  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/04-metrics/01-custom-metrics.js
 * 
 * 結果の確認:
 * テスト終了後、以下のカスタムメトリクスが表示されます:
 * - login_attempts: 総ログイン試行回数
 * - login_successes: ログイン成功回数
 * - login_failures: ログイン失敗回数
 * - login_success_rate: ログイン成功率
 * - api_errors: API エラー回数
 * - api_error_rate: API エラー率
 * - active_users: アクティブユーザー数
 * - response_size_bytes: レスポンスサイズの統計
 * - processing_time_ms: 処理時間の統計
 * 
 * ビジネスKPIの例:
 * - コンバージョン率（購入完了率）
 * - カート放棄率
 * - 平均注文金額
 * - ページビュー数
 * - ユーザーエンゲージメント
 * 
 * InfluxDBへの出力:
 * k6 run --out influxdb=http://localhost:8086/k6 scenarios/04-metrics/01-custom-metrics.js
 * 
 * Grafanaでの可視化:
 * カスタムメトリクスもInfluxDBに保存され、Grafanaで可視化可能
 */
