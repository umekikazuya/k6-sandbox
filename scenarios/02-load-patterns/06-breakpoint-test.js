import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 06. ブレークポイントテスト（Breakpoint Test）
 * 
 * 目的:
 * - システムが破綻する具体的なポイントを特定
 * - 最大許容負荷を把握
 * - ボトルネックの特定
 * - キャパシティプランニングのための正確なデータ取得
 * 
 * 特徴:
 * - VU数を徐々に増やし続ける
 * - システムが破綻するまで続ける
 * - 破綻点を明確に特定
 * 
 * いつ使う:
 * - システムの限界を正確に知りたいとき
 * - スケーリング計画を立てるとき
 * - インフラのサイジング決定時
 */

export const options = {
  // executor: 'ramping-arrival-rate' を使用して、段階的にリクエスト数を増加
  scenarios: {
    breakpoint: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },    // 2分で20 VU
        { duration: '2m', target: 40 },    // 2分で40 VU
        { duration: '2m', target: 60 },    // 2分で60 VU
        { duration: '2m', target: 80 },    // 2分で80 VU
        { duration: '2m', target: 100 },   // 2分で100 VU
        { duration: '2m', target: 120 },   // 2分で120 VU
        { duration: '2m', target: 140 },   // 2分で140 VU
        { duration: '2m', target: 160 },   // 2分で160 VU
        { duration: '2m', target: 180 },   // 2分で180 VU
        { duration: '2m', target: 200 },   // 2分で200 VU
        // 必要に応じてさらに追加
      ],
      gracefulRampDown: '1m',
    },
  },

  // 閾値は設定しない（破綻させることが目的）
  // または、破綻の判定基準を設定
  thresholds: {
    http_req_failed: ['rate<0.5'],      // 失敗率が50%を超えたら明らかに破綻
    http_req_duration: ['p(99)<10000'], // 99%が10秒未満（これを超えると使用不可）
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const response = http.get(`${BASE_URL}/api/users`);

  check(response, {
    'ステータスコード確認': (r) => r.status < 500,
    'レスポンスタイムが10秒以内': (r) => r.timings.duration < 10000,
  });

  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/02-load-patterns/06-breakpoint-test.js
 * 
 * 結果の分析:
 * 1. レスポンスタイムのグラフを確認
 *    - どの時点から急激に劣化するか
 * 
 * 2. エラー率のグラフを確認
 *    - どの時点からエラーが増加するか
 * 
 * 3. スループット（http_reqs）を確認
 *    - どの時点でスループットが頭打ちになるか
 * 
 * 4. システムメトリクスを確認
 *    - CPU使用率が100%に達している
 *    - メモリが枯渇している
 *    - データベース接続プールが枯渇している
 *    - ネットワーク帯域が飽和している
 * 
 * ブレークポイントの判定基準:
 * - レスポンスタイムが許容値を超える
 * - エラー率が急激に上昇する
 * - スループットが頭打ちになる
 * - システムリソースが限界に達する
 * 
 * 例: 80 VUまでは安定、100 VUで劣化開始、120 VUで破綻
 * → ブレークポイントは100 VU
 * → 安全な運用は80 VU以下を推奨（余裕を持たせる）
 * 
 * 注意:
 * - 必ずテスト環境で実施すること
 * - システム監視を必ず並行して行うこと
 * - データベースやキャッシュなどの依存サービスも監視すること
 * - テスト後、システムが正常に回復することを確認すること
 */
