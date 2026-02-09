import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/**
 * 02. 複雑なユーザーフロー（User Journey）
 * 
 * 実際のユーザーが行う一連の操作をシミュレートします。
 * 
 * シナリオ: ECサイトでの買い物フロー
 * 1. ログイン
 * 2. 商品一覧を閲覧
 * 3. 商品詳細を表示（複数）
 * 4. カートに商品を追加
 * 5. ログアウト
 * 
 * 学べること:
 * - 複数ステップの連続したフロー
 * - セッション管理
 * - カスタムメトリクスの定義
 * - think time（ユーザーの思考時間）の実装
 */

// カスタムメトリクス
const purchaseAttempts = new Counter('purchase_attempts');
const purchaseSuccess = new Counter('purchase_success');

export const options = {
  scenarios: {
    user_journey: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
    },
  },
  
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{journey:login}': ['p(95)<500'],
    'http_req_duration{journey:browse}': ['p(95)<300'],
    'group_duration{group:::User_Journey}': ['avg<10000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  let authToken;
  
  group('User_Journey', () => {
    // ステップ1: ログイン
    group('Step1_Login', () => {
      const loginPayload = JSON.stringify({
        username: `user_${__VU}`,
        password: 'password123',
      });
      
      const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        loginPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { journey: 'login' },
        }
      );
      
      check(loginRes, {
        'ログイン成功': (r) => r.status === 200,
      });
      
      if (loginRes.status === 200) {
        const body = JSON.parse(loginRes.body);
        authToken = body.data.token;
      }
      
      sleep(1); // think time
    });
    
    if (!authToken) {
      return; // ログイン失敗時は処理を中断
    }
    
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
    
    // ステップ2: 商品一覧を閲覧
    group('Step2_Browse_Products', () => {
      const productsRes = http.get(
        `${BASE_URL}/api/users`, // ユーザー一覧をプロダクト一覧に見立てる
        {
          tags: { journey: 'browse' },
        }
      );
      
      check(productsRes, {
        '商品一覧取得成功': (r) => r.status === 200,
      });
      
      sleep(2); // ユーザーが一覧を眺める時間
    });
    
    // ステップ3: 商品詳細を表示（3つの商品を見る）
    group('Step3_View_Product_Details', () => {
      for (let i = 1; i <= 3; i++) {
        const productId = Math.floor(Math.random() * 10) + 1;
        
        const detailRes = http.get(
          `${BASE_URL}/api/users/${productId}`,
          { tags: { journey: 'product_detail' } }
        );
        
        check(detailRes, {
          [`商品詳細取得成功 (${i}/3)`]: (r) => r.status === 200,
        });
        
        sleep(3); // 商品詳細を読む時間
      }
    });
    
    // ステップ4: カートに追加（購入を想定）
    group('Step4_Add_To_Cart', () => {
      purchaseAttempts.add(1);
      
      const cartPayload = JSON.stringify({
        name: `商品_${Date.now()}`,
        email: `user_${__VU}@example.com`,
      });
      
      const cartRes = http.post(
        `${BASE_URL}/api/users`, // ユーザー作成を購入に見立てる
        cartPayload,
        { headers }
      );
      
      const success = check(cartRes, {
        'カート追加成功': (r) => r.status === 201,
      });
      
      if (success) {
        purchaseSuccess.add(1);
      }
      
      sleep(2);
    });
    
    // ステップ5: マイページを確認
    group('Step5_My_Page', () => {
      const myPageRes = http.get(
        `${BASE_URL}/api/auth/me`,
        { headers }
      );
      
      check(myPageRes, {
        'マイページ表示成功': (r) => r.status === 200,
      });
      
      sleep(1);
    });
  });
  
  sleep(5); // 次のユーザージャーニーまでの間隔
}

/**
 * 実行方法:
 * k6 run scenarios/03-realistic/02-user-journey.js
 * 
 * 結果の確認:
 * - group_duration で各ステップの所要時間を確認
 * - purchase_success / purchase_attempts でコンバージョン率を計算
 * 
 * 実践的な応用:
 * 1. 異なるユーザージャーニーパターンを定義
 *    - 新規ユーザー vs リピーター
 *    - モバイル vs デスクトップ
 * 2. 離脱率の測定
 * 3. ファネル分析
 * 
 * ポイント:
 * - think time（sleep）を適切に設定して実際のユーザー行動を再現
 * - カスタムメトリクスでビジネスKPIを測定
 * - group()で各ステップを明確に分離
 */
