import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 01. スモークテスト（Smoke Test）
 * 
 * 目的:
 * - 最小限の負荷でシステムが正常に動作することを確認
 * - デプロイ前のサニティチェック
 * - スクリプトに致命的なエラーがないことを確認
 * 
 * 特徴:
 * - VU数: 1～2
 * - 実行時間: 1～5分
 * - 本番環境でも安全に実行可能
 * 
 * いつ使う:
 * - デプロイ前の最終チェック
 * - 新機能のリリース前
 * - 負荷テストの前段階として
 */

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // 30秒かけて1 VUにランプアップ
    { duration: '1m', target: 1 },   // 1分間1 VUを維持
    { duration: '30s', target: 0 },  // 30秒かけて0 VUにランプダウン
  ],

  thresholds: {
    // スモークテストでは厳しい閾値を設定
    http_req_failed: ['rate<0.01'],     // 失敗率1%未満
    http_req_duration: ['p(95)<200'],   // 95%のリクエストが200ms未満
    checks: ['rate>0.99'],              // チェック成功率99%以上
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 主要なエンドポイントをテスト

  // 1. ヘルスチェック
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'ヘルスチェック: ステータスは200': (r) => r.status === 200,
  });

  // 2. ユーザー一覧取得
  response = http.get(`${BASE_URL}/api/users`);
  check(response, {
    'ユーザー一覧: ステータスは200': (r) => r.status === 200,
    'ユーザー一覧: レスポンスタイムは200ms以下': (r) => r.timings.duration < 200,
  });

  // 3. ユーザー詳細取得
  response = http.get(`${BASE_URL}/api/users/1`);
  check(response, {
    'ユーザー詳細: ステータスは200': (r) => r.status === 200,
  });

  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/02-load-patterns/01-smoke-test.js
 * 
 * または Docker:
 * docker run --rm -i --network=host grafana/k6 run - < scenarios/02-load-patterns/01-smoke-test.js
 * 
 * 判定基準:
 * ✅ スモークテスト合格 → 次のテスト（ロードテスト）に進む
 * ❌ スモークテスト失敗 → 問題を修正してから再実行
 */
