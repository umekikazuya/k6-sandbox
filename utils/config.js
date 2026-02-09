/**
 * 共通設定管理
 */

// 環境変数から設定を取得
export const config = {
  // ベースURL
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',

  // 環境（dev, staging, production）
  environment: __ENV.ENVIRONMENT || 'dev',

  // Virtual Users数
  vus: parseInt(__ENV.VUS) || 10,

  // テスト実行時間
  duration: __ENV.DURATION || '1m',

  // タイムアウト設定
  timeout: parseInt(__ENV.TIMEOUT) || 30000, // 30秒
};

// 環境ごとの閾値設定
export const thresholds = {
  dev: {
    http_req_failed: ['rate<0.1'],        // 10%まで許容
    http_req_duration: ['p(95)<1000'],    // 1秒
    http_req_waiting: ['p(95)<800'],      // 800ms
    checks: ['rate>0.9'],                 // 90%以上
    iterations: ['count>10'],             // 最低10イテレーション
  },

  staging: {
    http_req_failed: ['rate<0.05'],       // 5%まで許容
    http_req_duration: ['p(95)<500'],     // 500ms
    http_req_waiting: ['p(95)<400'],      // 400ms
    checks: ['rate>0.95'],                // 95%以上
    iterations: ['count>50'],             // 最低50イテレーション
  },

  production: {
    http_req_failed: ['rate<0.01'],       // 1%まで許容
    http_req_duration: [
      'p(95)<300',                        // 300ms
      'p(99)<500',                        // 500ms
    ],
    http_req_waiting: ['p(95)<250'],      // 250ms
    checks: ['rate>0.99'],                // 99%以上
    iterations: ['count>100'],            // 最低100イテレーション
  },
};

/**
 * 現在の環境に応じた閾値を取得
 * 
 * @returns {Object} - 閾値設定
 */
export function getThresholds() {
  return thresholds[config.environment] || thresholds.dev;
}

/**
 * k6のoptionsオブジェクトを生成
 * 
 * @param {Object} customOptions - カスタム設定
 * @returns {Object} - k6 options
 */
export function buildOptions(customOptions = {}) {
  return {
    vus: config.vus,
    duration: config.duration,
    thresholds: getThresholds(),
    ...customOptions,
  };
}

/**
 * 設定情報をコンソールに出力
 */
export function printConfig() {
  console.log('=== k6 Configuration ===');
  console.log(`Environment: ${config.environment}`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`VUs: ${config.vus}`);
  console.log(`Duration: ${config.duration}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log('=======================');
}
