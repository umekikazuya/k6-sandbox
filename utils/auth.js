import http from 'k6/http';

/**
 * 認証ヘルパー関数
 * 
 * JWT認証を使用するテストで共通して使用する関数群
 */

/**
 * ログインしてJWTトークンを取得
 * 
 * @param {string} baseUrl - APIのベースURL
 * @param {string} username - ユーザー名
 * @param {string} password - パスワード
 * @returns {string|null} - 取得したトークン、失敗時はnull
 */
export function login(baseUrl, username, password) {
  const payload = JSON.stringify({ username, password });

  const response = http.post(
    `${baseUrl}/api/auth/login`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.data?.token || null;
    } catch (e) {
      console.error('Failed to parse login response:', e);
      return null;
    }
  }

  console.error(`Login failed: status=${response.status}`);
  return null;
}

/**
 * 認証ヘッダーを生成
 * 
 * @param {string} token - JWTトークン
 * @returns {Object} - Authorizationヘッダーを含むオブジェクト
 */
export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 認証付きGETリクエスト
 * 
 * @param {string} url - リクエストURL
 * @param {string} token - JWTトークン
 * @param {Object} params - 追加パラメータ
 * @returns {Object} - HTTPレスポンス
 */
export function authenticatedGet(url, token, params = {}) {
  return http.get(url, {
    headers: getAuthHeaders(token),
    ...params,
  });
}

/**
 * 認証付きPOSTリクエスト
 * 
 * @param {string} url - リクエストURL
 * @param {Object} data - リクエストボディ
 * @param {string} token - JWTトークン
 * @param {Object} params - 追加パラメータ
 * @returns {Object} - HTTPレスポンス
 */
export function authenticatedPost(url, data, token, params = {}) {
  return http.post(
    url,
    JSON.stringify(data),
    {
      headers: getAuthHeaders(token),
      ...params,
    }
  );
}
