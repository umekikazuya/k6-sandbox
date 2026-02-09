import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 04. 閾値（Thresholds）の設定
 * 
 * 閾値は、テストが成功したか失敗したかを判定するための条件です。
 * CI/CDパイプラインでテストを自動化する際に非常に重要です。
 * 
 * 閾値を超えた場合、k6は非ゼロの終了コードを返します。
 */

export const options = {
  vus: 5,
  duration: '30s',
  
  // 閾値の定義
  thresholds: {
    // HTTPリクエストの成功率が95%以上であること
    http_req_failed: ['rate<0.05'],
    
    // HTTPリクエストの継続時間（レスポンスタイム）
    http_req_duration: [
      'p(95)<500',  // 95パーセンタイルが500ms未満
      'p(99)<1000', // 99パーセンタイルが1000ms未満
      'avg<300',    // 平均が300ms未満
    ],
    
    // Check（検証）の成功率が90%以上であること
    checks: ['rate>0.9'],
    
    // イテレーション完了率
    iterations: ['count>100'], // 最低100回のイテレーションを完了
  },
};

export default function () {
  const baseUrl = 'http://localhost:3000/api';
  
  // 通常のエンドポイントをテスト
  let response = http.get(`${baseUrl}/users`);
  
  check(response, {
    'ステータスは200': (r) => r.status === 200,
    'レスポンスタイムは500ms以下': (r) => r.timings.duration < 500,
  });
  
  // ランダムな遅延を持つエンドポイント
  response = http.get(`${baseUrl}/random-delay`);
  
  check(response, {
    'ランダム遅延: ステータスは200': (r) => r.status === 200,
  });
  
  sleep(1);
}

/**
 * テスト実行方法:
 * k6 run scenarios/01-basics/04-thresholds.js
 * 
 * 結果の見方:
 * - 緑色のチェックマーク: 閾値をクリア
 * - 赤色のバツマーク: 閾値を超過（テスト失敗）
 * 
 * 終了コード:
 * - 0: すべての閾値をクリア
 * - 非0: いずれかの閾値を超過
 */
