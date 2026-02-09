/**
 * テストデータ生成ユーティリティ
 */

/**
 * ランダムなユーザーデータを生成
 * 
 * @returns {Object} - { name, email }
 */
export function generateUser() {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);

  return {
    name: `User_${timestamp}_${randomId}`,
    email: `user_${timestamp}_${randomId}@example.com`,
  };
}

/**
 * ランダムな文字列を生成
 * 
 * @param {number} length - 文字列の長さ
 * @returns {string} - ランダムな文字列
 */
export function generateRandomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * ランダムなメールアドレスを生成
 * 
 * @param {string} prefix - メールアドレスのプレフィックス
 * @returns {string} - メールアドレス
 */
export function generateEmail(prefix = 'test') {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${randomId}@example.com`;
}

/**
 * ランダムな整数を生成
 * 
 * @param {number} min - 最小値（含む）
 * @param {number} max - 最大値（含む）
 * @returns {number} - ランダムな整数
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 配列からランダムに要素を選択
 * 
 * @param {Array} array - 配列
 * @returns {*} - ランダムに選択された要素
 */
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * ダミーのJSONペイロードを生成
 * 
 * @param {number} sizeInKB - 生成するデータのサイズ（KB）
 * @returns {Object} - ダミーデータ
 */
export function generateDummyPayload(sizeInKB = 1) {
  const targetSize = sizeInKB * 1024;
  const dummyString = generateRandomString(100);
  const items = [];

  let currentSize = 0;
  while (currentSize < targetSize) {
    items.push({
      id: items.length + 1,
      data: dummyString,
      timestamp: new Date().toISOString(),
    });
    currentSize = JSON.stringify(items).length;
  }

  return { items };
}
