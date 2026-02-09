import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 04. スパイクテスト（Spike Test）
 * 
 * 目的:
 * - 急激な負荷変動に対するシステムの反応を確認
 * - オートスケーリングの動作確認
 * - トラフィックの急増に対する耐性を検証
 * 
 * 特徴:
 * - 短時間で大幅に負荷を増加・減少させる
 * - VU数: 通常時から一気にピーク（例: 10 → 200 VU）
 * - スパイクの持続時間: 短い（数秒～数分）
 * 
 * いつ使う:
 * - フラッシュセールやイベント時の対策
 * - SNSでのバズを想定
 * - オートスケーリングのテスト
 */

export const options = {
  stages: [
    { duration: '10s', target: 10 },    // 10秒で10 VUへランプアップ（通常状態）
    { duration: '1m', target: 10 },     // 1分間10 VUを維持
    { duration: '10s', target: 200 },   // 🚀 10秒で200 VUへ急増（スパイク）
    { duration: '3m', target: 200 },    // 3分間200 VUを維持（スパイク継続）
    { duration: '10s', target: 10 },    // 10秒で10 VUへ急減
    { duration: '3m', target: 10 },     // 3分間10 VUを維持（回復確認）
    { duration: '10s', target: 0 },     // 10秒で0 VUへ
  ],

  thresholds: {
    http_req_failed: ['rate<0.15'],     // 失敗率15%未満（スパイク時は許容）
    http_req_duration: ['p(99)<5000'],  // 99%のリクエストが5秒未満
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const response = http.get(`${BASE_URL}/api/users`);

  check(response, {
    'リクエスト成功': (r) => r.status === 200 || r.status === 429 || r.status === 503,
  });

  // スパイク時は待機時間を短くして、より多くのリクエストを送信
  sleep(0.5);
}

/**
 * 実行方法:
 * k6 run scenarios/02-load-patterns/04-spike-test.js
 * 
 * 観察ポイント:
 * 1. スパイク発生時のレスポンスタイム
 * 2. エラー率の変化
 * 3. オートスケーリングが発動するか
 * 4. レートリミットやキューイングの動作
 * 5. スパイク後の回復時間
 * 
 * 期待される挙動:
 * ✅ エラー率は一時的に上昇するが、致命的にはならない
 * ✅ レスポンスタイムは劣化するが、許容範囲内
 * ✅ スパイク後、正常な状態に回復する
 * ✅ システムがクラッシュしない
 * 
 * 注意:
 * - オートスケーリングの設定を確認しておくこと
 * - レートリミットの設定を確認しておくこと
 * - キャッシュの動作を確認しておくこと
 */
