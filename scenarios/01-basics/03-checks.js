import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * 03. レスポンスの検証（Checks）
 * 
 * k6のcheck機能を使用して、レスポンスが期待通りかを検証します。
 * - ステータスコードの確認
 * - レスポンスボディの確認
 * - レスポンスタイムの確認
 * - JSONの内容検証
 * 
 * 注意: checkが失敗してもテストは停止しません。
 * メトリクスとして記録され、最後にサマリーで表示されます。
 */

export const options = {
  vus: 2,
  duration: '10s',
};

export default function () {
  const baseUrl = 'http://localhost:3000/api';
  
  // ===== ヘルスチェックエンドポイント =====
  let response = http.get('http://localhost:3000/health');
  
  check(response, {
    'ヘルスチェック: ステータスは200': (r) => r.status === 200,
    'ヘルスチェック: レスポンスタイムは200ms以下': (r) => r.timings.duration < 200,
    'ヘルスチェック: statusフィールドは"ok"': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'ok';
    },
  });
  
  // ===== ユーザーAPI =====
  response = http.get(`${baseUrl}/users`);
  
  check(response, {
    'ユーザー取得: ステータスは200': (r) => r.status === 200,
    'ユーザー取得: successフィールドはtrue': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
    'ユーザー取得: dataフィールドが配列': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.data);
    },
    'ユーザー取得: 最低1件のユーザーが存在': (r) => {
      const body = JSON.parse(r.body);
      return body.data.length > 0;
    },
  });
  
  // ===== POSTリクエストの検証 =====
  const payload = JSON.stringify({
    name: 'テストユーザー',
    email: 'test@example.com',
  });
  
  response = http.post(`${baseUrl}/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'ユーザー作成: ステータスは201': (r) => r.status === 201,
    'ユーザー作成: IDが生成されている': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.id !== undefined;
    },
  });
  
  // ===== エラーケースの検証 =====
  response = http.get(`${baseUrl}/nonexistent`);
  
  check(response, {
    '存在しないエンドポイント: ステータスは404': (r) => r.status === 404,
  });
  
  sleep(1);
}
