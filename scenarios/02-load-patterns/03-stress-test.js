import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 03. ストレステスト（Stress Test）
 * 
 * 目的:
 * - システムの限界点を見極める
 * - 高負荷時のシステム挙動を観察
 * - 障害が発生した後の回復力を確認
 * 
 * 特徴:
 * - VU数: 通常の負荷を超える（例: 50～200+ VU）
 * - 段階的に負荷を増加させる
 * - システムが破綻するポイントを見つける
 * 
 * いつ使う:
 * - システムの耐久性を確認したいとき
 * - キャパシティプランニング
 * - ピーク時の挙動を予測したいとき
 */

export const options = {
  stages: [
    { duration: '2m', target: 20 },    // 2分で20 VUへランプアップ（ウォームアップ）
    { duration: '5m', target: 20 },    // 5分間20 VUを維持
    { duration: '2m', target: 50 },    // 2分で50 VUへ増加
    { duration: '5m', target: 50 },    // 5分間50 VUを維持
    { duration: '2m', target: 100 },   // 2分で100 VUへ増加
    { duration: '5m', target: 100 },   // 5分間100 VUを維持（ストレス状態）
    { duration: '5m', target: 0 },     // 5分かけて0 VUへランプダウン（回復確認）
  ],
  
  thresholds: {
    // ストレステストでは閾値を緩めに設定
    http_req_failed: ['rate<0.1'],      // 失敗率10%未満
    http_req_duration: ['p(95)<2000'],  // 95%のリクエストが2秒未満
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // シンプルなリクエストパターン
  
  const response = http.get(`${BASE_URL}/api/users`);
  
  check(response, {
    'ステータスは200または503': (r) => r.status === 200 || r.status === 503,
    'レスポンスタイムは5秒以内': (r) => r.timings.duration < 5000,
  });
  
  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/02-load-patterns/03-stress-test.js
 * 
 * 観察ポイント:
 * 1. どの時点でレスポンスタイムが劣化し始めるか
 * 2. どの時点でエラー率が上昇するか
 * 3. 負荷が下がった後、システムが正常に回復するか
 * 4. CPU、メモリ、データベース接続数などのリソース使用率
 * 
 * 注意:
 * - 本番環境では実行しないこと
 * - システム監視を並行して行うこと
 * - 段階的に負荷を上げて、システムの挙動を観察すること
 */
