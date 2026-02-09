# k6-sandbox

k6を使用した負荷検証のベストプラクティス集とテンプレート集

## 📋 概要

このリポジトリは、k6負荷検証ツールを使用した実務で即座に活用できるテストシナリオとベストプラクティスを提供します。ローカルのモックAPIサーバーに対して様々な負荷パターンをテストできます。

## 🏗️ プロジェクト構成

```
k6-sandbox/
├── mock-server/          # テスト対象のモックAPIサーバー（Node.js/Express）
├── scenarios/            # k6テストシナリオ集
│   ├── 01-basics/       # 基本的なHTTPリクエスト
│   ├── 02-load-patterns/ # 各種負荷パターン
│   ├── 03-realistic/    # 実践的なシナリオ
│   ├── 04-metrics/      # メトリクス・可観測性
│   └── 05-cicd/         # CI/CD統合
├── utils/               # 共通ユーティリティ関数
├── docs/                # ドキュメント・ベストプラクティス
└── docker-compose.yml   # Docker Compose設定
```

## 🚀 クイックスタート

### 前提条件

- [Docker](https://www.docker.com/) と Docker Compose がインストールされていること
- [k6](https://k6.io/docs/getting-started/installation/) がインストールされていること

### 1. モックサーバーの起動

```bash
# Docker Composeでモックサーバーを起動
docker-compose up -d

# ヘルスチェック
curl http://localhost:3000/health
```

### 2. k6テストの実行

```bash
# シンプルなテストを実行（準備中）
k6 run scenarios/01-basics/01-simple-http.js
```

## 📚 モックAPIエンドポイント

モックサーバーは以下のエンドポイントを提供します：

### 基本的なREST API
- `GET /api/users` - ユーザー一覧取得
- `GET /api/users/:id` - ユーザー詳細取得
- `POST /api/users` - ユーザー作成
- `PUT /api/users/:id` - ユーザー更新
- `DELETE /api/users/:id` - ユーザー削除

### 認証
- `POST /api/auth/login` - ログイン（JWTトークン発行）
- `GET /api/auth/me` - トークン検証

### パフォーマンステスト用
- `GET /api/delay/:ms` - 指定ミリ秒の遅延後にレスポンス
- `GET /api/random-delay` - ランダムな遅延（100ms～2000ms）

### エラーテスト用
- `GET /api/status/:code` - 指定ステータスコードを返す
- `GET /api/random-error` - 20%の確率で500エラー

### その他
- `GET /api/large-payload?size=N` - 大きなJSONレスポンス
- `POST /api/upload` - ファイルアップロードのモック

## 📖 テストシナリオ

### 01-basics: 基本シナリオ
基本的なHTTPリクエスト、レスポンス検証、閾値設定を学びます。

### 02-load-patterns: 負荷パターン
- Smoke Test - 最小負荷でのサニティチェック
- Load Test - 通常負荷での動作確認
- Stress Test - システムの限界を見極める
- Spike Test - 急激な負荷変動への対応
- Soak Test - 長時間の継続負荷
- Breakpoint Test - 段階的な負荷増加

### 03-realistic: 実践的シナリオ
JWT認証、ユーザーフロー、データ相関などの実践的なテストケース。

### 04-metrics: メトリクスと可観測性
カスタムメトリクス、タグ付け、Grafanaダッシュボード連携。

### 05-cicd: CI/CD統合
閾値による自動判定、レポート生成、GitHub Actions統合。

## 🛠️ 開発

### モックサーバーのローカル実行

```bash
cd mock-server
npm install
npm start
```

### モックサーバーの停止

```bash
docker-compose down
```

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

Issue、Pull Requestを歓迎します！