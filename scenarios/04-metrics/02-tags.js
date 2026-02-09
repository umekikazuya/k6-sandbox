import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 02. タグ付けとフィルタリング
 * 
 * タグを使用してリクエストを分類し、特定のリクエストのみを
 * フィルタリングしてメトリクスを測定します。
 * 
 * タグの用途:
 * - エンドポイントごとの性能測定
 * - APIバージョンごとの比較
 * - 重要度による分類
 * - 地域やデータセンターによる分類
 * 
 * 学べること:
 * - タグの付け方
 * - タグを使った閾値の設定
 * - メトリクスのフィルタリング
 */

export const options = {
  vus: 5,
  duration: '1m',
  
  thresholds: {
    // 全体の閾値
    http_req_duration: ['p(95)<1000'],
    
    // タグでフィルタリングした閾値
    'http_req_duration{endpoint:users}': ['p(95)<300'],
    'http_req_duration{endpoint:auth}': ['p(95)<500'],
    'http_req_duration{endpoint:upload}': ['p(95)<1000'],
    
    // 優先度による閾値
    'http_req_duration{priority:critical}': ['p(99)<200'],
    'http_req_duration{priority:high}': ['p(99)<500'],
    'http_req_duration{priority:normal}': ['p(99)<1000'],
    
    // APIバージョンごとの閾値
    'http_req_duration{api_version:v1}': ['p(95)<400'],
    'http_req_duration{api_version:v2}': ['p(95)<300'],
    
    // 操作タイプごとの閾値
    'http_req_duration{operation:read}': ['p(95)<200'],
    'http_req_duration{operation:write}': ['p(95)<500'],
    
    // タグでフィルタリングした失敗率
    'http_req_failed{endpoint:auth}': ['rate<0.01'],
    'http_req_failed{priority:critical}': ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // タグ付け例1: エンドポイントごと
  let response = http.get(`${BASE_URL}/api/users`, {
    tags: {
      endpoint: 'users',
      priority: 'high',
      api_version: 'v1',
      operation: 'read',
      resource_type: 'list',
    },
  });
  
  check(response, {
    'ユーザー一覧: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // タグ付け例2: 認証エンドポイント（クリティカル）
  const loginPayload = JSON.stringify({
    username: 'testuser',
    password: 'testpass',
  });
  
  response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      endpoint: 'auth',
      priority: 'critical',
      api_version: 'v1',
      operation: 'write',
      action: 'login',
    },
  });
  
  check(response, {
    'ログイン: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // タグ付け例3: ユーザー詳細（通常優先度）
  response = http.get(`${BASE_URL}/api/users/1`, {
    tags: {
      endpoint: 'users',
      priority: 'normal',
      api_version: 'v1',
      operation: 'read',
      resource_type: 'detail',
    },
  });
  
  check(response, {
    'ユーザー詳細: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // タグ付け例4: データ作成（書き込み操作）
  const createPayload = JSON.stringify({
    name: 'テストユーザー',
    email: 'test@example.com',
  });
  
  response = http.post(`${BASE_URL}/api/users`, createPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      endpoint: 'users',
      priority: 'high',
      api_version: 'v2',
      operation: 'write',
      action: 'create',
    },
  });
  
  check(response, {
    'ユーザー作成: ステータスは201': (r) => r.status === 201,
  });
  
  sleep(1);
  
  // タグ付け例5: ファイルアップロード（低優先度だが時間がかかる）
  response = http.post(`${BASE_URL}/api/upload`, '{}', {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      endpoint: 'upload',
      priority: 'normal',
      api_version: 'v1',
      operation: 'write',
      resource_type: 'file',
    },
  });
  
  check(response, {
    'アップロード: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // タグ付け例6: 遅延エンドポイント（パフォーマンステスト用）
  response = http.get(`${BASE_URL}/api/delay/100`, {
    tags: {
      endpoint: 'delay',
      priority: 'low',
      api_version: 'v1',
      operation: 'read',
      test_type: 'performance',
    },
  });
  
  check(response, {
    '遅延エンドポイント: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/04-metrics/02-tags.js
 * 
 * タグのベストプラクティス:
 * 
 * 1. 一貫した命名規則を使用
 *    - endpoint: エンドポイント名
 *    - priority: critical/high/normal/low
 *    - api_version: v1/v2/v3
 *    - operation: read/write/delete
 * 
 * 2. 必要最小限のタグを使用
 *    - 多すぎるタグはメトリクスを複雑にする
 *    - 分析に必要なタグのみを付ける
 * 
 * 3. ビジネス価値の高いものから優先
 *    - クリティカルな機能には厳しい閾値
 *    - 優先度の低い機能には緩い閾値
 * 
 * 4. 環境やリージョンによる分類
 *    - region: us-east/us-west/eu-west
 *    - environment: dev/staging/production
 * 
 * 実践的な使用例:
 * 
 * // マイクロサービス環境
 * tags: {
 *   service: 'user-service',
 *   method: 'GET',
 *   endpoint: '/api/users',
 * }
 * 
 * // モバイルアプリ
 * tags: {
 *   platform: 'ios',
 *   app_version: '2.1.0',
 *   api_version: 'v2',
 * }
 * 
 * // A/Bテスト
 * tags: {
 *   variant: 'A',
 *   feature: 'new-checkout',
 * }
 * 
 * 結果の確認:
 * - タグごとにメトリクスが集計される
 * - 特定のタグのみの閾値チェックが可能
 * - Grafanaでタグごとにフィルタリング可能
 */
