import http from 'k6/http';
import { check, group, sleep } from 'k6';

/**
 * 01. JWT認証フロー
 * 
 * 実際のアプリケーションでよく使われるJWT（JSON Web Token）認証フローを
 * テストするシナリオです。
 * 
 * フロー:
 * 1. ログインしてトークンを取得
 * 2. トークンを使って認証が必要なAPIにアクセス
 * 3. トークンの有効性を確認
 * 
 * 学べること:
 * - 認証トークンの取得と使用
 * - レスポンスからデータを抽出
 * - 後続リクエストでトークンを使用
 * - group() による論理的なグルーピング
 */

export const options = {
  vus: 5,
  duration: '30s',
  
  thresholds: {
    'http_req_duration{name:login}': ['p(95)<500'],
    'http_req_duration{name:authenticated}': ['p(95)<300'],
    'group_duration{group:::01_Login}': ['p(95)<1000'],
    'group_duration{group:::02_Authenticated_Request}': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  let authToken;
  
  // グループ1: ログイン
  group('01_Login', () => {
    const loginPayload = JSON.stringify({
      username: 'testuser',
      password: 'testpass',
    });
    
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );
    
    check(loginRes, {
      'ログイン: ステータスは200': (r) => r.status === 200,
      'ログイン: トークンが取得できた': (r) => {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.token;
      },
    });
    
    // レスポンスからトークンを抽出
    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body);
      authToken = body.data.token;
    }
  });
  
  sleep(1);
  
  // グループ2: 認証が必要なリクエスト
  if (authToken) {
    group('02_Authenticated_Request', () => {
      const headers = {
        'Authorization': `Bearer ${authToken}`,
      };
      
      const meRes = http.get(
        `${BASE_URL}/api/auth/me`,
        {
          headers: headers,
          tags: { name: 'authenticated' },
        }
      );
      
      check(meRes, {
        '認証リクエスト: ステータスは200': (r) => r.status === 200,
        '認証リクエスト: ユーザー情報が取得できた': (r) => {
          const body = JSON.parse(r.body);
          return body.success && body.data && body.data.userId;
        },
      });
    });
  }
  
  sleep(1);
  
  // グループ3: 認証エラーのテスト
  group('03_Invalid_Token', () => {
    const invalidHeaders = {
      'Authorization': 'Bearer invalid-token',
    };
    
    const invalidRes = http.get(
      `${BASE_URL}/api/auth/me`,
      { headers: invalidHeaders }
    );
    
    check(invalidRes, {
      '無効なトークン: ステータスは401': (r) => r.status === 401,
    });
  });
  
  sleep(1);
}

/**
 * 実行方法:
 * k6 run scenarios/03-realistic/01-authentication.js
 * 
 * 実践的な応用:
 * 1. トークンの有効期限テスト
 * 2. リフレッシュトークンのフロー
 * 3. 複数ユーザーでの同時ログイン
 * 4. ログアウト処理
 * 
 * ポイント:
 * - group() でリクエストをグループ化すると分析が容易
 * - tags を使ってリクエストにラベル付け
 * - レスポンスからデータを抽出して次のリクエストで使用
 */
