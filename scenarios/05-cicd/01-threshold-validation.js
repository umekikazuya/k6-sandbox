import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 01. CI/CD用の閾値設定
 * 
 * CI/CDパイプラインで実行するための負荷テストスクリプトです。
 * 厳密な閾値を設定し、基準を満たさない場合はビルドを失敗させます。
 * 
 * 特徴:
 * - 短時間で実行（CI/CDに適した実行時間）
 * - 明確な合格/不合格基準
 * - 非ゼロの終了コードで失敗を通知
 * - 環境変数による設定の柔軟性
 * 
 * 学べること:
 * - CI/CD向けの閾値設定
 * - 環境ごとの基準の使い分け
 * - 失敗時の挙動
 */

// 環境変数から設定を取得
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ENVIRONMENT = __ENV.ENVIRONMENT || 'dev'; // dev, staging, production

// 環境ごとに異なる閾値を設定
const thresholds = {
  dev: {
    http_req_failed: ['rate<0.1'],        // 開発環境: 10%まで許容
    http_req_duration: ['p(95)<1000'],    // 開発環境: 1秒
    checks: ['rate>0.9'],                 // 開発環境: 90%以上
  },
  staging: {
    http_req_failed: ['rate<0.05'],       // ステージング: 5%まで許容
    http_req_duration: ['p(95)<500'],     // ステージング: 500ms
    checks: ['rate>0.95'],                // ステージング: 95%以上
  },
  production: {
    http_req_failed: ['rate<0.01'],       // 本番: 1%まで許容
    http_req_duration: ['p(95)<300'],     // 本番: 300ms
    checks: ['rate>0.99'],                // 本番: 99%以上
  },
};

export const options = {
  // CI/CDに適した設定（短時間で完了）
  stages: [
    { duration: '30s', target: 10 },  // 30秒で10 VUにランプアップ
    { duration: '1m', target: 10 },   // 1分間10 VUを維持
    { duration: '30s', target: 0 },   // 30秒でランプダウン
  ],
  
  // 環境に応じた閾値を使用
  thresholds: thresholds[ENVIRONMENT] || thresholds.dev,
  
  // タグを追加して環境を識別
  tags: {
    environment: ENVIRONMENT,
    ci: 'true',
  },
};

export default function () {
  // ヘルスチェック
  let response = http.get(`${BASE_URL}/health`);
  
  check(response, {
    'ヘルスチェック成功': (r) => r.status === 200,
    'レスポンスタイム許容範囲': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // 主要エンドポイント
  response = http.get(`${BASE_URL}/api/users`);
  
  check(response, {
    'API呼び出し成功': (r) => r.status === 200,
    'レスポンスにデータ': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1);
  
  // 認証エンドポイント（重要）
  const loginPayload = JSON.stringify({
    username: 'testuser',
    password: 'testpass',
  });
  
  response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    '認証成功': (r) => r.status === 200,
    'トークン取得': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1);
}

/**
 * 実行方法:
 * 
 * ローカル（開発環境）:
 * k6 run scenarios/05-cicd/01-threshold-validation.js
 * 
 * ステージング環境:
 * ENVIRONMENT=staging BASE_URL=https://staging-api.example.com \
 *   k6 run scenarios/05-cicd/01-threshold-validation.js
 * 
 * 本番環境（注意！）:
 * ENVIRONMENT=production BASE_URL=https://api.example.com \
 *   k6 run scenarios/05-cicd/01-threshold-validation.js
 * 
 * 終了コード:
 * - 0: すべての閾値をクリア（ビルド成功）
 * - 非0: いずれかの閾値を超過（ビルド失敗）
 * 
 * GitHub Actionsでの使用例:
 * 
 * - name: Run k6 load test
 *   run: |
 *     k6 run scenarios/05-cicd/01-threshold-validation.js
 *   env:
 *     ENVIRONMENT: staging
 *     BASE_URL: ${{ secrets.STAGING_API_URL }}
 * 
 * - name: Check test results
 *   if: failure()
 *   run: echo "Load test failed! Check the logs above."
 * 
 * CI/CDでの閾値設定のベストプラクティス:
 * 
 * 1. 環境ごとに適切な基準を設定
 *    - 開発: 緩い基準（早くフィードバック）
 *    - ステージング: 本番に近い基準
 *    - 本番: 厳しい基準（カナリアリリースなど）
 * 
 * 2. 実行時間は短く（5分以内を推奨）
 *    - CI/CDの待ち時間を最小化
 *    - フィードバックサイクルを高速化
 * 
 * 3. クリティカルな機能に焦点を当てる
 *    - すべてを網羅せず、重要な部分のみ
 *    - 詳細な負荷テストは別途実施
 * 
 * 4. 閾値は段階的に厳しくする
 *    - 最初は緩めに設定
 *    - パフォーマンス改善と共に厳しくする
 */
