import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * 04. トレンド分析
 * 
 * Trendメトリクスを使用して、時系列データを収集・分析します。
 * 統計情報（min/max/avg/percentiles）を自動的に計算します。
 * 
 * Trendの用途:
 * - レスポンスタイムの分布
 * - ペイロードサイズの推移
 * - 処理時間の変動
 * - カスタムタイミングの測定
 * 
 * 学べること:
 * - Trendメトリクスの定義
 * - カスタムタイミングの測定
 * - パーセンタイルの活用
 * - 時系列データの分析
 */

// カスタムTrendメトリクスを定義
const customResponseTime = new Trend('custom_response_time');
const dataProcessingTime = new Trend('data_processing_time');
const totalTransactionTime = new Trend('total_transaction_time');
const payloadSize = new Trend('payload_size_bytes');
const thinkTime = new Trend('think_time_ms');
const waitingTime = new Trend('server_waiting_time');
const downloadTime = new Trend('content_download_time');

export const options = {
  scenarios: {
    trend_analysis: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  
  thresholds: {
    // 組み込みTrend
    http_req_duration: [
      'p(50)<200',
      'p(90)<400',
      'p(95)<500',
      'p(99)<1000',
    ],
    
    // カスタムTrend
    'custom_response_time': [
      'avg<300',
      'p(95)<500',
    ],
    'data_processing_time': [
      'avg<100',
      'max<500',
    ],
    'total_transaction_time': [
      'p(90)<2000',
      'p(99)<5000',
    ],
    'payload_size_bytes': [
      'avg<5000',
      'max<50000',
    ],
    'server_waiting_time': ['p(95)<400'],
    'content_download_time': ['p(95)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // トランザクション全体の時間を測定
  const transactionStart = Date.now();
  
  // === パターン1: 基本的なレスポンスタイム測定 ===
  const start1 = Date.now();
  let response = http.get(`${BASE_URL}/api/users`);
  const end1 = Date.now();
  
  // カスタムレスポンスタイムを記録
  customResponseTime.add(end1 - start1);
  
  // ペイロードサイズを記録
  if (response.body) {
    payloadSize.add(response.body.length);
  }
  
  // k6組み込みのタイミング情報も活用
  waitingTime.add(response.timings.waiting);
  downloadTime.add(response.timings.receiving);
  
  check(response, {
    'ユーザー一覧: ステータスは200': (r) => r.status === 200,
  });
  
  // Think time（ユーザーの思考時間）を測定
  const thinkStart = Date.now();
  sleep(1);
  const thinkEnd = Date.now();
  thinkTime.add(thinkEnd - thinkStart);
  
  // === パターン2: データ処理時間の測定 ===
  response = http.get(`${BASE_URL}/api/users/1`);
  
  if (response.status === 200) {
    const processingStart = Date.now();
    
    // JSONパースとデータ処理をシミュレート
    try {
      const data = JSON.parse(response.body);
      
      // データ処理（実際のビジネスロジック）
      const processedData = {
        ...data,
        processed: true,
        timestamp: new Date().toISOString(),
      };
      
      // 何らかの計算処理
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      
    } catch (e) {
      console.error('データ処理エラー:', e);
    }
    
    const processingEnd = Date.now();
    dataProcessingTime.add(processingEnd - processingStart);
  }
  
  payloadSize.add(response.body ? response.body.length : 0);
  
  sleep(1);
  
  // === パターン3: 複数ステップのトランザクション ===
  const multiStepStart = Date.now();
  
  // ステップ1: 認証
  const loginPayload = JSON.stringify({
    username: 'testuser',
    password: 'testpass',
  });
  
  response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  let token = null;
  if (response.status === 200) {
    const body = JSON.parse(response.body);
    token = body.data.token;
  }
  
  sleep(0.5);
  
  // ステップ2: 認証済みリクエスト
  if (token) {
    response = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
  
  sleep(0.5);
  
  // ステップ3: データ作成
  const createPayload = JSON.stringify({
    name: `ユーザー${Date.now()}`,
    email: `user${Date.now()}@example.com`,
  });
  
  response = http.post(`${BASE_URL}/api/users`, createPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const multiStepEnd = Date.now();
  const multiStepDuration = multiStepEnd - multiStepStart;
  
  // トランザクション全体の時間を記録（複数のHTTPリクエストとsleepを含む）
  totalTransactionTime.add(multiStepDuration);
  
  sleep(1);
  
  // === パターン4: 大きなペイロードの測定 ===
  response = http.get(`${BASE_URL}/api/large-payload?size=50`);
  
  if (response.body) {
    payloadSize.add(response.body.length);
    console.log(`ペイロードサイズ: ${response.body.length} bytes`);
  }
  
  sleep(1);
  
  // トランザクション全体の終了
  const transactionEnd = Date.now();
  const transactionDuration = transactionEnd - transactionStart;
  totalTransactionTime.add(transactionDuration);
}

/**
 * 実行方法:
 * k6 run scenarios/04-metrics/04-trends.js
 * 
 * Trendメトリクスの統計情報:
 * - min: 最小値
 * - max: 最大値
 * - avg: 平均値
 * - med: 中央値
 * - p(90), p(95), p(99): パーセンタイル
 * 
 * パーセンタイルの重要性:
 * - 平均値だけでは外れ値の影響を受けやすい
 * - p(95)やp(99)で、ほとんどのユーザーの体験を把握
 * - SLA（Service Level Agreement）で使用される指標
 * 
 * 実践的な使用例:
 * 
 * 1. APIレスポンスタイムの測定
 *    const apiResponseTime = new Trend('api_response_time');
 *    apiResponseTime.add(response.timings.duration);
 * 
 * 2. データベースクエリ時間
 *    const dbQueryTime = new Trend('db_query_time');
 *    dbQueryTime.add(queryDuration);
 * 
 * 3. キャッシュヒット率の分析
 *    const cacheLatency = new Trend('cache_latency');
 *    cacheLatency.add(latency);
 * 
 * 4. サードパーティAPI呼び出し時間
 *    const externalApiTime = new Trend('external_api_time');
 *    externalApiTime.add(duration);
 * 
 * タイミング情報の詳細:
 * - response.timings.blocked: キューイング時間
 * - response.timings.connecting: TCP接続時間
 * - response.timings.tls_handshaking: TLSハンドシェイク時間
 * - response.timings.sending: リクエスト送信時間
 * - response.timings.waiting: サーバー処理時間（TTFB）
 * - response.timings.receiving: レスポンス受信時間
 * - response.timings.duration: 合計時間
 * 
 * InfluxDB + Grafanaでの可視化:
 * - 時系列グラフで推移を表示
 * - パーセンタイルごとに複数の線を表示
 * - 負荷との相関を分析
 */
