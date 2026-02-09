import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

/**
 * 04. ファイルアップロード
 * 
 * ファイルアップロード機能の負荷テストを実施します。
 * 
 * シナリオ:
 * 1. 小さなファイルのアップロード
 * 2. 中サイズのファイルのアップロード
 * 3. マルチパートフォームデータの送信
 * 
 * 学べること:
 * - バイナリデータの送信
 * - FormDataの使用
 * - マルチパートフォームの扱い
 * - ファイルサイズによる負荷の違い
 */

export const options = {
  vus: 3,
  duration: '30s',
  
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{type:small_file}': ['p(95)<1000'],
    'http_req_duration{type:medium_file}': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ダミーファイルデータを生成
function generateFileContent(sizeInKB) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytesNeeded = sizeInKB * 1024;
  let content = '';
  
  for (let i = 0; i < bytesNeeded; i++) {
    content += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return content;
}

export default function () {
  // パターン1: シンプルなJSONペイロード（小さなデータ）
  const smallPayload = JSON.stringify({
    filename: 'small_file.txt',
    content: generateFileContent(1), // 1KB
    size: 1024,
  });
  
  let response = http.post(
    `${BASE_URL}/api/upload`,
    smallPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'small_file' },
    }
  );
  
  check(response, {
    '小ファイル: アップロード成功': (r) => r.status === 200,
    '小ファイル: レスポンスにファイル名': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.filename !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1);
  
  // パターン2: 中サイズのファイル
  const mediumPayload = JSON.stringify({
    filename: 'medium_file.txt',
    content: generateFileContent(10), // 10KB
    size: 10240,
  });
  
  response = http.post(
    `${BASE_URL}/api/upload`,
    mediumPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'medium_file' },
    }
  );
  
  check(response, {
    '中ファイル: アップロード成功': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // パターン3: FormDataを使用したマルチパートアップロード
  const fd = new FormData();
  fd.append('file', http.file(generateFileContent(5), 'test.txt'));
  fd.append('description', 'テストファイル');
  fd.append('category', 'document');
  
  response = http.post(
    `${BASE_URL}/api/upload`,
    fd.body(),
    {
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary },
      tags: { type: 'multipart' },
    }
  );
  
  check(response, {
    'マルチパート: アップロード成功': (r) => r.status === 200,
  });
  
  sleep(2);
}

/**
 * 実行方法:
 * k6 run scenarios/03-realistic/04-file-upload.js
 * 
 * ファイルアップロードのテストポイント:
 * 1. ファイルサイズによるレスポンスタイムの違い
 * 2. 同時アップロード数の制限
 * 3. ネットワーク帯域の使用率
 * 4. サーバー側のディスク書き込み性能
 * 
 * 実践的な応用:
 * - 大容量ファイル（数MB～数GB）のアップロード
 * - 複数ファイルの同時アップロード
 * - チャンクアップロード（分割アップロード）
 * - レジューム可能なアップロード
 * 
 * 注意点:
 * - 大きなファイルはk6実行マシンのメモリを消費
 * - ネットワーク帯域も考慮する
 * - サーバー側のストレージ容量に注意
 * 
 * 監視ポイント:
 * - http_req_sending: データ送信にかかる時間
 * - http_req_waiting: サーバー処理時間
 * - http_req_receiving: レスポンス受信時間
 * - data_sent: 送信データ量
 */
