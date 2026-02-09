import http from 'k6/http';
import { check, group, sleep } from 'k6';

/**
 * 03. グルーピングによる分析
 * 
 * group() 関数を使用してリクエストを論理的にグループ化し、
 * グループごとのメトリクスを測定します。
 * 
 * グループの用途:
 * - ユーザージャーニーの各ステップを分離
 * - 機能ごとの性能測定
 * - ページごとの分析
 * - トランザクションの境界を明確にする
 * 
 * 学べること:
 * - group() の使い方
 * - ネストしたグループ
 * - group_duration メトリクスの活用
 * - グループごとの閾値設定
 */

export const options = {
  vus: 5,
  duration: '1m',
  
  thresholds: {
    // 全体の閾値
    http_req_duration: ['p(95)<1000'],
    
    // グループごとの閾値
    'group_duration{group:::01_Home_Page}': ['p(95)<500'],
    'group_duration{group:::02_User_Registration}': ['p(95)<2000'],
    'group_duration{group:::02_User_Registration::Step1_Input_Form}': ['p(95)<300'],
    'group_duration{group:::02_User_Registration::Step2_Submit}': ['p(95)<1000'],
    'group_duration{group:::03_Shopping_Cart}': ['p(95)<1500'],
    'group_duration{group:::04_Checkout}': ['p(95)<3000'],
    
    // グループ内の特定リクエストの閾値
    'http_req_duration{group:::02_User_Registration}': ['p(95)<1000'],
    'http_req_duration{group:::04_Checkout}': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // グループ1: ホームページ表示
  group('01_Home_Page', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'ホームページ: ステータスは200': (r) => r.status === 200,
    });
    sleep(1);
  });
  
  // グループ2: ユーザー登録（ネストしたグループ）
  group('02_User_Registration', () => {
    let userId;
    
    // ステップ1: 入力フォーム表示
    group('Step1_Input_Form', () => {
      const response = http.get(`${BASE_URL}/api/users`);
      check(response, {
        'フォーム表示: ステータスは200': (r) => r.status === 200,
      });
      sleep(2); // ユーザーがフォームに入力する時間
    });
    
    // ステップ2: 登録送信
    group('Step2_Submit', () => {
      const payload = JSON.stringify({
        name: `ユーザー${Date.now()}`,
        email: `user${Date.now()}@example.com`,
      });
      
      const response = http.post(`${BASE_URL}/api/users`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        '登録成功: ステータスは201': (r) => r.status === 201,
      });
      
      // ユーザーIDを抽出
      if (response.status === 201) {
        const body = JSON.parse(response.body);
        userId = body.data.id;
      }
      
      sleep(1);
    });
    
    // ステップ3: 確認メール送信（シミュレート）
    group('Step3_Confirmation', () => {
      if (userId) {
        const response = http.get(`${BASE_URL}/api/users/${userId}`);
        check(response, {
          '確認: ステータスは200': (r) => r.status === 200,
        });
      }
      sleep(1);
    });
  });
  
  sleep(2);
  
  // グループ3: ショッピングカート
  group('03_Shopping_Cart', () => {
    // 商品一覧を表示
    group('Browse_Products', () => {
      const response = http.get(`${BASE_URL}/api/users`);
      check(response, {
        '商品一覧: ステータスは200': (r) => r.status === 200,
      });
      sleep(2);
    });
    
    // カートに追加
    group('Add_To_Cart', () => {
      const payload = JSON.stringify({
        name: '商品A',
        email: 'product@example.com',
      });
      
      const response = http.post(`${BASE_URL}/api/users`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'カート追加: ステータスは201': (r) => r.status === 201,
      });
      sleep(1);
    });
    
    // カート確認
    group('View_Cart', () => {
      const response = http.get(`${BASE_URL}/api/users`);
      check(response, {
        'カート表示: ステータスは200': (r) => r.status === 200,
      });
      sleep(1);
    });
  });
  
  sleep(1);
  
  // グループ4: チェックアウト（複雑な処理）
  group('04_Checkout', () => {
    // ステップ1: 配送先情報入力
    group('Shipping_Info', () => {
      const response = http.get(`${BASE_URL}/api/users/1`);
      check(response, {
        '配送先: ステータスは200': (r) => r.status === 200,
      });
      sleep(2);
    });
    
    // ステップ2: 支払い方法選択
    group('Payment_Method', () => {
      const response = http.get(`${BASE_URL}/api/users/2`);
      check(response, {
        '支払い方法: ステータスは200': (r) => r.status === 200,
      });
      sleep(1);
    });
    
    // ステップ3: 注文確認
    group('Order_Confirmation', () => {
      const payload = JSON.stringify({
        name: '注文確定',
        email: 'order@example.com',
      });
      
      const response = http.post(`${BASE_URL}/api/users`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        '注文確定: ステータスは201': (r) => r.status === 201,
      });
      sleep(1);
    });
    
    // ステップ4: 決済処理（時間がかかる）
    group('Payment_Processing', () => {
      const response = http.get(`${BASE_URL}/api/delay/500`);
      check(response, {
        '決済処理: ステータスは200': (r) => r.status === 200,
      });
      sleep(1);
    });
  });
  
  sleep(3);
}

/**
 * 実行方法:
 * k6 run scenarios/04-metrics/03-groups.js
 * 
 * グループのメトリクス:
 * - group_duration: グループ全体の所要時間
 * - http_req_duration{group:::GroupName}: グループ内のHTTPリクエスト時間
 * 
 * グループの階層:
 * - トップレベル: 01_Home_Page
 * - ネスト: 02_User_Registration::Step1_Input_Form
 * - 深いネスト: Parent::Child::GrandChild
 * 
 * ベストプラクティス:
 * 
 * 1. 意味のある名前を付ける
 *    - ユーザーの視点で命名
 *    - ビジネスプロセスを反映
 * 
 * 2. 適度な粒度で分割
 *    - 多すぎるグループは分析を複雑にする
 *    - 少なすぎると詳細が分からない
 * 
 * 3. ネストは3階層まで
 *    - それ以上深くすると可読性が下がる
 * 
 * 4. グループごとに閾値を設定
 *    - 重要なステップには厳しい閾値
 *    - ボトルネックを特定しやすくなる
 * 
 * 分析のポイント:
 * - どのグループが最も時間がかかるか
 * - どのステップでユーザーが離脱する可能性があるか
 * - トランザクション全体の所要時間
 * 
 * Grafanaでの可視化:
 * - グループごとの所要時間を棒グラフで表示
 * - ファネル分析として可視化
 * - ボトルネックを一目で特定
 */
