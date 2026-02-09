import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 06. バッチリクエストと並列処理
 * 
 * 複数のリクエストを並列実行したり、バッチ処理を行う
 * パターンをテストします。
 * 
 * シナリオ:
 * 1. 複数のAPIを並列で呼び出し
 * 2. バッチリクエスト
 * 3. ページネーション処理
 * 
 * 学べること:
 * - http.batch() による並列リクエスト
 * - 複数エンドポイントの同時負荷
 * - ページネーションの実装
 * - レスポンスタイムの最適化
 */

export const options = {
  vus: 5,
  duration: '1m',
  
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{type:parallel}': ['p(95)<500'],
    'http_req_duration{type:sequential}': ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // パターン1: 順次実行（比較用）
  console.log('=== 順次実行 ===');
  const startSequential = Date.now();
  
  http.get(`${BASE_URL}/api/users/1`, { tags: { type: 'sequential' } });
  http.get(`${BASE_URL}/api/users/2`, { tags: { type: 'sequential' } });
  http.get(`${BASE_URL}/api/users/3`, { tags: { type: 'sequential' } });
  
  const sequentialTime = Date.now() - startSequential;
  console.log(`順次実行時間: ${sequentialTime}ms`);
  
  sleep(2);
  
  // パターン2: 並列実行（http.batch）
  console.log('=== 並列実行 ===');
  const startParallel = Date.now();
  
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/users/1`, null, { tags: { type: 'parallel' } }],
    ['GET', `${BASE_URL}/api/users/2`, null, { tags: { type: 'parallel' } }],
    ['GET', `${BASE_URL}/api/users/3`, null, { tags: { type: 'parallel' } }],
    ['GET', `${BASE_URL}/health`, null, { tags: { type: 'parallel' } }],
  ]);
  
  const parallelTime = Date.now() - startParallel;
  console.log(`並列実行時間: ${parallelTime}ms`);
  console.log(`高速化率: ${((1 - parallelTime / sequentialTime) * 100).toFixed(2)}%`);
  
  // すべてのレスポンスを検証
  check(responses, {
    '並列リクエスト: すべて成功': (r) => r.every(res => res.status === 200),
  });
  
  sleep(2);
  
  // パターン3: 異なるエンドポイントへの並列アクセス
  const mixedResponses = http.batch([
    ['GET', `${BASE_URL}/health`, null, { tags: { endpoint: 'health' } }],
    ['GET', `${BASE_URL}/api/users`, null, { tags: { endpoint: 'users' } }],
    ['GET', `${BASE_URL}/api/users/1`, null, { tags: { endpoint: 'user_detail' } }],
    ['POST', `${BASE_URL}/api/users`, JSON.stringify({
      name: 'バッチユーザー',
      email: `batch_${Date.now()}@example.com`,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'create_user' },
    }],
  ]);
  
  check(mixedResponses[0], { 'ヘルスチェック成功': (r) => r.status === 200 });
  check(mixedResponses[1], { 'ユーザー一覧取得成功': (r) => r.status === 200 });
  check(mixedResponses[2], { 'ユーザー詳細取得成功': (r) => r.status === 200 });
  check(mixedResponses[3], { 'ユーザー作成成功': (r) => r.status === 201 });
  
  sleep(2);
  
  // パターン4: ページネーション（順次）
  console.log('=== ページネーション ===');
  const pages = 3;
  
  for (let page = 1; page <= pages; page++) {
    const pageRes = http.get(
      `${BASE_URL}/api/large-payload?size=${10 * page}`,
      { tags: { type: 'pagination', page: `page_${page}` } }
    );
    
    check(pageRes, {
      [`ページ${page}: 取得成功`]: (r) => r.status === 200,
    });
  }
  
  sleep(3);
}

/**
 * 実行方法:
 * k6 run scenarios/03-realistic/06-batch-requests.js
 * 
 * http.batch() の利点:
 * 1. レスポンスタイムの短縮
 *    - 複数のリクエストを並列実行することで全体の時間を削減
 * 2. ネットワークの有効活用
 *    - 複数のHTTP/2コネクションを活用
 * 3. より現実的な負荷
 *    - ブラウザの並列リクエストを再現
 * 
 * 使用例:
 * - ダッシュボードの初期表示（複数のAPIを同時呼び出し）
 * - 画像の一括ダウンロード
 * - マイクロサービス間の並列呼び出し
 * 
 * 注意点:
 * - batch内のすべてのリクエストは同じVU内で実行される
 * - あまり多くのリクエストを詰め込みすぎない
 * - サーバー側の同時接続数制限に注意
 * 
 * ベストプラクティス:
 * - 関連するリクエストをグループ化
 * - 独立したリクエストのみを並列化
 * - エラーハンドリングを適切に実装
 */
