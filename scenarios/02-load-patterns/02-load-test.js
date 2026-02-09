import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 02. ロードテスト（Load Test）
 * 
 * 目的:
 * - 通常運用時の負荷でシステムのパフォーマンスを測定
 * - 期待されるトラフィックでのレスポンスタイムを確認
 * - システムのベースラインメトリクスを取得
 * 
 * 特徴:
 * - VU数: 平均的なトラフィックを想定（例: 10～100 VU）
 * - 実行時間: 5～30分
 * - 通常の負荷レベルを維持
 * 
 * いつ使う:
 * - システムの通常動作を検証したいとき
 * - パフォーマンスベースラインを確立したいとき
 * - 定期的なパフォーマンステストとして
 */

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // 2分かけて10 VUにランプアップ
    { duration: '5m', target: 10 },   // 5分間10 VUを維持（ピーク）
    { duration: '2m', target: 20 },   // 2分かけて20 VUに増加
    { duration: '5m', target: 20 },   // 5分間20 VUを維持
    { duration: '2m', target: 0 },    // 2分かけて0 VUにランプダウン
  ],

  thresholds: {
    http_req_failed: ['rate<0.05'],     // 失敗率5%未満
    http_req_duration: [
      'p(95)<500',                      // 95%のリクエストが500ms未満
      'p(99)<1000',                     // 99%のリクエストが1000ms未満
    ],
    checks: ['rate>0.95'],              // チェック成功率95%以上
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 典型的なユーザー行動をシミュレート

  // 1. トップページ（ユーザー一覧）
  let response = http.get(`${BASE_URL}/api/users`);
  check(response, {
    'ユーザー一覧取得成功': (r) => r.status === 200,
  });
  sleep(1);

  // 2. ユーザー詳細を表示
  const userId = Math.floor(Math.random() * 10) + 1;
  response = http.get(`${BASE_URL}/api/users/${userId}`);
  check(response, {
    'ユーザー詳細取得成功': (r) => r.status === 200,
  });
  sleep(2);

  // 3. 新しいユーザーを作成（10%の確率）
  if (Math.random() < 0.1) {
    const payload = JSON.stringify({
      name: `テストユーザー${Date.now()}`,
      email: `test${Date.now()}@example.com`,
    });

    response = http.post(`${BASE_URL}/api/users`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(response, {
      'ユーザー作成成功': (r) => r.status === 201,
    });
    sleep(1);
  }

  // 4. ランダムな遅延エンドポイント（実際のAPIの遅延をシミュレート）
  response = http.get(`${BASE_URL}/api/random-delay`);
  check(response, {
    'ランダム遅延エンドポイント成功': (r) => r.status === 200,
  });

  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/02-load-patterns/02-load-test.js
 * 
 * カスタム設定で実行:
 * BASE_URL=http://your-api.com k6 run scenarios/02-load-patterns/02-load-test.js
 * 
 * 結果の分析ポイント:
 * - http_req_duration: レスポンスタイムが許容範囲内か
 * - http_req_failed: エラー率が低いか
 * - iterations: 完了したイテレーション数
 * - vus: 仮想ユーザー数の推移
 */
