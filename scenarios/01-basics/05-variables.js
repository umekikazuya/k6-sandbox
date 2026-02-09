import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 05. 環境変数と設定の外部化
 * 
 * テスト設定を外部化することで、異なる環境（開発、ステージング、本番）
 * に対して同じスクリプトを使用できます。
 * 
 * 実行方法の例:
 * 1. 環境変数を使用:
 *    BASE_URL=http://localhost:3000 k6 run scenarios/01-basics/05-variables.js
 * 
 * 2. コマンドライン引数で設定を上書き:
 *    k6 run --vus 10 --duration 1m scenarios/01-basics/05-variables.js
 * 
 * 3. 環境ごとの設定ファイルを使用（JSONファイルなど）
 */

// 環境変数から設定を取得（デフォルト値を設定）
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = __ENV.VUS || 3;
const DURATION = __ENV.DURATION || '20s';

console.log(`設定情報:`);
console.log(`  BASE_URL: ${BASE_URL}`);
console.log(`  VUS: ${VUS}`);
console.log(`  DURATION: ${DURATION}`);

export const options = {
  vus: parseInt(VUS),
  duration: DURATION,

  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  // APIのベースURLを使用
  const response = http.get(`${BASE_URL}/api/users`);

  check(response, {
    'ステータスは200': (r) => r.status === 200,
    'レスポンスにsuccessフィールドが存在': (r) => {
      const body = JSON.parse(r.body);
      return body.success !== undefined;
    },
  });

  sleep(1);
}

/**
 * 実行例:
 * 
 * 1. デフォルト設定で実行:
 *    k6 run scenarios/01-basics/05-variables.js
 * 
 * 2. カスタム設定で実行:
 *    BASE_URL=http://staging-api.example.com VUS=10 DURATION=1m \
 *      k6 run scenarios/01-basics/05-variables.js
 * 
 * 3. Docker環境で実行:
 *    docker run --rm -i --network=host \
 *      -e BASE_URL=http://localhost:3000 \
 *      grafana/k6 run - < scenarios/01-basics/05-variables.js
 */
