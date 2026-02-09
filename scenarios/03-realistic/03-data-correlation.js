import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';

/**
 * 03. データ相関（Data Correlation）
 * 
 * 前のリクエストのレスポンスから値を抽出し、
 * 次のリクエストで使用するパターンです。
 * 
 * シナリオ:
 * 1. ユーザー一覧を取得
 * 2. レスポンスからランダムにユーザーIDを抽出
 * 3. そのユーザーIDで詳細を取得
 * 4. ユーザー情報を更新
 * 5. 更新したユーザーを削除
 * 
 * 学べること:
 * - レスポンスデータの抽出と再利用
 * - 動的なリクエストパラメータ
 * - JSONレスポンスの解析
 * - SharedArrayによるテストデータ管理
 */

// テストデータをSharedArrayで管理（メモリ効率的）
const testData = new SharedArray('users', function () {
  return [
    { name: '山田太郎', email: 'yamada@example.com' },
    { name: '佐藤花子', email: 'sato@example.com' },
    { name: '鈴木一郎', email: 'suzuki@example.com' },
    { name: '田中美咲', email: 'tanaka@example.com' },
    { name: '高橋健太', email: 'takahashi@example.com' },
  ];
});

export const options = {
  vus: 5,
  duration: '1m',
  
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  let userId;
  let userName;
  let userEmail;
  
  group('Data_Correlation_Flow', () => {
    // ステップ1: ユーザー一覧を取得
    group('Step1_Get_Users', () => {
      const listRes = http.get(`${BASE_URL}/api/users`);
      
      const listCheck = check(listRes, {
        'ユーザー一覧取得成功': (r) => r.status === 200,
        'ユーザーデータが配列': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.data);
          } catch (e) {
            return false;
          }
        },
      });
      
      // レスポンスからランダムにユーザーIDを抽出
      if (listCheck && listRes.status === 200) {
        try {
          const body = JSON.parse(listRes.body);
          if (body.data && body.data.length > 0) {
            const randomIndex = Math.floor(Math.random() * body.data.length);
            const user = body.data[randomIndex];
            userId = user.id;
            console.log(`選択されたユーザーID: ${userId}`);
          }
        } catch (e) {
          console.error('JSONパースエラー:', e);
        }
      }
      
      sleep(1);
    });
    
    // ステップ2: 抽出したIDでユーザー詳細を取得
    if (userId) {
      group('Step2_Get_User_Detail', () => {
        const detailRes = http.get(`${BASE_URL}/api/users/${userId}`);
        
        check(detailRes, {
          'ユーザー詳細取得成功': (r) => r.status === 200,
          '取得したIDが一致': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.data.id === userId;
            } catch (e) {
              return false;
            }
          },
        });
        
        sleep(1);
      });
    }
    
    // ステップ3: 新しいユーザーを作成してIDを取得
    group('Step3_Create_User', () => {
      const userData = testData[Math.floor(Math.random() * testData.length)];
      
      const createPayload = JSON.stringify({
        name: `${userData.name}_${Date.now()}`,
        email: `${Date.now()}_${userData.email}`,
      });
      
      const createRes = http.post(
        `${BASE_URL}/api/users`,
        createPayload,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      const createCheck = check(createRes, {
        'ユーザー作成成功': (r) => r.status === 201,
        '作成されたユーザーにIDが付与されている': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.id !== undefined;
          } catch (e) {
            return false;
          }
        },
      });
      
      // 作成したユーザーのIDを抽出
      if (createCheck && createRes.status === 201) {
        try {
          const body = JSON.parse(createRes.body);
          userId = body.data.id;
          userName = body.data.name;
          userEmail = body.data.email;
          console.log(`作成したユーザー: ID=${userId}, Name=${userName}`);
        } catch (e) {
          console.error('JSONパースエラー:', e);
        }
      }
      
      sleep(1);
    });
    
    // ステップ4: 作成したユーザーを更新
    if (userId) {
      group('Step4_Update_User', () => {
        const updatePayload = JSON.stringify({
          name: `${userName}_updated`,
          email: `updated_${userEmail}`,
        });
        
        const updateRes = http.put(
          `${BASE_URL}/api/users/${userId}`,
          updatePayload,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
        
        check(updateRes, {
          'ユーザー更新成功': (r) => r.status === 200,
        });
        
        sleep(1);
      });
      
      // ステップ5: 更新したユーザーを削除
      group('Step5_Delete_User', () => {
        const deleteRes = http.del(`${BASE_URL}/api/users/${userId}`);
        
        check(deleteRes, {
          'ユーザー削除成功': (r) => r.status === 200,
        });
        
        sleep(1);
      });
    }
  });
  
  sleep(2);
}

/**
 * 実行方法:
 * k6 run scenarios/03-realistic/03-data-correlation.js
 * 
 * データ相関のユースケース:
 * 1. 動的なIDの取得と使用
 * 2. セッションIDやトークンの引き継ぎ
 * 3. 注文番号の取得と追跡
 * 4. ページネーションのカーソル
 * 
 * ポイント:
 * - try-catch でJSONパースエラーをハンドリング
 * - SharedArray でメモリ効率的にテストデータを管理
 * - console.log でデバッグ情報を出力
 * - 各ステップで前のステップの結果を使用
 * 
 * 応用:
 * - 正規表現でHTMLから値を抽出
 * - JSONPath で複雑なJSONから値を抽出
 * - XMLレスポンスの解析
 */
