const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'k6-test-secret-key';

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== 基本的なRESTエンドポイント =====

// ユーザー一覧取得
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: '田中太郎', email: 'tanaka@example.com' },
    { id: 2, name: '佐藤花子', email: 'sato@example.com' },
    { id: 3, name: '鈴木一郎', email: 'suzuki@example.com' }
  ];
  res.json({ success: true, data: users });
});

// ユーザー詳細取得
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = {
    id: userId,
    name: `ユーザー${userId}`,
    email: `user${userId}@example.com`,
    createdAt: new Date().toISOString()
  };
  res.json({ success: true, data: user });
});

// ユーザー作成
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'name と email は必須です'
    });
  }

  const newUser = {
    id: Math.floor(Math.random() * 10000),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, data: newUser });
});

// ユーザー更新
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;

  const updatedUser = {
    id: userId,
    name: name || `ユーザー${userId}`,
    email: email || `user${userId}@example.com`,
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, data: updatedUser });
});

// ユーザー削除
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json({
    success: true,
    message: `ユーザーID ${userId} を削除しました`
  });
});

// ===== 認証エンドポイント =====

// ログイン（JWTトークン発行）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'username と password は必須です'
    });
  }

  // 簡易認証（実際の認証は行わない）
  if (password === 'wrong') {
    return res.status(401).json({
      success: false,
      error: '認証に失敗しました'
    });
  }

  const token = jwt.sign(
    { userId: Math.floor(Math.random() * 1000), username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    success: true,
    data: {
      token,
      expiresIn: 3600
    }
  });
});

// トークン検証エンドポイント（認証が必要）
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '認証トークンが必要です'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      data: {
        userId: decoded.userId,
        username: decoded.username
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'トークンが無効です'
    });
  }
});

// ===== レスポンスタイム可変エンドポイント =====

// 指定された遅延時間後にレスポンスを返す
app.get('/api/delay/:ms', async (req, res) => {
  const delayMs = parseInt(req.params.ms) || 0;
  const maxDelay = 10000; // 最大10秒

  const actualDelay = Math.min(delayMs, maxDelay);

  await new Promise(resolve => setTimeout(resolve, actualDelay));

  res.json({
    success: true,
    data: {
      requestedDelay: delayMs,
      actualDelay,
      timestamp: new Date().toISOString()
    }
  });
});

// ランダムなレスポンスタイム（100ms～2000ms）
app.get('/api/random-delay', async (req, res) => {
  const delay = Math.floor(Math.random() * 1900) + 100;

  await new Promise(resolve => setTimeout(resolve, delay));

  res.json({
    success: true,
    data: {
      delay,
      timestamp: new Date().toISOString()
    }
  });
});

// ===== エラー生成エンドポイント =====

// 指定されたステータスコードを返す
app.get('/api/status/:code', (req, res) => {
  const statusCode = parseInt(req.params.code) || 200;

  const messages = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };

  res.status(statusCode).json({
    success: statusCode < 400,
    statusCode,
    message: messages[statusCode] || 'Unknown Status'
  });
});

// ランダムエラー（20%の確率で500エラー）
app.get('/api/random-error', (req, res) => {
  if (Math.random() < 0.2) {
    return res.status(500).json({
      success: false,
      error: 'ランダムに発生したサーバーエラー'
    });
  }

  res.json({
    success: true,
    data: { message: '正常にレスポンスを返しました' }
  });
});

// ===== その他のエンドポイント =====

// 大きなJSONレスポンス（ペイロードサイズテスト用）
app.get('/api/large-payload', (req, res) => {
  const size = parseInt(req.query.size) || 100;
  const items = Array.from({ length: size }, (_, i) => ({
    id: i + 1,
    name: `アイテム${i + 1}`,
    description: 'これは大きなペイロードをテストするためのダミーデータです。'.repeat(5),
    timestamp: new Date().toISOString()
  }));

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// ファイルアップロードのモック
app.post('/api/upload', (req, res) => {
  res.json({
    success: true,
    data: {
      filename: 'uploaded-file.txt',
      size: Math.floor(Math.random() * 1000000),
      uploadedAt: new Date().toISOString()
    }
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません'
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'サーバーエラーが発生しました'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 モックAPIサーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/health`);
});
