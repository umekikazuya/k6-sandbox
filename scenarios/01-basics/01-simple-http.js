import http from 'k6/http';
import { sleep } from 'k6';

/**
 * 01. 最もシンプルなHTTPリクエスト
 * 
 * このスクリプトは、k6の最も基本的な使い方を示します。
 * - 1つのVirtual User（仮想ユーザー）で
 * - 10回のイテレーションを実行
 * - 各イテレーションで1秒待機
 */

export const options = {
  vus: 1,        // Virtual Users（仮想ユーザー数）
  iterations: 10, // 実行回数
};

export default function () {
  // GETリクエストを送信
  const response = http.get('http://localhost:3000/health');

  // レスポンスの基本情報をコンソールに出力
  console.log(`Status: ${response.status}, Body: ${response.body}`);

  // 次のイテレーションまで1秒待機
  sleep(1);
}
