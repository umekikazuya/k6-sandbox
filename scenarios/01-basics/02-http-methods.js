import http from 'k6/http';
import { sleep } from 'k6';

/**
 * 02. HTTPメソッドのテスト
 * 
 * RESTful APIの基本的なCRUD操作をテストします。
 * - GET: リソースの取得
 * - POST: リソースの作成
 * - PUT: リソースの更新
 * - DELETE: リソースの削除
 */

export const options = {
  vus: 1,
  iterations: 5,
};

export default function () {
  const baseUrl = 'http://localhost:3000/api';

  // 1. GET - ユーザー一覧を取得
  console.log('=== GET Request ===');
  let response = http.get(`${baseUrl}/users`);
  console.log(`GET Status: ${response.status}`);

  // 2. POST - 新しいユーザーを作成
  console.log('\n=== POST Request ===');
  const payload = JSON.stringify({
    name: '山田太郎',
    email: 'yamada@example.com',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  response = http.post(`${baseUrl}/users`, payload, params);
  console.log(`POST Status: ${response.status}`);
  console.log(`Created User: ${response.body}`);

  // 3. PUT - ユーザー情報を更新
  console.log('\n=== PUT Request ===');
  const updatePayload = JSON.stringify({
    name: '山田花子',
    email: 'yamada.hanako@example.com',
  });

  response = http.put(`${baseUrl}/users/1`, updatePayload, params);
  console.log(`PUT Status: ${response.status}`);

  // 4. DELETE - ユーザーを削除
  console.log('\n=== DELETE Request ===');
  response = http.del(`${baseUrl}/users/1`);
  console.log(`DELETE Status: ${response.status}`);

  sleep(1);
}
