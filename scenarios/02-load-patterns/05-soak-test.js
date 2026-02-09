import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 05. ソークテスト（Soak Test / Endurance Test）
 * 
 * 目的:
 * - 長時間の継続的な負荷でシステムの安定性を確認
 * - メモリリーク、リソースリークの検出
 * - データベース接続のプーリング問題の発見
 * - ログファイルの肥大化などの問題の検出
 * 
 * 特徴:
 * - VU数: 通常の負荷レベル（ロードテストと同程度）
 * - 実行時間: 長時間（数時間～数日）
 * - 継続的な負荷を維持
 * 
 * いつ使う:
 * - 本番リリース前の最終確認
 * - 長時間稼働時の安定性確認
 * - メモリリークの検出
 */

export const options = {
  stages: [
    { duration: '5m', target: 20 },     // 5分で20 VUへランプアップ
    { duration: '1h', target: 20 },     // 1時間20 VUを維持（本番では数時間～数日）
    { duration: '5m', target: 0 },      // 5分で0 VUへランプダウン
  ],

  thresholds: {
    // ソークテストでは厳しい閾値を設定（長時間安定していることが重要）
    http_req_failed: ['rate<0.01'],     // 失敗率1%未満
    http_req_duration: [
      'p(95)<500',                      // 95%のリクエストが500ms未満
      'p(99)<1000',                     // 99%のリクエストが1000ms未満
    ],
    checks: ['rate>0.99'],              // チェック成功率99%以上
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 典型的なユーザー行動をシミュレート

  // 1. ユーザー一覧取得
  let response = http.get(`${BASE_URL}/api/users`);
  check(response, {
    'ユーザー一覧取得成功': (r) => r.status === 200,
  });
  sleep(1);

  // 2. ユーザー詳細取得
  const userId = Math.floor(Math.random() * 10) + 1;
  response = http.get(`${BASE_URL}/api/users/${userId}`);
  check(response, {
    'ユーザー詳細取得成功': (r) => r.status === 200,
  });
  sleep(2);

  // 3. データ作成（一部のユーザーのみ）
  if (Math.random() < 0.05) {
    const payload = JSON.stringify({
      name: `ユーザー${Date.now()}`,
      email: `user${Date.now()}@example.com`,
    });

    response = http.post(`${BASE_URL}/api/users`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(response, {
      'ユーザー作成成功': (r) => r.status === 201,
    });
    sleep(1);
  }

  sleep(2);
}

/**
 * 実行方法（短縮版 - テスト用）:
 * k6 run scenarios/02-load-patterns/05-soak-test.js
 * 
 * 実行方法（本番 - 長時間）:
 * オプションのstagesを以下に変更:
 * { duration: '10m', target: 20 },   // 10分でランプアップ
 * { duration: '6h', target: 20 },    // 6時間維持（または24h, 48h）
 * { duration: '10m', target: 0 },    // 10分でランプダウン
 * 
 * 監視ポイント:
 * 1. メモリ使用量が徐々に増加していないか（メモリリーク）
 * 2. CPU使用率が安定しているか
 * 3. データベース接続数が増加し続けていないか
 * 4. ディスク使用量（ログファイルなど）
 * 5. レスポンスタイムが時間経過で劣化していないか
 * 6. エラー率が徐々に上昇していないか
 * 
 * 注意:
 * - システムの監視を必ず並行して行うこと
 * - ログのローテーション設定を確認すること
 * - データベースの肥大化に注意すること
 * - 本番環境での実施は避けること（ステージング環境を推奨）
 */
